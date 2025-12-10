import { getPunchEventsByDateRange, getLastPunchEvent } from "@/lib/db";
import { processPunches } from "@/lib/punch-processor";
import { calculatePayPeriodStats, organizeSessionsByDay } from "@/lib/pay-period";
import { getStartOfDay, getEndOfDay, formatFullDate, formatTime, formatDuration, formatDate } from "@/lib/time-utils";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { getPayPeriodForDate } from "@/lib/pay-period-utils";
import AutoRefresh from "./components/AutoRefresh";
import SessionList from "./components/SessionList";
import PayPeriodSection from "./components/PayPeriodSection";
import EndDayButton from "./components/EndDayButton";
import ModeBanner from "./components/ModeBanner";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  // Check if we're in demo mode
  const headersList = await headers();
  const isDemo = headersList.get("x-demo-mode") === "true";
  const TIMEZONE = "America/Vancouver";
  const now = new Date();
  const zonedNow = toZonedTime(now, TIMEZONE);

  // Calculate today's start/end in Vancouver time, then convert to UTC timestamps
  const startOfDayZoned = new Date(zonedNow);
  startOfDayZoned.setHours(0, 0, 0, 0);
  const todayStart = fromZonedTime(startOfDayZoned, TIMEZONE);

  const endOfDayZoned = new Date(zonedNow);
  endOfDayZoned.setHours(23, 59, 59, 999);
  const todayEnd = fromZonedTime(endOfDayZoned, TIMEZONE);

  // Use the zoned date for "today" reference (e.g. for getPayPeriodForDate)
  // We need to pass a date that getPayPeriodForDate will interpret correctly.
  // Our updated getPayPeriodForDate takes a Date and converts it toZonedTime.
  // So we can pass 'now' (UTC) and it will work.

  // Get today's punches
  const todayPunches = await getPunchEventsByDateRange(todayStart, todayEnd);
  const todaySessions = processPunches(todayPunches as any);
  const todayTotalMinutes = todaySessions.reduce((sum, s) => sum + s.duration_minutes, 0);

  // Check current status
  let isClockedIn = false;
  let lastPunch = null;
  if (todayPunches.length > 0) {
    const lastEvent = todayPunches[todayPunches.length - 1];
    if (lastEvent.event_type === "IN") {
      isClockedIn = true;
    }
    lastPunch = formatTime(new Date(lastEvent.timestamp));
  }

  // Get pay period stats (Current pay period: 1st-14th or 15th-end of month)
  const currentPayPeriod = getPayPeriodForDate(now);
  const ppStart = currentPayPeriod.start;
  const ppEnd = currentPayPeriod.end;

  // ppStart and ppEnd are already correct UTC timestamps for the start/end of the period in Vancouver time
  // So we don't need getStartOfDay/getEndOfDay on them again (which would shift them if they were local)
  const ppStartDay = ppStart;
  const ppEndDay = ppEnd;

  const ppPunches = await getPunchEventsByDateRange(ppStartDay, ppEndDay);
  const ppSessions = processPunches(ppPunches as any);
  const stats = calculatePayPeriodStats(ppStart, ppEnd, ppSessions);
  const payPeriodDays = organizeSessionsByDay(ppStart, ppEnd, ppSessions);

  const periodStats = {
    total_hours: stats.total_minutes / 60,
    potential_hours: stats.potential_minutes / 60,
    difference: stats.difference_minutes / 60,
  };

  // Get latest punch ID for polling
  const latestEvent = await getLastPunchEvent();
  const lastPunchId = latestEvent?.id || 0;

  return (
    <div className="min-h-screen bg-muted">
      <ModeBanner isDemo={isDemo} />
      <AutoRefresh initialLastPunchId={lastPunchId} />

      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Timesheet Tracker</h1>
            <p className="text-gray-600">{formatFullDate(todayStart)}</p>
          </header>

          {/* Current Status */}
          <div className="bg-card rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">Current Status</h2>
            <div className="text-center">
              <span className={`inline-block px-4 py-1 rounded-full text-sm font-medium ${isClockedIn ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{isClockedIn ? "Clocked In" : "Clocked Out"}</span>
              {lastPunch && <p className="mt-2 text-gray-600">Last punch: {lastPunch}</p>}
            </div>
          </div>

          {/* Today's Activity */}
          <div className="bg-card rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">Today&apos;s Activity</h2>
            <SessionList sessions={todaySessions} totalMinutes={todayTotalMinutes} />
            <EndDayButton isClockedIn={isClockedIn} totalHours={todayTotalMinutes / 60} />
          </div>

          {/* Pay Period Stats and Summary */}
          <PayPeriodSection initialPeriod={currentPayPeriod} initialStats={periodStats} initialDays={payPeriodDays} />
        </div>
      </div>
    </div>
  );
}
