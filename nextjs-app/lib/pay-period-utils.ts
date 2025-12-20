import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Vancouver';

export interface PayPeriod {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Get the pay period for a given date
 * Pay periods are: 1st-14th and 15th-end of month
 */
export function getPayPeriodForDate(date: Date): PayPeriod {
  // Convert input date to Vancouver time to check day of month
  const zonedDate = toZonedTime(date, TIMEZONE);
  const day = zonedDate.getDate();
  const year = zonedDate.getFullYear();
  const month = zonedDate.getMonth();

  let startZoned: Date;
  let endZoned: Date;

  if (day <= 14) {
    // First half of month (1st-14th)
    startZoned = new Date(Date.UTC(year, month, 1));
    // We construct dates using UTC to ensure we have the "face value" we want, 
    // which we will then interpret as Vancouver time.
    // Actually, using new Date(year, month, ...) uses local system time.
    // On Vercel (UTC), new Date(2025, 11, 1) -> Dec 1 00:00 UTC.
    // If we pass this to fromZonedTime, it interprets "Dec 1 00:00" as Vancouver time.
    // However, to be safe and explicit, let's use string construction or ensure consistency.
    // But since we installed date-fns-tz, let's trust fromZonedTime to handle the "face value" of the Date object passed to it.
    
    // Better approach: Construct the date components we want, then use fromZonedTime
    // But fromZonedTime takes a Date or string.
    
    startZoned = new Date(year, month, 1);
    endZoned = new Date(year, month, 14, 23, 59, 59, 999);
  } else {
    // Second half of month (15th-end)
    startZoned = new Date(year, month, 15);
    endZoned = endOfMonth(zonedDate);
    endZoned.setHours(23, 59, 59, 999);
  }

  // Convert these "face value" dates (which represent Vancouver time) to actual UTC timestamps
  // We use the components from startZoned (year, month, day, hour...) and say "These are in Vancouver".
  // Note: We must ensure startZoned has the correct components in the system's local time (which is what fromZonedTime reads).
  // If system is UTC, startZoned created via new Date(y, m, d) has those components in UTC.
  // fromZonedTime reads those components and applies the offset.
  
  const start = fromZonedTime(startZoned, TIMEZONE);
  const end = fromZonedTime(endZoned, TIMEZONE);

  return {
    start,
    end,
    label: formatPayPeriodLabel(startZoned, endZoned),
  };
}

/**
 * Get the previous pay period
 */
export function getPreviousPayPeriod(currentPeriod: PayPeriod): PayPeriod {
  // Use the start date (which is a valid UTC timestamp)
  // Convert to zoned time to do math on days/months
  const currentStartZoned = toZonedTime(currentPeriod.start, TIMEZONE);
  const day = currentStartZoned.getDate();

  let startZoned: Date;
  let endZoned: Date;

  if (day === 1) {
    // Currently in first half, go to second half of previous month
    const prevMonth = subMonths(currentStartZoned, 1);
    startZoned = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 15);
    endZoned = endOfMonth(prevMonth);
    endZoned.setHours(23, 59, 59, 999);
  } else {
    // Currently in second half, go to first half of same month
    startZoned = new Date(currentStartZoned.getFullYear(), currentStartZoned.getMonth(), 1);
    endZoned = new Date(currentStartZoned.getFullYear(), currentStartZoned.getMonth(), 14, 23, 59, 59, 999);
  }

  const start = fromZonedTime(startZoned, TIMEZONE);
  const end = fromZonedTime(endZoned, TIMEZONE);

  return {
    start,
    end,
    label: formatPayPeriodLabel(startZoned, endZoned),
  };
}

/**
 * Get the next pay period
 */
export function getNextPayPeriod(currentPeriod: PayPeriod): PayPeriod {
  const currentStartZoned = toZonedTime(currentPeriod.start, TIMEZONE);
  const day = currentStartZoned.getDate();

  let startZoned: Date;
  let endZoned: Date;

  if (day === 1) {
    // Currently in first half, go to second half of same month
    startZoned = new Date(currentStartZoned.getFullYear(), currentStartZoned.getMonth(), 15);
    endZoned = endOfMonth(currentStartZoned);
    endZoned.setHours(23, 59, 59, 999);
  } else {
    // Currently in second half, go to first half of next month
    const nextMonth = addMonths(currentStartZoned, 1);
    startZoned = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    endZoned = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 14, 23, 59, 59, 999);
  }

  const start = fromZonedTime(startZoned, TIMEZONE);
  const end = fromZonedTime(endZoned, TIMEZONE);

  return {
    start,
    end,
    label: formatPayPeriodLabel(startZoned, endZoned),
  };
}

/**
 * Format a pay period label
 */
function formatPayPeriodLabel(start: Date, end: Date): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const startMonth = monthNames[start.getMonth()];
  const endMonth = monthNames[end.getMonth()];
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = start.getFullYear();

  if (start.getMonth() === end.getMonth()) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  } else {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }
}

/**
 * Check if a pay period is the current one
 */
export function isCurrentPayPeriod(period: PayPeriod): boolean {
  const now = new Date();
  return now >= period.start && now <= period.end;
}
