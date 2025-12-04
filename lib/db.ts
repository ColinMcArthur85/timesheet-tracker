import { sql } from '@vercel/postgres';

export async function initDatabase() {
  try {
    // Create punch_events table
    await sql`
      CREATE TABLE IF NOT EXISTS punch_events (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        event_type TEXT NOT NULL CHECK (event_type IN ('IN', 'OUT')),
        timestamp TIMESTAMPTZ NOT NULL,
        slack_event_id TEXT UNIQUE NOT NULL,
        raw_message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_punch_events_timestamp 
      ON punch_events(timestamp DESC)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_punch_events_user_id 
      ON punch_events(user_id)
    `;

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

export async function getPunchEventsByDateRange(start: Date, end: Date) {
  const result = await sql`
    SELECT * FROM punch_events
    WHERE timestamp >= ${start.toISOString()}
    AND timestamp <= ${end.toISOString()}
    ORDER BY timestamp ASC
  `;
  return result.rows;
}

export async function createPunchEvent(
  userId: string,
  eventType: 'IN' | 'OUT',
  timestamp: Date,
  slackEventId: string,
  rawMessage: string
) {
  const result = await sql`
    INSERT INTO punch_events (user_id, event_type, timestamp, slack_event_id, raw_message)
    VALUES (${userId}, ${eventType}, ${timestamp.toISOString()}, ${slackEventId}, ${rawMessage})
    RETURNING *
  `;
  return result.rows[0];
}

export async function getLastPunchEvent() {
  const result = await sql`
    SELECT * FROM punch_events
    ORDER BY id DESC
    LIMIT 1
  `;
  return result.rows[0] || null;
}

export async function updatePunchEvent(
  slackEventId: string,
  eventType: 'IN' | 'OUT',
  rawMessage: string
) {
  const result = await sql`
    UPDATE punch_events
    SET event_type = ${eventType}, raw_message = ${rawMessage}
    WHERE slack_event_id = ${slackEventId}
    RETURNING *
  `;
  return result.rows[0];
}

export async function deletePunchEvent(slackEventId: string) {
  const result = await sql`
    DELETE FROM punch_events
    WHERE slack_event_id = ${slackEventId}
    RETURNING *
  `;
  return result.rows[0];
}
