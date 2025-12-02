-- Create punch_events table
CREATE TABLE IF NOT EXISTS punch_events (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('IN', 'OUT')),
  timestamp TIMESTAMPTZ NOT NULL,
  slack_event_id TEXT UNIQUE NOT NULL,
  raw_message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_punch_events_timestamp ON punch_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_punch_events_user_id ON punch_events(user_id);

-- Create work_sessions table (optional, for pre-computed sessions)
CREATE TABLE IF NOT EXISTS work_sessions (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  punch_in TIMESTAMPTZ,
  punch_out TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_sessions_date ON work_sessions(date DESC);
