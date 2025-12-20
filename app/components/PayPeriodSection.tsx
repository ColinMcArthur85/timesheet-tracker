"use client";

import { useState, useEffect } from "react";
import { PayPeriod, isCurrentPayPeriod } from "@/lib/pay-period-utils";
import PayPeriodNavigator from "./PayPeriodNavigator";
import SessionList from "./SessionList";
import LiveTotal from "./LiveTotal";
import LiveDifference from "./LiveDifference";
import { formatTime, formatDate, formatLongDate, formatDecimalHours } from "@/lib/time-utils";
import { toZonedTime } from "date-fns-tz";
import { DayData, ProcessedSession } from "@/lib/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Extend jsPDF type to include autoTable properties
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

interface PayPeriodSectionProps {
  initialPeriod: PayPeriod;
  initialStats: {
    total_hours: number;
    potential_hours: number;
    difference: number;
  };
  initialDays: DayData[];
  profile: {
    name: string;
    occupation: string;
    company: string;
    avatarUrl: string;
  };
}

export default function PayPeriodSection({ initialPeriod, initialStats, initialDays, profile }: PayPeriodSectionProps) {
  const [period, setPeriod] = useState(initialPeriod);
  const [stats, setStats] = useState(initialStats);
  const [days, setDays] = useState(initialDays);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [modalSessions, setModalSessions] = useState<ProcessedSession[]>([]);
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

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // -- Header Config --
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let yPos = 20;

    // Title / Header
    doc.setFontSize(18);
    doc.text("Timesheet Report", margin, yPos);

    doc.setFontSize(10);
    doc.text(`Period: ${formatDate(period.start)} - ${formatDate(period.end)}`, pageWidth - margin, yPos, { align: "right" });

    yPos += 10;

    // Employee Info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(profile.name, margin, yPos);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(profile.occupation, margin, yPos + 5);
    doc.text(profile.company, margin, yPos + 10);

    yPos += 20;

    // -- Table Data Preparation --
    // Columns: Day | Morning In | Morning Out | Afternoon In | Afternoon Out | Total
    const tableBody: (string | { content: string; colSpan?: number; styles?: { fontStyle?: "normal" | "bold" | "italic" | "bolditalic"; halign?: "left" | "center" | "right" } })[][] = [];

    days.forEach((day) => {
      const dateStr = formatDate(day.date);
      const sessions = day.sessions;

      // If no sessions, add empty row
      if (sessions.length === 0) {
        tableBody.push([dateStr, "", "", "", "", "0:00:00"]);
        return;
      }

      // Chunk sessions into groups of 2 (Morning/Afternoon)
      // Logic: Max 2 sessions per row.
      for (let i = 0; i < sessions.length; i += 2) {
        const isContinuation = i > 0;
        const rowLabel = isContinuation ? `${dateStr} [cont]` : dateStr;

        const session1 = sessions[i];
        const session2 = sessions[i + 1]; // might be undefined

        // Helper to format time or empty
        const fmt = (d: Date | null) => (d ? formatTime(d) : "");

        // Helper for duration H:MM:00
        const fmtDuration = (mins: number) => {
          const hours = Math.floor(mins / 60);
          const m = Math.round(mins % 60);
          return `${hours}:${m.toString().padStart(2, "0")}:00`;
        };

        // Calculate row total
        let rowTotalMinutes = session1.duration_minutes;
        if (session2) rowTotalMinutes += session2.duration_minutes;

        const rowTotalStr = fmtDuration(rowTotalMinutes);

        tableBody.push([rowLabel, fmt(session1.punch_in), fmt(session1.punch_out), session2 ? fmt(session2.punch_in) : "", session2 ? fmt(session2.punch_out) : "", rowTotalStr]);
      }
    });

    // Add Grand Total Row
    // Calc total mins from hours
    const totalMinutes = stats.total_hours * 60;
    const hours = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    const grandTotalStr = `${hours}:${m.toString().padStart(2, "0")}:00`;

    tableBody.push([
      { content: "Grand Total", colSpan: 5, styles: { fontStyle: "bold" as const, halign: "right" as const } },
      { content: grandTotalStr, styles: { fontStyle: "bold" as const, halign: "right" as const } },
    ]);

    // -- Generate Table --
    autoTable(doc, {
      startY: yPos,
      head: [["Day", "Morning Time In", "Morning Time Out", "Afternoon Time In", "Punch Out", "Total"]],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 30 }, // Day
        1: { cellWidth: 25 }, // M In
        2: { cellWidth: 25 }, // M Out
        3: { cellWidth: 25 }, // A In
        4: { cellWidth: 25 }, // A Out
        5: { cellWidth: 25, halign: "right" }, // Total
      },
    });

    // Footer
    const finalY = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Generated by Timesheet Tracker", margin, finalY);

    // Save
    doc.save(`Timesheet_${profile.name.replace(" ", "_")}_${formatDate(period.start)}.pdf`);
  };

  const isCurrent = isCurrentPayPeriod(period);

  // Calculate closed minutes for the entire period
  const closedPeriodMinutes = days.reduce((total, day) => {
    const dayClosed = day.sessions.reduce((dTotal, s: ProcessedSession) => {
      if (s.punch_out) return dTotal + s.duration_minutes;
      return dTotal;
    }, 0);
    return total + dayClosed;
  }, 0);

  // Find open session start time
  let openSessionStart = null;
  for (const day of days) {
    const open = day.sessions.find((s: ProcessedSession) => !s.punch_out);
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
          <button className="btn-sm-primary" onClick={handleExportPDF}>
            Export PDF
          </button>
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
          <button className="btn-sm-primary" onClick={handleExportPDF}>
            Export PDF
          </button>
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
                  <th className="text-right py-3 px-4 text-sm font-semibold text-accent-blue">Delta vs 8h</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {days.map((day, idx) => {
                  const dateStr = formatDate(new Date(day.date));
                  const totalHours = formatDecimalHours(day.total_minutes / 60);
                  const TIMEZONE = "America/Vancouver";
                  const dayZoned = toZonedTime(new Date(day.date), TIMEZONE);
                  // Tue–Sat are workdays: 2=Tue ... 6=Sat
                  const isWorkDay = [2, 3, 4, 5, 6].includes(dayZoned.getDay());
                  const deltaMinutes = isWorkDay ? day.total_minutes - 8 * 60 : day.total_minutes;
                  const showDash = !isWorkDay && day.total_minutes === 0;
                  const deltaStr = showDash ? "-" : formatDecimalHours(deltaMinutes / 60);
                  const deltaClass = showDash ? "text-white/60" : deltaMinutes >= 0 ? "text-accent-green" : "text-accent-red";

                  return (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/10 group cursor-pointer" onClick={() => setSelectedDay(day)}>
                      <td className="py-3 px-4 text-sm text-white">{dateStr}</td>
                      <td className="py-3 px-4 text-sm text-white/80">
                        {day.sessions.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {day.sessions.map((session: ProcessedSession, sIdx: number) => (
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
                      <td className={`py-3 px-4 text-sm text-right ${deltaClass}`}>{deltaStr}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          className="text-(--color-primary) hover:opacity-80 text-sm font-medium transition-opacity opacity-0 group-hover:opacity-100"
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
