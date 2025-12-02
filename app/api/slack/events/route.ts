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

  if (!timestamp || !signature) {
    // Skip verification if headers missing (for dev/testing)
    if (!SLACK_SIGNING_SECRET || SLACK_SIGNING_SECRET === 'your-signing-secret') {
      console.log('⚠️ Skipping signature verification (dev mode)');
      return true;
    }
    return false;
  }

  // Skip verification if using placeholder
  if (SLACK_SIGNING_SECRET === 'your-signing-secret') {
    console.log('⚠️ Using placeholder signing secret, skipping verification');
    return true;
  }

  // Check timestamp is recent (within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 60 * 5) {
    console.log('❌ Request too old');
    return false;
  }

  // Verify signature
  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature =
    'v0=' +
    crypto
      .createHmac('sha256', SLACK_SIGNING_SECRET)
      .update(sigBasestring)
      .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  );

  if (!isValid) {
    console.log('❌ Signature mismatch');
  }

  return isValid;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const isValid = await verifySlackSignature(request, body);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const data: SlackEvent = JSON.parse(body);

    // URL Verification challenge
    if (data.type === 'url_verification') {
      return NextResponse.json({ challenge: data.challenge });
    }

    const event = data.event;
    if (!event) {
      return NextResponse.json({ status: 'no_event' });
    }

    // Ignore bot messages or other types
    if (event.type !== 'message' || event.subtype) {
      return NextResponse.json({ status: 'ignored' });
    }

    // Check channel
    if (SLACK_PUNCH_CHANNEL && event.channel !== SLACK_PUNCH_CHANNEL) {
      console.log(
        `Ignored event from channel ${event.channel} (expected ${SLACK_PUNCH_CHANNEL})`
      );
      return NextResponse.json({ status: 'wrong_channel' });
    }

    console.log(`Processing event from channel ${event.channel}: ${event.text}`);

    const text = event.text.trim().toUpperCase();
    let eventType: 'IN' | 'OUT' | null = null;

    if (text.startsWith('IN')) {
      eventType = 'IN';
    } else if (text.startsWith('OUT')) {
      eventType = 'OUT';
    }

    if (eventType) {
      const timestamp = parseSlackTimestamp(event.ts);
      await createPunchEvent(
        event.user,
        eventType,
        timestamp,
        event.client_msg_id || event.ts,
        text
      );
      console.log(`✅ Recorded ${eventType} at ${timestamp.toISOString()}`);
      return NextResponse.json({ status: 'recorded', type: eventType });
    }

    return NextResponse.json({ status: 'no_action' });
  } catch (error) {
    console.error('Error processing Slack event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
