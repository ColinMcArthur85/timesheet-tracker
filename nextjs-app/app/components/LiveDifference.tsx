'use client';

import { useState, useEffect } from 'react';
import { formatDecimalHours } from '@/lib/time-utils';

interface LiveDifferenceProps {
  baseMinutes: number;
  startTime: Date | string | null;
  potentialMinutes: number;
}

export default function LiveDifference({ baseMinutes, startTime, potentialMinutes }: LiveDifferenceProps) {
  const [totalMinutes, setTotalMinutes] = useState(baseMinutes);

  useEffect(() => {
    if (!startTime) {
      setTotalMinutes(baseMinutes);
      return;
    }

    const calculate = () => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const diffMinutes = Math.floor((now - start) / (1000 * 60));
      setTotalMinutes(baseMinutes + diffMinutes);
    };

    calculate();
    const interval = setInterval(calculate, 10000);
    return () => clearInterval(interval);
  }, [baseMinutes, startTime]);

  const difference = totalMinutes - potentialMinutes;
  const isPositive = difference >= 0;

  return (
    <div className={`text-3xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {formatDecimalHours(difference / 60)}
    </div>
  );
}
