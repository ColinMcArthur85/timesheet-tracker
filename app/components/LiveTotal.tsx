'use client';

import { useState, useEffect } from 'react';
import { formatDecimalHours } from '@/lib/time-utils';

interface LiveTotalProps {
  baseMinutes: number;
  startTime: Date | string | null;
}

export default function LiveTotal({ baseMinutes, startTime }: LiveTotalProps) {
  const [totalMinutes, setTotalMinutes] = useState(baseMinutes);

  useEffect(() => {
    if (!startTime) {
      setTotalMinutes(baseMinutes);
      return;
    }

    const calculate = () => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const diffMinutes = Math.floor((now - start) / (1000 * 60)); // Minutes floor like backend
      // Backend uses Math.floor for duration.
      // So we take baseMinutes (calculated from closed sessions) + current live duration.
      setTotalMinutes(baseMinutes + diffMinutes);
    };

    calculate();
    // Update frequently
    const interval = setInterval(calculate, 10000); 
    return () => clearInterval(interval);
  }, [baseMinutes, startTime]);

  return <span>{formatDecimalHours(totalMinutes / 60)}</span>;
}
