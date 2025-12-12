import { getPunchEventsByDateRange, getLastPunchEvent } from "@/lib/db";
import { processPunches } from "@/lib/punch-processor";
import { calculatePayPeriodStats, organizeSessionsByDay } from "@/lib/pay-period";
import { getStartOfDay, getEndOfDay, formatFullDate, formatTime, formatDuration, formatDate } from "@/lib/time-utils";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { getPayPeriodForDate } from "@/lib/pay-period-utils";
import AutoRefresh from "./components/AutoRefresh";
import SessionList from "./components/SessionList";
import PayPeriodSection from "./components/PayPeriodSection";
// Removed EndDayButton per request
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
    <div className="min-h-screen bg-black text-white">
      <ModeBanner isDemo={isDemo} />
      <AutoRefresh initialLastPunchId={lastPunchId} />

      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="mb-2 text-white">Timesheet Tracker</h1>
            <p className="text-white/70">{formatFullDate(todayStart)}</p>
          </header>

          {/* Dashboard layout on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Current Status */}
            <section className="md:col-span-5 p-6 rounded-3xl border border-white/20 bg-white/5 backdrop-blur-xl shadow-2xl">
              <h2 className="border-b border-white/20 pb-3 mb-4 text-white">Current Status</h2>
              <div className="text-center">
                <span className={`inline-block px-4 py-1 rounded-full text-sm font-medium ${isClockedIn ? "bg-green-500/20 text-green-300" : "bg-white/20 text-white"}`}>{isClockedIn ? "Clocked In" : "Clocked Out"}</span>
                {lastPunch && <p className="mt-2 text-white/70">Last punch: {lastPunch}</p>}
              </div>
            </section>

            {/* Today\'s Activity */}
            <section className="md:col-span-7 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg shadow-xl">
              <h2 className="border-b border-white/10 pb-3 mb-4 text-white">Today&apos;s Activity</h2>
              <SessionList sessions={todaySessions} totalMinutes={todayTotalMinutes} />
            </section>
          </div>

          {/* Pay Period Stats and Summary */}
          <PayPeriodSection initialPeriod={currentPayPeriod} initialStats={periodStats} initialDays={payPeriodDays} />
        </div>
      </div>
    </div>
  );
}
