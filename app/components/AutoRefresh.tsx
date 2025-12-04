'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AutoRefreshProps {
  initialLastPunchId: number;
}

export default function AutoRefresh({ initialLastPunchId }: AutoRefreshProps) {
  const router = useRouter();
  const [currentLastPunchId, setCurrentLastPunchId] = useState(initialLastPunchId);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();

        if (data.last_punch_id !== currentLastPunchId) {
          console.log('New punch detected! Refreshing...');
          router.refresh();
          setCurrentLastPunchId(data.last_punch_id);
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [currentLastPunchId, router]);

  return null; // This component doesn't render anything
}
