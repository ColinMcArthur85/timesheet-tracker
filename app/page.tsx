import { getPunchEventsByDateRange, getLastPunchEvent } from '@/lib/db';
import { processPunches } from '@/lib/punch-processor';
import { calculatePayPeriodStats, organizeSessionsByDay } from '@/lib/pay-period';
import { getStartOfDay, getEndOfDay, formatFullDate, formatTime, formatDuration, formatDate } from '@/lib/time-utils';
import { startOfMonth } from 'date-fns';
import AutoRefresh from './components/AutoRefresh';
import SessionList from './components/SessionList';
import PayPeriodList from './components/PayPeriodList';

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
        {/* Today's Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
            Today&apos;s Activity
          </h2>
          <SessionList sessions={todaySessions} totalMinutes={todayTotalMinutes} />
        </div>

        {/* Pay Period Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
            Pay Period Stats
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>

        {/* Pay Period History */}
        <PayPeriodList days={payPeriodDays} />
      </div>
    </div>
  );
}
