import { NextRequest, NextResponse } from 'next/server';
import { getNextPayPeriod, PayPeriod } from '@/lib/pay-period-utils';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { currentStart } = body;

  const currentPeriod: PayPeriod = {
    start: new Date(currentStart),
    end: new Date(), // This will be recalculated
    label: '',
  };

  const nextPeriod = getNextPayPeriod(currentPeriod);

  return NextResponse.json({
    start: nextPeriod.start.toISOString(),
    end: nextPeriod.end.toISOString(),
    label: nextPeriod.label,
  });
}
