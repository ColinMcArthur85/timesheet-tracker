import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

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
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth();

  if (day <= 14) {
    // First half of month (1st-14th)
    const start = new Date(year, month, 1);
    const end = new Date(year, month, 14, 23, 59, 59, 999);
    return {
      start,
      end,
      label: formatPayPeriodLabel(start, end),
    };
  } else {
    // Second half of month (15th-end)
    const start = new Date(year, month, 15);
    const end = endOfMonth(date);
    end.setHours(23, 59, 59, 999);
    return {
      start,
      end,
      label: formatPayPeriodLabel(start, end),
    };
  }
}

/**
 * Get the previous pay period
 */
export function getPreviousPayPeriod(currentPeriod: PayPeriod): PayPeriod {
  const currentStart = currentPeriod.start;
  const day = currentStart.getDate();

  if (day === 1) {
    // Currently in first half, go to second half of previous month
    const prevMonth = subMonths(currentStart, 1);
    const start = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 15);
    const end = endOfMonth(prevMonth);
    end.setHours(23, 59, 59, 999);
    return {
      start,
      end,
      label: formatPayPeriodLabel(start, end),
    };
  } else {
    // Currently in second half, go to first half of same month
    const start = new Date(currentStart.getFullYear(), currentStart.getMonth(), 1);
    const end = new Date(currentStart.getFullYear(), currentStart.getMonth(), 14, 23, 59, 59, 999);
    return {
      start,
      end,
      label: formatPayPeriodLabel(start, end),
    };
  }
}

/**
 * Get the next pay period
 */
export function getNextPayPeriod(currentPeriod: PayPeriod): PayPeriod {
  const currentStart = currentPeriod.start;
  const day = currentStart.getDate();

  if (day === 1) {
    // Currently in first half, go to second half of same month
    const start = new Date(currentStart.getFullYear(), currentStart.getMonth(), 15);
    const end = endOfMonth(currentStart);
    end.setHours(23, 59, 59, 999);
    return {
      start,
      end,
      label: formatPayPeriodLabel(start, end),
    };
  } else {
    // Currently in second half, go to first half of next month
    const nextMonth = addMonths(currentStart, 1);
    const start = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    const end = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 14, 23, 59, 59, 999);
    return {
      start,
      end,
      label: formatPayPeriodLabel(start, end),
    };
  }
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
