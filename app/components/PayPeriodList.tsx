'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatTime, formatDate, formatDuration } from '@/lib/time-utils';
import SessionList from './SessionList';

interface PayPeriodListProps {
  days: any[];
}

export default function PayPeriodList({ days }: PayPeriodListProps) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [modalSessions, setModalSessions] = useState<any[]>([]);
  const [modalTotal, setModalTotal] = useState(0);

  // Update modal data when selectedDay or days changes
  useEffect(() => {
    if (selectedDay) {
      const currentDayData = days.find(d => 
        formatDate(d.date) === formatDate(selectedDay.date)
      );
      if (currentDayData) {
        setModalSessions(currentDayData.sessions);
        setModalTotal(currentDayData.total_minutes);
      }
    }
  }, [selectedDay, days]);

  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
        Pay Period Summary
      </h2>
      
      {/* Detailed Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b border-gray-200">
              <th className="pb-3 font-semibold">Day</th>
              <th className="pb-3 font-semibold text-center">Sessions</th>
              <th className="pb-3 font-semibold text-center">Total</th>
              <th className="pb-3 font-semibold w-10"></th>
            </tr>
          </thead>
          <tbody>
            {days.map((day, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50 group cursor-pointer"
                onClick={() => setSelectedDay(day)}
              >
                <td className="py-3 font-medium">{formatDate(day.date)}</td>
                <td className="py-3 text-center">
                  {day.sessions.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {day.sessions.map((session: any, sIdx: number) => (
                        <div key={sIdx} className="text-xs">
                          {formatTime(session.punch_in)} - {formatTime(session.punch_out)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="py-3 text-center font-medium">
                  {day.total_minutes > 0 ? formatDuration(day.total_minutes) : '0:00'}
                </td>
                <td className="py-3 text-right">
                   <button
                      className="text-indigo-600 hover:text-indigo-400 text-sm font-medium transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Edit
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Day Details Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Activity for {formatDate(selectedDay.date)}
              </h2>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            
            {/* Reuse SessionList but without the container styling since we are in a modal */}
            <div className="border rounded-lg p-4">
               <SessionList 
                 sessions={modalSessions} 
                 totalMinutes={modalTotal}
                 initialDate={selectedDay.date}
                 onUpdate={() => {
                   // Refresh the data from the server
                   // The useEffect will automatically update modalSessions when days changes
                   router.refresh();
                 }}
               />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
