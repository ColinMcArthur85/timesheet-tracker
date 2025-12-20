'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AddPunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date | string;
}

type PunchType = 'in' | 'out' | 'both';

export default function AddPunchModal({ isOpen, onClose, initialDate }: AddPunchModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [punchType, setPunchType] = useState<PunchType>('both');
  
  // Default to provided date or now, ensure it's a Date object
  const baseDate = initialDate ? new Date(initialDate) : new Date();
  const tzOffset = baseDate.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(baseDate.getTime() - tzOffset)).toISOString().slice(0, 16);
  
  const [punchInTime, setPunchInTime] = useState(localISOTime);
  const [punchOutTime, setPunchOutTime] = useState(localISOTime);

  // Update timestamps when modal opens with a new initialDate
  useEffect(() => {
    if (isOpen && initialDate) {
      const d = new Date(initialDate);
      // Set to 9 AM by default for punch in
      if (d.getHours() === 0 && d.getMinutes() === 0) {
        d.setHours(9, 0, 0, 0);
      }
      const offset = d.getTimezoneOffset() * 60000;
      const iso = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
      setPunchInTime(iso);
      
      // Set punch out to 5 PM by default
      const dOut = new Date(initialDate);
      dOut.setHours(17, 0, 0, 0);
      const isoOut = (new Date(dOut.getTime() - offset)).toISOString().slice(0, 16);
      setPunchOutTime(isoOut);
    } else if (isOpen && !initialDate) {
      // Reset to now if no date provided
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const iso = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
      setPunchInTime(iso);
      setPunchOutTime(iso);
    }
  }, [isOpen, initialDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Add punch in
      if (punchType === 'in' || punchType === 'both') {
        const resIn = await fetch('/api/punches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'IN',
            timestamp: new Date(punchInTime).toISOString(),
          }),
        });
        if (!resIn.ok) throw new Error('Failed to create punch in');
      }

      // Add punch out
      if (punchType === 'out' || punchType === 'both') {
        const resOut = await fetch('/api/punches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'OUT',
            timestamp: new Date(punchOutTime).toISOString(),
          }),
        });
        if (!resOut.ok) throw new Error('Failed to create punch out');
      }
      
      router.refresh();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to create punch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 w-full max-w-md border border-border">
        <h2 className="text-xl font-bold mb-4 text-foreground">Add Manual Punch</h2>
        
        <form onSubmit={handleSubmit}>
          {/* Punch Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-3">
              Punch Type
            </label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="punchType"
                  value="in"
                  checked={punchType === 'in'}
                  onChange={(e) => setPunchType(e.target.value as PunchType)}
                  className="mr-3"
                />
                <span className="text-sm text-foreground">Punch In Only</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="punchType"
                  value="out"
                  checked={punchType === 'out'}
                  onChange={(e) => setPunchType(e.target.value as PunchType)}
                  className="mr-3"
                />
                <span className="text-sm text-foreground">Punch Out Only</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="punchType"
                  value="both"
                  checked={punchType === 'both'}
                  onChange={(e) => setPunchType(e.target.value as PunchType)}
                  className="mr-3"
                />
                <span className="text-sm text-foreground">Complete Session (Both)</span>
              </label>
            </div>
          </div>

          {/* Punch In Time */}
          {(punchType === 'in' || punchType === 'both') && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1">
                Punch In {initialDate ? 'Time' : 'Date & Time'}
              </label>
              {initialDate ? (
                <input
                  type="time"
                  value={punchInTime.slice(11, 16)}
                  onChange={(e) => {
                    const dateStr = punchInTime.slice(0, 10);
                    setPunchInTime(`${dateStr}T${e.target.value}`);
                  }}
                  className="w-full border border-border bg-muted text-foreground rounded px-3 py-2"
                  required
                />
              ) : (
                <input
                  type="datetime-local"
                  value={punchInTime}
                  onChange={(e) => setPunchInTime(e.target.value)}
                  className="w-full border border-border bg-muted text-foreground rounded px-3 py-2"
                  required
                />
              )}
            </div>
          )}

          {/* Punch Out Time */}
          {(punchType === 'out' || punchType === 'both') && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-1">
                Punch Out {initialDate ? 'Time' : 'Date & Time'}
              </label>
              {initialDate ? (
                <input
                  type="time"
                  value={punchOutTime.slice(11, 16)}
                  onChange={(e) => {
                    const dateStr = punchOutTime.slice(0, 10);
                    setPunchOutTime(`${dateStr}T${e.target.value}`);
                  }}
                  className="w-full border border-border bg-muted text-foreground rounded px-3 py-2"
                  required
                />
              ) : (
                <input
                  type="datetime-local"
                  value={punchOutTime}
                  onChange={(e) => setPunchOutTime(e.target.value)}
                  className="w-full border border-border bg-muted text-foreground rounded px-3 py-2"
                  required
                />
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSubmitting ? 'Saving...' : 
                punchType === 'both' ? 'Add Session' : 
                punchType === 'in' ? 'Add Punch In' : 'Add Punch Out'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
