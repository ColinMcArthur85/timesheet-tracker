import { PunchEvent } from "./types";

/**
 * Generate realistic demo punch data for the last 14 days
 * Follows the same pattern as real data: Tue-Sat work days, 8-hour shifts
 */
export function generateDemoPunchEvents(): PunchEvent[] {
  const demoEvents: PunchEvent[] = [];
  const today = new Date();
  let eventId = 1000; // Start with high IDs to avoid collision with real data

  // Generate data for the last 14 days (covers at least one pay period)
  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);

    const dayOfWeek = date.getDay();
    // Skip Sundays (0) and Mondays (1) - only Tue-Sat work days
    if (dayOfWeek === 0 || dayOfWeek === 1) continue;

    // Morning punch IN (9:00 AM ± random variation)
    const morningIn = new Date(date);
    const morningVariation = Math.floor(Math.random() * 20) - 10; // ±10 minutes
    morningIn.setHours(9, morningVariation, 0, 0);

    demoEvents.push({
      id: eventId++,
      user_id: "demo_user",
      event_type: "IN",
      timestamp: morningIn,
      slack_event_id: `demo-${daysAgo}-morning-in`,
      raw_message: "In",
      created_at: morningIn,
    });

    // Afternoon punch OUT (5:30 PM ± random variation)
    const afternoonOut = new Date(date);
    const afternoonVariation = Math.floor(Math.random() * 40) - 20; // ±20 minutes
    afternoonOut.setHours(17, 30 + afternoonVariation, 0, 0);

    demoEvents.push({
      id: eventId++,
      user_id: "demo_user",
      event_type: "OUT",
      timestamp: afternoonOut,
      slack_event_id: `demo-${daysAgo}-afternoon-out`,
      raw_message: "Out",
      created_at: afternoonOut,
    });
  }

  // Add today's open session if it's a work day
  const todayDayOfWeek = today.getDay();
  if (todayDayOfWeek >= 2 && todayDayOfWeek <= 6) {
    const todayIn = new Date(today);
    todayIn.setHours(9, 5, 0, 0);

    demoEvents.push({
      id: eventId++,
      user_id: "demo_user",
      event_type: "IN",
      timestamp: todayIn,
      slack_event_id: `demo-today-in`,
      raw_message: "In",
      created_at: todayIn,
    });
  }

  return demoEvents;
}

/**
 * Generate a single demo punch event (for last punch status)
 */
export function generateDemoLastPunch(): PunchEvent {
  const now = new Date();
  const todayDayOfWeek = now.getDay();

  // If today is a work day, return an IN punch from this morning
  if (todayDayOfWeek >= 2 && todayDayOfWeek <= 6) {
    const morningIn = new Date(now);
    morningIn.setHours(9, 5, 0, 0);

    return {
      id: 9999,
      user_id: "demo_user",
      event_type: "IN",
      timestamp: morningIn,
      slack_event_id: "demo-last-punch",
      raw_message: "In",
      created_at: morningIn,
    };
  }

  // Otherwise, return the last OUT from Friday
  const lastFriday = new Date(now);
  const daysToFriday = (todayDayOfWeek + 2) % 7; // Days since last Friday
  lastFriday.setDate(lastFriday.getDate() - daysToFriday);
  lastFriday.setHours(17, 35, 0, 0);

  return {
    id: 9999,
    user_id: "demo_user",
    event_type: "OUT",
    timestamp: lastFriday,
    slack_event_id: "demo-last-punch",
    raw_message: "Out",
    created_at: lastFriday,
  };
}
