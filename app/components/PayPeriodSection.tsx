'use client';

import { useState, useEffect } from 'react';
import { PayPeriod, isCurrentPayPeriod } from '@/lib/pay-period-utils';
import PayPeriodNavigator from './PayPeriodNavigator';
import SessionList from './SessionList';
import { formatTime, formatDate, formatLongDate, formatDecimalHours } from '@/lib/time-utils';
import { DayData } from '@/lib/types';

interface PayPeriodSectionProps {
  initialPeriod: PayPeriod;
  initialStats: {
    total_hours: number;
    potential_hours: number;
    difference: number;
  };
  initialDays: DayData[];
}

export default function PayPeriodSection({
  initialPeriod,
  initialStats,
  initialDays,
}: PayPeriodSectionProps) {
  const [period, setPeriod] = useState(initialPeriod);
  const [stats, setStats] = useState(initialStats);
  const [days, setDays] = useState(initialDays);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [modalSessions, setModalSessions] = useState<any[]>([]);
  const [modalTotal, setModalTotal] = useState(0);

  // Update modal data when selectedDay or days changes
  useEffect(() => {
    if (selectedDay) {
      const currentDayData = days.find(d => 
        new Date(d.date).toDateString() === new Date(selectedDay.date).toDateString()
      );
      if (currentDayData) {
        setModalSessions(currentDayData.sessions);
        setModalTotal(currentDayData.total_minutes);
      }
    }
  }, [selectedDay, days]);

  const handlePeriodChange = async (newPeriod: PayPeriod) => {
    setLoading(true);
    try {
      const response = await fetch('/api/pay-period/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: newPeriod.start.toISOString(),
          end: newPeriod.end.toISOString(),
        }),
      });
      const data = await response.json();
      setStats(data.stats);
      setDays(data.days);
      setPeriod(newPeriod);
    } catch (error) {
      console.error('Error fetching pay period data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isCurrent = isCurrentPayPeriod(period);

  return (
    <>
      {/* Pay Period Stats */}
      <div className="bg-card rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
          Pay Period Stats
        </h2>

        <PayPeriodNavigator
          initialPeriod={period}
          isCurrentPeriod={isCurrent}
          onPeriodChange={handlePeriodChange}
        />

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {formatDecimalHours(stats.total_hours)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Hours</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {formatDecimalHours(stats.potential_hours)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Potential Hours</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div
                className={`text-3xl font-bold ${
                  stats.difference >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatDecimalHours(stats.difference)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Difference</div>
            </div>
          </div>
        )}
      </div>

      {/* Pay Period Summary */}
      <div className="bg-card rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
          Pay Period Summary
        </h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Day
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Sessions
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Total
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {days.map((day, idx) => {
                  const dateStr = formatDate(new Date(day.date));
                  const totalHours = formatDecimalHours(day.total_minutes / 60);

                  return (
                    <tr 
                      key={idx} 
                      className="border-b border-gray-100 hover:bg-muted group cursor-pointer"
                      onClick={() => setSelectedDay(day)}
                    >
                      <td className="py-3 px-4 text-sm text-foreground">{dateStr}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {day.sessions.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {day.sessions.map((session: any, sIdx: number) => (
                              <div key={sIdx} className="text-xs">
                                {formatTime(session.punch_in)} - {session.punch_out ? formatTime(session.punch_out) : 'Open'}
                              </div>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground text-right">
                        {totalHours}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          className="text-primary hover:opacity-80 text-sm font-medium transition-opacity opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDay(day);
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Day Details Modal */}
        {selectedDay && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Activity for {formatLongDate(new Date(selectedDay.date))}
                </h2>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
              
              <div className="border rounded-lg p-4">
                <SessionList 
                  sessions={modalSessions} 
                  totalMinutes={modalTotal}
                  initialDate={selectedDay.date}
                  onUpdate={() => {
                    // Refresh the data
                    handlePeriodChange(period);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
