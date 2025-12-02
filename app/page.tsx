import { getPunchEventsByDateRange, getLastPunchEvent } from '@/lib/db';
import { processPunches } from '@/lib/punch-processor';
import { calculatePayPeriodStats, organizeSessionsByDay } from '@/lib/pay-period';
import { getStartOfDay, getEndOfDay, formatFullDate, formatTime, formatDuration, formatDate } from '@/lib/time-utils';
import { startOfMonth } from 'date-fns';
import AutoRefresh from './components/AutoRefresh';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const today = new Date();
  const todayStart = getStartOfDay(today);
  const todayEnd = getEndOfDay(today);

  // Get today's punches
  const todayPunches = await getPunchEventsByDateRange(todayStart, todayEnd);
  const todaySessions = processPunches(todayPunches as any);
  const todayTotalMinutes = todaySessions.reduce((sum, s) => sum + s.duration_minutes, 0);

  // Check current status
  let isClockedIn = false;
  let lastPunch = null;
  if (todayPunches.length > 0) {
    const lastEvent = todayPunches[todayPunches.length - 1];
    if (lastEvent.event_type === 'IN') {
      isClockedIn = true;
    }
    lastPunch = formatTime(new Date(lastEvent.timestamp));
  }

  // Get pay period stats (Current Month)
  const ppStart = startOfMonth(today);
  const ppEnd = today;
  const ppStartDay = getStartOfDay(ppStart);
  const ppEndDay = getEndOfDay(ppEnd);

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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <AutoRefresh initialLastPunchId={lastPunchId} />
      
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Timesheet Tracker</h1>
          <p className="text-gray-600">{formatFullDate(today)}</p>
        </header>

        {/* Current Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
            Current Status
          </h2>
          <div className="text-center">
            <span
              className={`inline-block px-4 py-1 rounded-full text-sm font-medium ${
                isClockedIn
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {isClockedIn ? 'Clocked In' : 'Clocked Out'}
            </span>
            {lastPunch && (
              <p className="mt-2 text-gray-600">Last punch: {lastPunch}</p>
            )}
          </div>
        </div>

        {/* Today's Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
            Today&apos;s Activity
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                  <th className="pb-3 font-semibold">In</th>
                  <th className="pb-3 font-semibold">Out</th>
                  <th className="pb-3 font-semibold">Duration</th>
                  <th className="pb-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {todaySessions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500">
                      No activity today
                    </td>
                  </tr>
                ) : (
                  todaySessions.map((session, idx) => (
                    <tr key={idx} className="border-b border-gray-100 last:border-0">
                      <td className="py-3">{formatTime(session.punch_in)}</td>
                      <td className="py-3">{formatTime(session.punch_out)}</td>
                      <td className="py-3">{session.duration_minutes}m</td>
                      <td className="py-3 text-gray-500">{session.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-right font-semibold">
            Total Today: {(todayTotalMinutes / 60).toFixed(2)} hrs
          </div>
        </div>

        {/* Pay Period Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
            Pay Period Summary
          </h2>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {periodStats.total_hours.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Hours</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {periodStats.potential_hours.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Potential Hours</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div
                className={`text-3xl font-bold ${
                  periodStats.difference >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {periodStats.difference.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Difference</div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b border-gray-200">
                  <th className="pb-3 font-semibold">Day</th>
                  <th className="pb-3 font-semibold text-center">Morning In</th>
                  <th className="pb-3 font-semibold text-center">
                    Morning Out<br />
                    <span className="text-xs font-normal">(lunch start)</span>
                  </th>
                  <th className="pb-3 font-semibold text-center">Afternoon In</th>
                  <th className="pb-3 font-semibold text-center">Punch Out</th>
                  <th className="pb-3 font-semibold text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {payPeriodDays.map((day, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="py-3 font-medium">{formatDate(day.date)}</td>
                    <td className="py-3 text-center">
                      {day.morning?.punch_in ? formatTime(day.morning.punch_in) : ''}
                    </td>
                    <td className="py-3 text-center">
                      {day.morning?.punch_out ? formatTime(day.morning.punch_out) : ''}
                    </td>
                    <td className="py-3 text-center">
                      {day.afternoon?.punch_in ? formatTime(day.afternoon.punch_in) : ''}
                    </td>
                    <td className="py-3 text-center">
                      {day.afternoon?.punch_out ? formatTime(day.afternoon.punch_out) : ''}
                    </td>
                    <td className="py-3 text-center font-medium">
                      {day.total_minutes > 0 ? formatDuration(day.total_minutes) : '0:00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
