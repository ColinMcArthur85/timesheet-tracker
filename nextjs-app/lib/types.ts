export interface PunchEvent {
  id: number;
  user_id: string;
  event_type: 'IN' | 'OUT';
  timestamp: Date;
  slack_event_id: string;
  raw_message: string;
  created_at?: Date;
}

export interface WorkSession {
  id?: number;
  date: Date;
  punch_in: Date | null;
  punch_out: Date | null;
  duration_minutes: number;
  notes: string | null;
}

export interface ProcessedSession {
  date: Date;
  punch_in: Date | null;
  punch_in_id: number | null;
  punch_out: Date | null;
  punch_out_id: number | null;
  duration_minutes: number;
  notes: string | null;
}

export interface DayData {
  date: Date;
  morning: ProcessedSession | null;
  afternoon: ProcessedSession | null;
  total_minutes: number;
  sessions: ProcessedSession[];
}

export interface PayPeriodStats {
  start_date: Date;
  end_date: Date;
  total_minutes: number;
  potential_minutes: number;
  difference_minutes: number;
}

export interface SlackEvent {
  type: string;
  event?: {
    type: string;
    subtype?: string;
    channel: string;
    user: string;
    text: string;
    ts: string;
    client_msg_id?: string;
  };
  challenge?: string;
}
