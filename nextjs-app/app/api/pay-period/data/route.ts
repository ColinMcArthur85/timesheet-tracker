import { NextRequest, NextResponse } from 'next/server';
import { getPunchEventsByDateRange } from '@/lib/db';
import { processPunches } from '@/lib/punch-processor';
import { calculatePayPeriodStats, organizeSessionsByDay } from '@/lib/pay-period';
import { getStartOfDay, getEndOfDay } from '@/lib/time-utils';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { start, end } = body;

  const startDate = new Date(start);
  const endDate = new Date(end);

  const ppStartDay = getStartOfDay(startDate);
  const ppEndDay = getEndOfDay(endDate);

  const ppPunches = await getPunchEventsByDateRange(ppStartDay, ppEndDay);
  const ppSessions = processPunches(ppPunches as any);
  const stats = calculatePayPeriodStats(startDate, endDate, ppSessions);
  const payPeriodDays = organizeSessionsByDay(startDate, endDate, ppSessions);

  const periodStats = {
    total_hours: stats.total_minutes / 60,
    potential_hours: stats.potential_minutes / 60,
    difference: stats.difference_minutes / 60,
  };

  return NextResponse.json({
    stats: periodStats,
    days: payPeriodDays,
  });
}
