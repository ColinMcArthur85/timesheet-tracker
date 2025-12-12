import { PunchEvent } from "./types";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfMonth, endOfMonth, eachDayOfInterval, addMonths } from "date-fns";

const TIMEZONE = "America/Vancouver";

/**
 * Generate realistic demo punch data covering multiple months
 * Ensures any selected pay period will have data
 * Follows business rules: Tue-Sat work days, ~8-hour shifts with natural variation
 */
export function generateDemoPunchEvents(): PunchEvent[] {
  const demoEvents: PunchEvent[] = [];
  let eventId = 1000;

  // Generate data for the past 3 months + current month + next month (5 months total)
  const now = new Date();
  const startDate = startOfMonth(addMonths(now, -3));
  const endDate = endOfMonth(addMonths(now, 1));

  // Get all days in the range
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  for (const date of allDays) {
    const dayOfWeek = date.getDay();

    // Skip Sundays (0) and Mondays (1) - only Tue-Sat work days
    if (dayOfWeek === 0 || dayOfWeek === 1) continue;

    // Randomly skip some days to create realistic variation (~15% absence rate)
    if (Math.random() < 0.15) continue;

    // Convert to Vancouver timezone for consistent time setting
    const vancouverDate = toZonedTime(date, TIMEZONE);

    // Morning punch IN with natural variation
    // Base: 9:00 AM ± 30 minutes
    const morningHour = 9;
    const morningMinute = Math.floor(Math.random() * 60) - 30; // -30 to +30 minutes
    const adjustedMinute = Math.max(0, Math.min(59, morningMinute));
    const adjustedHour = morningHour + Math.floor(morningMinute / 60);

    vancouverDate.setHours(adjustedHour, adjustedMinute, 0, 0);
    const morningInUTC = fromZonedTime(vancouverDate, TIMEZONE);

    demoEvents.push({
      id: eventId++,
      user_id: "demo_user",
      event_type: "IN",
      timestamp: morningInUTC,
      slack_event_id: `demo-${date.toISOString().split("T")[0]}-in`,
      raw_message: "In",
      created_at: morningInUTC,
    });

    // Randomly decide if this is a half day (~10% chance)
    const isHalfDay = Math.random() < 0.1;

    if (isHalfDay) {
      // Half day: OUT around 1:00 PM (4 hours)
      const halfDayDate = toZonedTime(date, TIMEZONE);
      const halfDayHour = 13;
      const halfDayMinute = Math.floor(Math.random() * 40) - 20; // ±20 minutes
      const adjustedHalfMinute = Math.max(0, Math.min(59, halfDayMinute));
      const adjustedHalfHour = halfDayHour + Math.floor(halfDayMinute / 60);

      halfDayDate.setHours(adjustedHalfHour, adjustedHalfMinute, 0, 0);
      const halfDayOutUTC = fromZonedTime(halfDayDate, TIMEZONE);

      demoEvents.push({
        id: eventId++,
        user_id: "demo_user",
        event_type: "OUT",
        timestamp: halfDayOutUTC,
        slack_event_id: `demo-${date.toISOString().split("T")[0]}-out`,
        raw_message: "Out",
        created_at: halfDayOutUTC,
      });
    } else {
      // Full day: Calculate OUT time based on IN time + 8-9 hours
      const workDuration = 8 + Math.random() * 1.5; // 8.0 to 9.5 hours
      const outDate = toZonedTime(date, TIMEZONE);
      const outHour = adjustedHour + Math.floor(workDuration);
      const outMinute = adjustedMinute + Math.floor((workDuration % 1) * 60);
      const finalOutHour = outHour + Math.floor(outMinute / 60);
      const finalOutMinute = outMinute % 60;

      outDate.setHours(finalOutHour, finalOutMinute, 0, 0);
      const afternoonOutUTC = fromZonedTime(outDate, TIMEZONE);

      demoEvents.push({
        id: eventId++,
        user_id: "demo_user",
        event_type: "OUT",
        timestamp: afternoonOutUTC,
        slack_event_id: `demo-${date.toISOString().split("T")[0]}-out`,
        raw_message: "Out",
        created_at: afternoonOutUTC,
      });
    }
  }

  // Add today's open session if it's a work day and not a future date
  const today = new Date();
  const todayDayOfWeek = today.getDay();

  if (todayDayOfWeek >= 2 && todayDayOfWeek <= 6) {
    const todayVancouver = toZonedTime(today, TIMEZONE);
    todayVancouver.setHours(9, 5, 0, 0);
    const todayInUTC = fromZonedTime(todayVancouver, TIMEZONE);

    demoEvents.push({
      id: eventId++,
      user_id: "demo_user",
      event_type: "IN",
      timestamp: todayInUTC,
      slack_event_id: `demo-today-in`,
      raw_message: "In",
      created_at: todayInUTC,
    });
  }

  // Sort by timestamp to ensure chronological order
  demoEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return demoEvents;
}

/**
 * Generate a single demo punch event (for last punch status)
 */
export function generateDemoLastPunch(): PunchEvent {
  const now = new Date();
  const todayDayOfWeek = now.getDay();
  const vancouverNow = toZonedTime(now, TIMEZONE);

  // If today is a work day, return an IN punch from this morning
  if (todayDayOfWeek >= 2 && todayDayOfWeek <= 6) {
    const morningIn = new Date(vancouverNow);
    morningIn.setHours(9, 5, 0, 0);
    const morningInUTC = fromZonedTime(morningIn, TIMEZONE);

    return {
      id: 9999,
      user_id: "demo_user",
      event_type: "IN",
      timestamp: morningInUTC,
      slack_event_id: "demo-last-punch",
      raw_message: "In",
      created_at: morningInUTC,
    };
  }

  // Otherwise, return the last OUT from the most recent work day
  const daysToLastWorkDay = todayDayOfWeek === 0 ? 2 : 1; // Sunday->Friday, Monday->Friday
  const lastWorkDay = new Date(vancouverNow);
  lastWorkDay.setDate(lastWorkDay.getDate() - daysToLastWorkDay);
  lastWorkDay.setHours(17, 35, 0, 0);
  const lastWorkDayUTC = fromZonedTime(lastWorkDay, TIMEZONE);

  return {
    id: 9999,
    user_id: "demo_user",
    event_type: "OUT",
    timestamp: lastWorkDayUTC,
    slack_event_id: "demo-last-punch",
    raw_message: "Out",
    created_at: lastWorkDayUTC,
  };
}
