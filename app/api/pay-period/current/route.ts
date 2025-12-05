import { NextResponse } from 'next/server';
import { getPayPeriodForDate } from '@/lib/pay-period-utils';

export async function GET() {
  const currentPeriod = getPayPeriodForDate(new Date());
  
  return NextResponse.json({
    start: currentPeriod.start.toISOString(),
    end: currentPeriod.end.toISOString(),
    label: currentPeriod.label,
  });
}
