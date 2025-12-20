import { NextResponse } from 'next/server';
import { getLastPunchEvent } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const lastPunch = await getLastPunchEvent();
    return NextResponse.json({
      last_punch_id: lastPunch?.id || 0,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error getting status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
