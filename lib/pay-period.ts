import { ProcessedSession, DayData, PayPeriodStats } from './types';
import { startOfDay, endOfDay, addDays, differenceInDays, getDay } from 'date-fns';

export function calculatePayPeriodStats(
  startDate: Date,
  endDate: Date,
  sessions: ProcessedSession[]
): PayPeriodStats {
  const totalMinutes = sessions.reduce(
    (sum, s) => sum + (s.duration_minutes || 0),
    0
  );

  // Calculate potential hours
  // Count number of working days (Tue-Sat) in range
  let potentialMinutes = 0;
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dayOfWeek = getDay(current);
    // Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
    if ([2, 3, 4, 5, 6].includes(dayOfWeek)) {
      potentialMinutes += 8 * 60; // Assuming 8 hour shifts
    }
    current = addDays(current, 1);
  }

  return {
    start_date: startDate,
    end_date: endDate,
    total_minutes: totalMinutes,
    potential_minutes: potentialMinutes,
    difference_minutes: totalMinutes - potentialMinutes,
  };
}

export function organizeSessionsByDay(
  startDate: Date,
  endDate: Date,
  sessions: ProcessedSession[]
): DayData[] {
  // Create a map of date -> list of sessions
  const sessionsMap = new Map<string, ProcessedSession[]>();

  for (const s of sessions) {
    const dateKey = startOfDay(new Date(s.date)).toISOString();
    if (!sessionsMap.has(dateKey)) {
      sessionsMap.set(dateKey, []);
    }
    sessionsMap.get(dateKey)!.push(s);
  }

  const daysData: DayData[] = [];
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateKey = startOfDay(current).toISOString();
    const daySessions = sessionsMap.get(dateKey) || [];

    // Sort by punch_in time
    daySessions.sort((a, b) => {
      if (!a.punch_in) return 1;
      if (!b.punch_in) return -1;
      return new Date(a.punch_in).getTime() - new Date(b.punch_in).getTime();
    });

    // Map index 0 to Morning, index 1 to Afternoon
    const morning = daySessions[0] || null;
    const afternoon = daySessions[1] || null;

    const totalMinutes = daySessions.reduce(
      (sum, s) => sum + s.duration_minutes,
      0
    );

    daysData.push({
      date: new Date(current),
      morning,
      afternoon,
      total_minutes: totalMinutes,
      sessions: daySessions,
    });

    current = addDays(current, 1);
  }

  return daysData;
}
