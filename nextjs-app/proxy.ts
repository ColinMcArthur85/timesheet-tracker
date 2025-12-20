import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Proxy: replacement for deprecated middleware in Next.js 16+
// Mirrors the existing middleware.ts behavior while enabling a future cutover.
// - Public routes: passthrough
// - Protected routes: require mode cookie
// - Demo mode: inject x-demo-mode header
// - Personal mode: Basic Auth
// - Dev-only: ?debugClock=in|out forwarded via x-debug-clock

const DEMO_MODE_COOKIE = "timesheet_mode";
const PROTECTED_ROUTES = ["/", "/api/status", "/api/pay-period", "/api/punches"];
const PUBLIC_ROUTES = ["/api/slack/events", "/select-mode"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);

  // Dev-only clock override via query param (?debugClock=in|out)
  if (process.env.NODE_ENV !== "production") {
    const debugClock = request.nextUrl.searchParams.get("debugClock");
    if (debugClock === "in" || debugClock === "out") {
      requestHeaders.set("x-debug-clock", debugClock);
    }
  }

  // Always allow public routes (Slack webhook, mode selector)
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Restrict /api/debug to non-production
  if (pathname.startsWith("/api/debug")) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Not Found", { status: 404 });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Check if route needs authentication/mode selection
  const needsAuth = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  if (!needsAuth) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Get mode from cookie
  const mode = request.cookies.get(DEMO_MODE_COOKIE)?.value;

  // If no mode set, redirect to mode selector
  if (!mode) {
    return NextResponse.redirect(new URL("/select-mode", request.url));
  }

  // Demo mode: inject header for downstream routes
  if (mode === "demo") {
    requestHeaders.set("x-demo-mode", "true");
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("x-demo-mode", "true");
    return response;
  }

  // Personal mode: require HTTP Basic Auth
  if (mode === "personal") {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Basic ")) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Timesheet Tracker - Personal Access"',
        },
      });
    }

    try {
      const base64Credentials = authHeader.split(" ")[1];
      const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
      const [username, password] = credentials.split(":");

      const validUser = process.env.AUTH_USERNAME || "admin";
      const validPass = process.env.AUTH_PASSWORD;

      if (!validPass) {
        console.error("⚠️ AUTH_PASSWORD not set in environment variables");
        return new NextResponse("Server configuration error", { status: 500 });
      }

      if (username !== validUser || password !== validPass) {
        return new NextResponse("Invalid credentials", {
          status: 401,
          headers: {
            "WWW-Authenticate": 'Basic realm="Timesheet Tracker - Personal Access"',
          },
        });
      }

      // Auth successful, continue with personal mode
      return NextResponse.next({ request: { headers: requestHeaders } });
    } catch (error) {
      console.error("Auth error:", error);
      return new NextResponse("Authentication error", { status: 401 });
    }
  }

  // Unknown mode, redirect to selector
  return NextResponse.redirect(new URL("/select-mode", request.url));
}

// Proxy matcher: mirror middleware config; exclude static/image assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
