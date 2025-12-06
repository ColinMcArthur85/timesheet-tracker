'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDecimalHours } from '@/lib/time-utils';

interface EndDayButtonProps {
  isClockedIn: boolean;
  totalHours: number;
}

export default function EndDayButton({ isClockedIn, totalHours }: EndDayButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEndDay = async () => {
    if (isClockedIn) {
      const confirmMessage = `You're still clocked in. This will punch you OUT and end your day with ${formatDecimalHours(totalHours)} total. Continue?`;
      if (!confirm(confirmMessage)) return;
    } else {
      const confirmMessage = `End your day with ${formatDecimalHours(totalHours)} total?`;
      if (!confirm(confirmMessage)) return;
    }

    setIsSubmitting(true);
    try {
      // If still clocked in, create an OUT punch
      if (isClockedIn) {
        const res = await fetch('/api/punches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'OUT',
            timestamp: new Date().toISOString(),
          }),
        });
        if (!res.ok) throw new Error('Failed to punch out');
      }

      // Show success message
      alert(`Day ended! Total hours: ${formatDecimalHours(totalHours)}`);
      
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Failed to end day');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      onClick={handleEndDay}
      disabled={isSubmitting}
      className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
    >
      {isSubmitting ? 'Ending Day...' : '✓ End Day'}
    </button>
  );
}
