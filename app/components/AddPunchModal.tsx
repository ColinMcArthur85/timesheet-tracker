'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AddPunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date;
}

export default function AddPunchModal({ isOpen, onClose, initialDate }: AddPunchModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addBothPunches, setAddBothPunches] = useState(true);
  
  // Default to provided date or now
  const baseDate = initialDate || new Date();
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
      const resIn = await fetch('/api/punches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'IN',
          timestamp: new Date(punchInTime).toISOString(),
        }),
      });
      if (!resIn.ok) throw new Error('Failed to create punch in');

      // Add punch out if checkbox is checked
      if (addBothPunches) {
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
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Manual Punch</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-1">
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
                className="w-full border rounded px-3 py-2"
                required
              />
            ) : (
              <input
                type="datetime-local"
                value={punchInTime}
                onChange={(e) => setPunchInTime(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              />
            )}
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={addBothPunches}
                onChange={(e) => setAddBothPunches(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-900">Also add Punch Out</span>
            </label>
          </div>

          {addBothPunches && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 mb-1">
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
                  className="w-full border rounded px-3 py-2"
                  required
                />
              ) : (
                <input
                  type="datetime-local"
                  value={punchOutTime}
                  onChange={(e) => setPunchOutTime(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : addBothPunches ? 'Add Session' : 'Add Punch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
