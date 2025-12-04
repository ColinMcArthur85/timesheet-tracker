import { NextRequest, NextResponse } from 'next/server';
import { createPunchEvent } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, timestamp } = body;

    if (!eventType || !timestamp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (eventType !== 'IN' && eventType !== 'OUT') {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid timestamp' }, { status: 400 });
    }

    // Generate a manual ID
    const slackEventId = `manual_${uuidv4()}`;
    const rawMessage = `MANUAL_${eventType}`;
    const userId = 'MANUAL_USER'; // Or get from session if auth existed

    const punch = await createPunchEvent(userId, eventType, date, slackEventId, rawMessage);

    return NextResponse.json({ punch });
  } catch (error) {
    console.error('Error creating manual punch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
