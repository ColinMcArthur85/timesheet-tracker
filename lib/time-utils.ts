export function parseSlackTimestamp(ts: string): Date {
  // Slack timestamps are like "1612345678.000200"
  const timestamp = parseFloat(ts);
  return new Date(timestamp * 1000);
}

export function formatTime(date: Date | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Vancouver',
  });
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
}

export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Vancouver',
  });
}

export function formatFullDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Vancouver',
  });
}

export function getPSTDate(date?: Date): Date {
  const d = date || new Date();
  // Convert to PST
  const pstString = d.toLocaleString('en-US', {
    timeZone: 'America/Vancouver',
  });
  return new Date(pstString);
}

export function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
