import { ProcessedSession, DayData, PayPeriodStats } from "./types";
import { startOfDay, endOfDay, addDays, differenceInDays, getDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const TIMEZONE = "America/Vancouver";

export function calculatePayPeriodStats(startDate: Date, endDate: Date, sessions: ProcessedSession[]): PayPeriodStats {
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  // Calculate potential hours
  // Count number of working days (Mon–Fri) in range
  let potentialMinutes = 0;
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    // Convert to zoned time to check the day of week in Vancouver
    const zonedCurrent = toZonedTime(current, TIMEZONE);
    const dayOfWeek = getDay(zonedCurrent);
    // Mon=1 ... Fri=5
    if ([1, 2, 3, 4, 5].includes(dayOfWeek)) {
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

export function organizeSessionsByDay(startDate: Date, endDate: Date, sessions: ProcessedSession[]): DayData[] {
  // Create a map of date -> list of sessions
  const sessionsMap = new Map<string, ProcessedSession[]>();

  for (const s of sessions) {
    // Convert session date to Vancouver time to find which day it belongs to
    const zonedDate = toZonedTime(new Date(s.date), TIMEZONE);
    const zonedStartOfDay = startOfDay(zonedDate);
    // Convert back to UTC to use as key (matches the 'current' iterator which is also UTC-aligned to PST start)
    const dateKey = fromZonedTime(zonedStartOfDay, TIMEZONE).toISOString();

    if (!sessionsMap.has(dateKey)) {
      sessionsMap.set(dateKey, []);
    }
    sessionsMap.get(dateKey)!.push(s);
  }

  const daysData: DayData[] = [];
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    // current is already aligned to start of day in PST (but as UTC timestamp)
    // e.g. 08:00 UTC.
    const dateKey = current.toISOString();
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

    const totalMinutes = daySessions.reduce((sum, s) => sum + s.duration_minutes, 0);

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
