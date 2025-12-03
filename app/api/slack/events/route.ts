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

  console.log('🔐 Verifying signature...');
  console.log('   Timestamp:', timestamp);
  console.log('   Signature provided:', signature ? 'Yes' : 'No');
  console.log('   Secret length:', SLACK_SIGNING_SECRET.length);

  // Slack's url_verification does NOT send signatures
  if (!timestamp || !signature) {
    console.log('⚠️ Skipping signature verification (Slack challenge or dev mode)');
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 60 * 5) {
    console.log('❌ Request too old');
    return false;
  }

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
  
  console.log(isValid ? '✅ Signature valid' : '❌ Signature mismatch');
  return isValid;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    console.log('📨 Received Slack Event:', rawBody.substring(0, 100) + '...');
    
    const data: SlackEvent = JSON.parse(rawBody);

    // 1️⃣ Handle Slack URL verification BEFORE signature checks
    if (data.type === 'url_verification') {
      console.log('🔗 Handling URL verification challenge');
      return NextResponse.json({ challenge: data.challenge });
    }

    // 2️⃣ Now validate signature for actual events
    const isValid = await verifySlackSignature(request, rawBody);
    if (!isValid) {
      console.error('⛔️ Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = data.event;
    if (!event) {
      console.log('🤷‍♂️ No event found in body');
      return NextResponse.json({ status: 'no_event' });
    }

    // Ignore non-user messages
    if (event.type !== 'message' || event.subtype) {
      console.log(`Example: Ignored event type: ${event.type}, subtype: ${event.subtype}`);
      return NextResponse.json({ status: 'ignored' });
    }

    // Check channel
    console.log(`📺 Checking channel. Expected: ${SLACK_PUNCH_CHANNEL}, Got: ${event.channel}`);
    if (SLACK_PUNCH_CHANNEL && event.channel !== SLACK_PUNCH_CHANNEL) {
      console.log('🚫 Wrong channel');
      return NextResponse.json({ status: 'wrong_channel' });
    }

    const text = event.text.trim().toUpperCase();
    console.log(`💬 Processing text: "${text}"`);
    
    let eventType: 'IN' | 'OUT' | null = null;

    if (text.startsWith('IN')) eventType = 'IN';
    if (text.startsWith('OUT')) eventType = 'OUT';

    if (eventType) {
      console.log(`✅ Detected punch ${eventType}! Saving to DB...`);
      const timestamp = parseSlackTimestamp(event.ts);
      await createPunchEvent(
        event.user,
        eventType,
        timestamp,
        event.client_msg_id || event.ts,
        text
      );
      console.log('💾 Saved successfully!');

      return NextResponse.json({ status: 'recorded', type: eventType });
    }

    console.log('😴 No punch command detected');
    return NextResponse.json({ status: 'no_action' });
  } catch (error) {
    console.error('💥 Slack handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
