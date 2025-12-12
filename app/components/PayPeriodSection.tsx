"use client";

import { useState, useEffect } from "react";
import { PayPeriod, isCurrentPayPeriod } from "@/lib/pay-period-utils";
import PayPeriodNavigator from "./PayPeriodNavigator";
import SessionList from "./SessionList";
import LiveTotal from "./LiveTotal";
import LiveDifference from "./LiveDifference";
import { formatTime, formatDate, formatLongDate, formatDecimalHours } from "@/lib/time-utils";
import { DayData } from "@/lib/types";

interface PayPeriodSectionProps {
  initialPeriod: PayPeriod;
  initialStats: {
    total_hours: number;
    potential_hours: number;
    difference: number;
  };
  initialDays: DayData[];
}

export default function PayPeriodSection({ initialPeriod, initialStats, initialDays }: PayPeriodSectionProps) {
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
      const currentDayData = days.find((d) => new Date(d.date).toDateString() === new Date(selectedDay.date).toDateString());
      if (currentDayData) {
        setModalSessions(currentDayData.sessions);
        setModalTotal(currentDayData.total_minutes);
      }
    }
  }, [selectedDay, days]);

  const handlePeriodChange = async (newPeriod: PayPeriod) => {
    setLoading(true);
    try {
      const response = await fetch("/api/pay-period/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      console.error("Error fetching pay period data:", error);
    } finally {
      setLoading(false);
    }
  };

  const isCurrent = isCurrentPayPeriod(period);

  // Calculate closed minutes for the entire period
  const closedPeriodMinutes = days.reduce((total, day) => {
    const dayClosed = day.sessions.reduce((dTotal, s: any) => {
      if (s.punch_out) return dTotal + s.duration_minutes;
      return dTotal;
    }, 0);
    return total + dayClosed;
  }, 0);

  // Find open session start time
  let openSessionStart = null;
  for (const day of days) {
    const open = day.sessions.find((s: any) => !s.punch_out);
    if (open) {
      openSessionStart = open.punch_in;
      break;
    }
  }

  return (
    <>
      {/* Pay Period Stats */}
      <div className="p-6 mb-6 rounded-3xl border border-white/20 bg-white/5 backdrop-blur-xl shadow-2xl">
        <div className="flex-between mb-4 border-b border-white/20 pb-3">
          <h2 className="text-white">Pay Period Stats</h2>
          <button className="btn-sm-primary">Export PDF</button>
        </div>

        <PayPeriodNavigator initialPeriod={period} isCurrentPeriod={isCurrent} onPeriodChange={handlePeriodChange} />

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg p-4 text-center border border-white/10 bg-white/5 backdrop-blur-lg shadow-xl">
              <div className="text-3xl font-bold text-white">
                <LiveTotal baseMinutes={closedPeriodMinutes} startTime={openSessionStart} />
              </div>
              <div className="text-sm text-white/70 mt-1">Total Hours</div>
            </div>
            <div className="rounded-lg p-4 text-center border border-white/10 bg-white/5 backdrop-blur-lg shadow-xl">
              <div className="text-3xl font-bold text-white">{formatDecimalHours(stats.potential_hours)}</div>
              <div className="text-sm text-white/70 mt-1">Potential Hours</div>
            </div>
            <div className="rounded-lg p-4 text-center border border-white/10 bg-white/5 backdrop-blur-lg shadow-xl">
              <div className={stats.difference < 0 ? "text-accent-red text-3xl font-bold" : "text-accent-green text-3xl font-bold"}>
                <LiveDifference baseMinutes={closedPeriodMinutes} potentialMinutes={stats.potential_hours * 60} startTime={openSessionStart} />
              </div>
              <div className="text-sm text-white/70 mt-1">Difference</div>
            </div>
          </div>
        )}
      </div>

      {/* Pay Period Summary */}
      <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg shadow-xl">
        <div className="flex-between mb-4 border-b border-white/10 pb-3">
          <h2 className="text-white">Pay Period Summary</h2>
          <button className="btn-sm-primary">Export PDF</button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-accent-blue">Day</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-accent-blue">Sessions</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-accent-blue">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {days.map((day, idx) => {
                  const dateStr = formatDate(new Date(day.date));
                  const totalHours = formatDecimalHours(day.total_minutes / 60);

                  return (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/10 group cursor-pointer" onClick={() => setSelectedDay(day)}>
                      <td className="py-3 px-4 text-sm text-white">{dateStr}</td>
                      <td className="py-3 px-4 text-sm text-white/80">
                        {day.sessions.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {day.sessions.map((session: any, sIdx: number) => (
                              <div key={sIdx} className="text-xs text-white/80">
                                {formatTime(session.punch_in)} - {session.punch_out ? formatTime(session.punch_out) : "Open"}
                              </div>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-white text-right">{totalHours}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          className="text-[color:var(--color-primary)] hover:opacity-80 text-sm font-medium transition-opacity opacity-0 group-hover:opacity-100"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setSelectedDay(null)}>
            <div className="rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20 bg-white/5 backdrop-blur-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-white">Activity for {formatLongDate(new Date(selectedDay.date))}</h2>
                <button onClick={() => setSelectedDay(null)} className="text-white/70 hover:text-white transition-colors">
                  ✕
                </button>
              </div>

              <div className="border border-white/10 rounded-lg p-4">
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
