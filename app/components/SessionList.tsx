'use client';

import { useState } from 'react';
import { formatTime } from '@/lib/time-utils';
import EditSessionModal from './EditSessionModal';
import AddPunchModal from './AddPunchModal';
import LiveDuration from './LiveDuration';

interface SessionListProps {
  sessions: any[];
  totalMinutes: number;
  initialDate?: Date;
  onUpdate?: () => void;
}

export default function SessionList({ sessions, totalMinutes, initialDate, onUpdate }: SessionListProps) {
  const [editingSession, setEditingSession] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full hover:bg-indigo-100 font-medium transition-colors"
        >
          + Add Punch
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
              <th className="pb-3 font-semibold">In</th>
              <th className="pb-3 font-semibold">Out</th>
              <th className="pb-3 font-semibold">Duration</th>
              <th className="pb-3 font-semibold">Notes</th>
              <th className="pb-3 font-semibold w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-500">
                  No activity today
                </td>
              </tr>
            ) : (
              sessions.map((session, idx) => (
                <tr key={idx} className="border-b border-gray-100 last:border-0 group">
                  <td className="py-3">{formatTime(session.punch_in)}</td>
                  <td className="py-3">{formatTime(session.punch_out)}</td>
                  <td className="py-3">
                    {session.punch_out ? (
                      `${session.duration_minutes}m`
                    ) : (
                      <LiveDuration punchInTime={session.punch_in} />
                    )}
                  </td>
                  <td className="py-3 text-gray-500">{session.notes || '-'}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setEditingSession(session)}
                      className="text-indigo-600 hover:text-indigo-400 text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-right font-semibold">
        Total Today: {(totalMinutes / 60).toFixed(2)} hrs
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
