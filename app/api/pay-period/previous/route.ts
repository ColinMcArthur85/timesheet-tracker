import { NextRequest, NextResponse } from 'next/server';
import { getPreviousPayPeriod, PayPeriod } from '@/lib/pay-period-utils';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { currentStart } = body;

  const currentPeriod: PayPeriod = {
    start: new Date(currentStart),
    end: new Date(), // This will be recalculated
    label: '',
  };

  const previousPeriod = getPreviousPayPeriod(currentPeriod);

  return NextResponse.json({
    start: previousPeriod.start.toISOString(),
    end: previousPeriod.end.toISOString(),
    label: previousPeriod.label,
  });
}
