'use client';

import { useState, useEffect } from 'react';

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

    // Update every minute
    const interval = setInterval(calculateMinutes, 60000);

    return () => clearInterval(interval);
  }, [punchInTime]);

  return <span>{minutes}m</span>;
}
