import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function setModeAction(formData: FormData) {
  "use server";

  const mode = formData.get("mode") as string;

  if (mode === "demo" || mode === "personal") {
    const cookieStore = await cookies();
    cookieStore.set("timesheet_mode", mode, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    redirect("/");
  }
}

export default function SelectModePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-2xl">
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Timesheet Tracker</h1>
          <p className="text-gray-600 text-center">Select your access mode</p>
        </div>

        <div className="space-y-4">
          <form action={setModeAction}>
            <input type="hidden" name="mode" value="demo" />
            <button type="submit" className="block w-full py-4 px-6 border-2 border-blue-600 rounded-lg text-center hover:bg-blue-50 transition-all duration-200 transform hover:scale-105">
              <div className="font-semibold text-blue-600 text-lg">Demo Mode</div>
              <div className="text-sm text-gray-600 mt-1">View sample timesheet data</div>
              <div className="text-xs text-gray-500 mt-2">Perfect for exploring features</div>
            </button>
          </form>

          <form action={setModeAction}>
            <input type="hidden" name="mode" value="personal" />
            <button type="submit" className="block w-full py-4 px-6 bg-blue-600 text-white rounded-lg text-center hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg">
              <div className="font-semibold text-lg">Personal Access</div>
              <div className="text-sm text-blue-100 mt-1">Login with your credentials</div>
              <div className="text-xs text-blue-200 mt-2">Access your real timesheet data</div>
            </button>
          </form>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">💡 Demo mode shows synthetic data only. Personal access requires authentication and connects to your real Slack-integrated timesheet.</p>
        </div>
      </div>
    </div>
  );
}
