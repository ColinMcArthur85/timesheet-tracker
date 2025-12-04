import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createPunchEvent, updatePunchEvent, deletePunchEvent } from '@/lib/db';
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

    const event = data.event as any;
    if (!event) {
      console.log('🤷‍♂️ No event found in body');
      return NextResponse.json({ status: 'no_event' });
    }

    // Ignore non-message events
    if (event.type !== 'message') {
      console.log(`Example: Ignored event type: ${event.type}`);
      return NextResponse.json({ status: 'ignored' });
    }

    // Allow 'message_changed' and 'message_deleted' subtypes, ignore others
    if (event.subtype && event.subtype !== 'message_changed' && event.subtype !== 'message_deleted') {
      console.log(`Example: Ignored subtype: ${event.subtype}`);
      return NextResponse.json({ status: 'ignored' });
    }

    // Check channel
    console.log(`📺 Checking channel. Expected: ${SLACK_PUNCH_CHANNEL}, Got: ${event.channel}`);
    if (SLACK_PUNCH_CHANNEL && event.channel !== SLACK_PUNCH_CHANNEL) {
      console.log('🚫 Wrong channel');
      return NextResponse.json({ status: 'wrong_channel' });
    }

    // Handle DELETION
    if (event.subtype === 'message_deleted') {
      const deletedTs = event.previous_message?.ts || event.deleted_ts;
      console.log(`🗑️ Message deleted: ${deletedTs}`);
      if (deletedTs) {
        await deletePunchEvent(deletedTs);
      }
      return NextResponse.json({ status: 'deleted' });
    }

    // Handle EDIT or NEW message
    let text = '';
    let ts = '';
    let user = '';

    if (event.subtype === 'message_changed') {
      text = event.message.text.trim();
      ts = event.message.ts; // The original message timestamp
      user = event.message.user;
    } else {
      text = event.text.trim();
      ts = event.ts;
      user = event.user;
    }

    console.log(`💬 Processing text: "${text}"`);
    
    let eventType: 'IN' | 'OUT' | null = null;

    // Use Regex for case-insensitive matching with word boundaries
    // Matches: "In", "IN", "in", "In!", "In."
    if (/^in\b/i.test(text)) eventType = 'IN';
    if (/^out\b/i.test(text)) eventType = 'OUT';

    if (eventType) {
      const timestamp = parseSlackTimestamp(ts);
      
      if (event.subtype === 'message_changed') {
        console.log(`🔄 Updating punch to ${eventType}...`);
        const updated = await updatePunchEvent(ts, eventType, text);
        if (!updated) {
          // If it wasn't a punch before, create it now
          console.log('   Punch did not exist, creating new...');
          await createPunchEvent(user, eventType, timestamp, ts, text);
        }
      } else {
        console.log(`✅ Detected punch ${eventType}! Saving to DB...`);
        // Use ts as the ID (instead of client_msg_id) for consistency with edits
        await createPunchEvent(
          user,
          eventType,
          timestamp,
          ts,
          text
        );
      }
      console.log('💾 Saved successfully!');
      return NextResponse.json({ status: 'recorded', type: eventType });
    } else {
      // If it's an edit and the new text is NOT a punch, delete the old punch if it existed
      if (event.subtype === 'message_changed') {
        console.log('🔄 Edit detected, but no longer a punch. Deleting if exists...');
        await deletePunchEvent(ts);
        return NextResponse.json({ status: 'removed_punch' });
      }
    }

    console.log('😴 No punch command detected');
    return NextResponse.json({ status: 'no_action' });
  } catch (error) {
    console.error('💥 Slack handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
