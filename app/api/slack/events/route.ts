import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createPunchEvent } from '@/lib/db';
import { parseSlackTimestamp } from '@/lib/time-utils';
import { SlackEvent } from '@/lib/types';

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || '';
const SLACK_PUNCH_CHANNEL = process.env.SLACK_PUNCH_CHANNEL || '';

async function verifySlackSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  const timestamp = request.headers.get('x-slack-request-timestamp');
  const signature = request.headers.get('x-slack-signature');

  // Slack's url_verification does NOT send signatures
  if (!timestamp || !signature) {
    console.log('Skipping signature verification (Slack challenge or dev mode)');
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 60 * 5) {
    console.log('Request too old');
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature =
    'v0=' +
    crypto
      .createHmac('sha256', SLACK_SIGNING_SECRET)
      .update(sigBasestring)
      .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const data: SlackEvent = JSON.parse(rawBody);

    // 1️⃣ Handle Slack URL verification BEFORE signature checks
    if (data.type === 'url_verification') {
      return NextResponse.json({ challenge: data.challenge });
    }

    // 2️⃣ Now validate signature for actual events
    const isValid = await verifySlackSignature(request, rawBody);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = data.event;
    if (!event) {
      return NextResponse.json({ status: 'no_event' });
    }

    // Ignore non-user messages
    if (event.type !== 'message' || event.subtype) {
      return NextResponse.json({ status: 'ignored' });
    }

    // Check channel
    if (SLACK_PUNCH_CHANNEL && event.channel !== SLACK_PUNCH_CHANNEL) {
      return NextResponse.json({ status: 'wrong_channel' });
    }

    const text = event.text.trim().toUpperCase();
    let eventType: 'IN' | 'OUT' | null = null;

    if (text.startsWith('IN')) eventType = 'IN';
    if (text.startsWith('OUT')) eventType = 'OUT';

    if (eventType) {
      const timestamp = parseSlackTimestamp(event.ts);
      await createPunchEvent(
        event.user,
        eventType,
        timestamp,
        event.client_msg_id || event.ts,
        text
      );

      return NextResponse.json({ status: 'recorded', type: eventType });
    }

    return NextResponse.json({ status: 'no_action' });
  } catch (error) {
    console.error('Slack handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
