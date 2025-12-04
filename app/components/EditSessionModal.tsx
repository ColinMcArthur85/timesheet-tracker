'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    punch_in: Date | null;
    punch_in_id: number | null;
    punch_out: Date | null;
    punch_out_id: number | null;
  } | null;
}

export default function EditSessionModal({ isOpen, onClose, session }: EditSessionModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [punchInValue, setPunchInValue] = useState('');
  const [punchOutValue, setPunchOutValue] = useState('');

  // Helper to format Date object to "YYYY-MM-DDTHH:mm" for datetime-local input
  const toLocalISOString = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  // Initialize input values when session changes
  useEffect(() => {
    if (session?.punch_in) {
      setPunchInValue(toLocalISOString(new Date(session.punch_in)));
    } else {
      setPunchInValue('');
    }
    if (session?.punch_out) {
      setPunchOutValue(toLocalISOString(new Date(session.punch_out)));
    } else {
      setPunchOutValue('');
    }
  }, [session]);

  if (!isOpen || !session) return null;

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      // Update punch in if it exists and value changed
      if (session.punch_in_id && punchInValue) {
        const res = await fetch(`/api/punches/${session.punch_in_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timestamp: new Date(punchInValue).toISOString() }),
        });
        if (!res.ok) throw new Error('Failed to update punch in');
      }

      // Update punch out if it exists and value changed
      if (session.punch_out_id && punchOutValue) {
        const res = await fetch(`/api/punches/${session.punch_out_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timestamp: new Date(punchOutValue).toISOString() }),
        });
        if (!res.ok) throw new Error('Failed to update punch out');
      }

      router.refresh();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to update session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, type: 'in' | 'out') => {
    if (!confirm(`Are you sure you want to delete the ${type.toUpperCase()} punch?`)) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/punches/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      router.refresh();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to delete punch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Edit Session</h2>
        
        {/* Punch In */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900 mb-1">Punch In</label>
          {session.punch_in && session.punch_in_id ? (
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={punchInValue}
                onChange={(e) => setPunchInValue(e.target.value)}
                className="flex-1 border rounded px-3 py-2"
              />
              <button
                onClick={() => handleDelete(session.punch_in_id!, 'in')}
                disabled={isSubmitting}
                className="bg-red-100 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-200 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          ) : (
            <span className="text-gray-400 italic">No IN punch</span>
          )}
        </div>

        {/* Punch Out */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-1">Punch Out</label>
          {session.punch_out && session.punch_out_id ? (
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={punchOutValue}
                onChange={(e) => setPunchOutValue(e.target.value)}
                className="flex-1 border rounded px-3 py-2"
              />
              <button
                onClick={() => handleDelete(session.punch_out_id!, 'out')}
                disabled={isSubmitting}
                className="bg-red-100 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-200 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          ) : (
            <span className="text-gray-400 italic">No OUT punch</span>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
