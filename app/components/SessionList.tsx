'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatTime, formatDecimalHours } from '@/lib/time-utils';
import EditSessionModal from './EditSessionModal';
import AddPunchModal from './AddPunchModal';
import LiveDuration from './LiveDuration';

interface SessionListProps {
  sessions: any[];
  totalMinutes: number;
  initialDate?: Date | string;
  onUpdate?: () => void;
}

export default function SessionList({ sessions, totalMinutes, initialDate, onUpdate }: SessionListProps) {
  const router = useRouter();
  const [editingSession, setEditingSession] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);

  const handleDeleteSession = async (session: any) => {
    if (!confirm('Delete this entire session? This will remove both punch in and punch out.')) {
      return;
    }

    setDeletingSessionId(session.punch_in_id);
    try {
      // Delete punch in
      if (session.punch_in_id) {
        const res = await fetch(`/api/punches/${session.punch_in_id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete punch in');
      }

      // Delete punch out if it exists
      if (session.punch_out_id) {
        const res = await fetch(`/api/punches/${session.punch_out_id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete punch out');
      }

      router.refresh();
      onUpdate?.();
    } catch (error) {
      console.error(error);
      alert('Failed to delete session');
    } finally {
      setDeletingSessionId(null);
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="text-sm bg-primary bg-opacity-10 text-white px-3 py-1 rounded-full hover:bg-opacity-20 font-medium transition-colors"
        >
          + Add Punch
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-muted-foreground border-b border-border">
              <th className="pb-3 font-semibold">In</th>
              <th className="pb-3 font-semibold">Out</th>
              <th className="pb-3 font-semibold">Duration</th>
              <th className="pb-3 font-semibold w-32"></th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-muted-foreground">
                  No activity today
                </td>
              </tr>
            ) : (
              sessions.map((session, idx) => (
                <tr key={idx} className="border-b border-border last:border-0 group">
                  <td className="py-3 text-foreground">{formatTime(session.punch_in)}</td>
                  <td className="py-3 text-foreground">{formatTime(session.punch_out)}</td>
                  <td className="py-3 text-foreground">
                    {session.punch_out ? (
                      `${session.duration_minutes}m`
                    ) : (
                      <LiveDuration punchInTime={session.punch_in} />
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingSession(session)}
                        className="text-primary hover:opacity-80 text-sm font-medium transition-opacity"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session)}
                        disabled={deletingSessionId === session.punch_in_id}
                        className="text-destructive hover:opacity-80 text-sm font-medium transition-opacity disabled:opacity-50"
                      >
                        {deletingSessionId === session.punch_in_id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-right font-semibold text-foreground">
        Total Today: {formatDecimalHours(totalMinutes / 60)}
      </div>

      <EditSessionModal
        isOpen={!!editingSession}
        onClose={() => {
          setEditingSession(null);
          onUpdate?.();
        }}
        session={editingSession}
      />

      <AddPunchModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          onUpdate?.();
        }}
        initialDate={initialDate}
      />
    </div>
  );
}
