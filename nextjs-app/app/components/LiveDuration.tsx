'use client';

import { useState, useEffect } from 'react';
import { formatDecimalHours } from '@/lib/time-utils';

interface LiveDurationProps {
  punchInTime: Date;
}

export default function LiveDuration({ punchInTime }: LiveDurationProps) {
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    const calculateMinutes = () => {
      const now = new Date();
      const duration = (now.getTime() - new Date(punchInTime).getTime()) / (1000 * 60);
      setMinutes(Math.floor(duration));
    };

    // Calculate immediately
    calculateMinutes();

    // Update every minute (and align with seconds if possible, but 1s interval is safer for "instant" feel if we showed seconds, for minutes 60s is fine but immediate feedback on mount is key)
    const interval = setInterval(calculateMinutes, 10000); // 10s check to be responsive enough

    return () => clearInterval(interval);
  }, [punchInTime]);

  // Convert minutes to hours for formatting
  return <span>{formatDecimalHours(minutes / 60)}</span>;
}
