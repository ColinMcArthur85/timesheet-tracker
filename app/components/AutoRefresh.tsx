'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface AutoRefreshProps {
  initialLastPunchId: number;
}

export default function AutoRefresh({ initialLastPunchId }: AutoRefreshProps) {
  const router = useRouter();
  const [currentLastPunchId, setCurrentLastPunchId] = useState(initialLastPunchId);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const pollStatus = async () => {
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
    };

    const startPolling = () => {
      // Poll immediately on mount
      pollStatus();
      // Then poll every 30 seconds (reduced from 5 seconds)
      intervalRef.current = setInterval(pollStatus, 30000);
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Start polling
    startPolling();

    // Pause polling when tab is hidden to save resources
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Tab hidden - pausing auto-refresh');
        stopPolling();
      } else {
        console.log('Tab visible - resuming auto-refresh');
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentLastPunchId, router]);

  return null; // This component doesn't render anything
}
