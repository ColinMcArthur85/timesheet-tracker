import { PunchEvent, ProcessedSession } from './types';

export function processPunches(punches: PunchEvent[]): ProcessedSession[] {
  const sessions: ProcessedSession[] = [];
  let currentIn: PunchEvent | null = null;

  // Sort by timestamp
  const sortedPunches = [...punches].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const punch of sortedPunches) {
    if (punch.event_type === 'IN') {
      if (currentIn) {
        // Check for rapid-fire duplicates (within 5 minutes)
        const timeDiff = new Date(punch.timestamp).getTime() - new Date(currentIn.timestamp).getTime();
        if (timeDiff < 5 * 60 * 1000) {
          // Ignore duplicate IN within 5 mins
          continue;
        }

        // Missing OUT for previous IN
        sessions.push({
          date: new Date(currentIn.timestamp),
          punch_in: new Date(currentIn.timestamp),
          punch_out: null,
          duration_minutes: 0,
          notes: 'Missing OUT punch',
        });
      }
      currentIn = punch;
    } else if (punch.event_type === 'OUT') {
      if (currentIn) {
        // Pair found
        const duration =
          (new Date(punch.timestamp).getTime() - new Date(currentIn.timestamp).getTime()) /
          (1000 * 60);
        sessions.push({
          date: new Date(currentIn.timestamp),
          punch_in: new Date(currentIn.timestamp),
          punch_out: new Date(punch.timestamp),
          duration_minutes: Math.floor(duration),
          notes: null,
        });
        currentIn = null;
      }
      // OUT without IN is ignored
    }
  }

  if (currentIn) {
    // Trailing IN
    sessions.push({
      date: new Date(currentIn.timestamp),
      punch_in: new Date(currentIn.timestamp),
      punch_out: null,
      duration_minutes: 0,
      notes: 'Open session',
    });
  }

  return sessions;
}
