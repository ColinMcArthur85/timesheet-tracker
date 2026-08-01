import { sql } from "@vercel/postgres";
import { headers } from "next/headers";
import { generateDemoPunchEvents, generateDemoLastPunch } from "./demo-data";

/**
 * Check if the current request is in demo mode
 */
async function isDemoMode(): Promise<boolean> {
  try {
    const headersList = await headers();
    return headersList.get("x-demo-mode") === "true";
  } catch {
    // If headers() fails (e.g., in non-request context), assume not demo mode
    return false;
  }
}

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

    // Create bank_transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS bank_transactions (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount_hours NUMERIC(6,2) NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('BANK', 'WITHDRAW')),
        pay_period_start TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    throw error;
  }
}


export async function getPunchEventsByDateRange(start: Date, end: Date) {
  if (await isDemoMode()) {
    // Return demo data filtered by date range
    const allDemoEvents = generateDemoPunchEvents();
    return allDemoEvents.filter((event) => {
      const eventTime = new Date(event.timestamp).getTime();
      return eventTime >= start.getTime() && eventTime <= end.getTime();
    });
  }

  const result = await sql`
    SELECT * FROM punch_events
    WHERE timestamp >= ${start.toISOString()}
    AND timestamp <= ${end.toISOString()}
    ORDER BY timestamp ASC
  `;
  return result.rows;
}

export async function createPunchEvent(userId: string, eventType: "IN" | "OUT", timestamp: Date, slackEventId: string, rawMessage: string) {
  const result = await sql`
    INSERT INTO punch_events (user_id, event_type, timestamp, slack_event_id, raw_message)
    VALUES (${userId}, ${eventType}, ${timestamp.toISOString()}, ${slackEventId}, ${rawMessage})
    RETURNING *
  `;
  return result.rows[0];
}

export async function getLastPunchEvent() {
  if (await isDemoMode()) {
    return generateDemoLastPunch();
  }

  const result = await sql`
    SELECT * FROM punch_events
    ORDER BY id DESC
    LIMIT 1
  `;
  return result.rows[0] || null;
}

export async function updatePunchEvent(slackEventId: string, eventType: "IN" | "OUT", rawMessage: string) {
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

// --- Banked Hours Management ---

let demoBankTransactions: Array<{
  id: number;
  user_id: string;
  amount_hours: number;
  type: "BANK" | "WITHDRAW";
  pay_period_start?: string | null;
  notes?: string | null;
  created_at: string;
}> = [
  {
    id: 1,
    user_id: "demo-user",
    amount_hours: 12.5,
    type: "BANK",
    pay_period_start: null,
    notes: "Banked extra hours from previous pay period",
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];

export async function getBankTransactions(userId = "default") {
  if (await isDemoMode()) {
    return demoBankTransactions;
  }

  try {
    await initDatabase();
    const result = await sql`
      SELECT * FROM bank_transactions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return result.rows;
  } catch (error) {
    console.error("Error fetching bank transactions:", error);
    return [];
  }
}

export async function createBankTransaction(
  userId: string,
  amountHours: number,
  type: "BANK" | "WITHDRAW",
  payPeriodStart?: string | null,
  notes?: string | null
) {
  if (await isDemoMode()) {
    const newTx = {
      id: Date.now(),
      user_id: userId,
      amount_hours: Number(amountHours),
      type,
      pay_period_start: payPeriodStart || null,
      notes: notes || null,
      created_at: new Date().toISOString(),
    };
    demoBankTransactions.unshift(newTx);
    return newTx;
  }

  await initDatabase();
  const result = await sql`
    INSERT INTO bank_transactions (user_id, amount_hours, type, pay_period_start, notes)
    VALUES (${userId}, ${amountHours}, ${type}, ${payPeriodStart || null}, ${notes || null})
    RETURNING *
  `;
  return result.rows[0];
}

export async function deleteBankTransaction(id: number) {
  if (await isDemoMode()) {
    const index = demoBankTransactions.findIndex((t) => t.id === id);
    if (index !== -1) {
      const removed = demoBankTransactions[index];
      demoBankTransactions.splice(index, 1);
      return removed;
    }
    return null;
  }

  const result = await sql`
    DELETE FROM bank_transactions
    WHERE id = ${id}
    RETURNING *
  `;
  return result.rows[0];
}

// --- Manual Punch Management ---

export async function updatePunchById(id: number, timestamp: Date) {
  const result = await sql`
    UPDATE punch_events
    SET timestamp = ${timestamp.toISOString()}
    WHERE id = ${id}
    RETURNING *
  `;
  return result.rows[0];
}

export async function deletePunchById(id: number) {
  const result = await sql`
    DELETE FROM punch_events
    WHERE id = ${id}
    RETURNING *
  `;
  return result.rows[0];
}
