"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BankTransaction, BankSummary } from "@/lib/types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPiggyBank, faPlusCircle, faMinusCircle, faHistory, faTrashAlt, faCoins } from "@fortawesome/free-solid-svg-icons";
import { formatDate, formatDecimalHours } from "@/lib/time-utils";

interface BankedHoursCardProps {
  currentPayPeriodStart?: Date;
  payPeriodHours?: number;
  onBankDataChange?: () => void;
  refreshKey?: number;
}

export default function BankedHoursCard({ currentPayPeriodStart, payPeriodHours, onBankDataChange, refreshKey }: BankedHoursCardProps) {
  const [bankData, setBankData] = useState<BankSummary>({ balance_hours: 0, transactions: [] });
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<"BANK" | "WITHDRAW" | "HISTORY" | null>(null);
  const [hoursInput, setHoursInput] = useState("");
  const [minutesInput, setMinutesInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBankData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/bank");
      if (res.ok) {
        const data = await res.json();
        setBankData(data);
      }
    } catch (err) {
      console.error("Failed to fetch bank data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankData();
  }, [refreshKey]);


  const handleOpenModal = (type: "BANK" | "WITHDRAW" | "HISTORY") => {
    setModalType(type);
    setErrorMsg(null);
    if (type === "WITHDRAW" && payPeriodHours !== undefined) {
      // Suggest amount needed to reach 80 hours (if under 80)
      const neededDecimal = Math.max(0, 80 - payPeriodHours);
      if (neededDecimal > 0) {
        const h = Math.floor(neededDecimal);
        const m = Math.round((neededDecimal - h) * 60);
        setHoursInput(h > 0 ? h.toString() : "0");
        setMinutesInput(m > 0 ? m.toString() : "0");
      } else {
        setHoursInput("");
        setMinutesInput("");
      }
    } else {
      setHoursInput("");
      setMinutesInput("");
    }
    setNotesInput("");
  };

  const handleCloseModal = () => {
    setModalType(null);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const hrs = parseFloat(hoursInput || "0");
    const mins = parseFloat(minutesInput || "0");

    if (isNaN(hrs) || isNaN(mins) || (hrs === 0 && mins === 0) || hrs < 0 || mins < 0) {
      setErrorMsg("Please enter a valid duration (hours and/or minutes).");
      return;
    }

    const totalDecimalHours = hrs + mins / 60;

    if (modalType === "WITHDRAW" && totalDecimalHours > bankData.balance_hours) {
      setErrorMsg(`Insufficient balance. You currently have ${formatDecimalHours(bankData.balance_hours)} banked.`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_hours: totalDecimalHours,
          type: modalType,
          pay_period_start: currentPayPeriodStart ? currentPayPeriodStart.toISOString() : null,
          notes: notesInput || (modalType === "BANK" ? "Banked extra worked hours" : "Used banked hours for pay period"),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to process request");
        return;
      }

      setBankData({ balance_hours: data.balance_hours, transactions: data.transactions });
      handleCloseModal();
      if (onBankDataChange) onBankDataChange();
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/bank?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        setBankData(data);
        if (onBankDataChange) onBankDataChange();
      }
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    }
  };

  // Calculate net banked hours used in current period if start date given
  const currentPeriodWithdrawals = bankData.transactions
    .filter((tx) => tx.type === "WITHDRAW" && currentPayPeriodStart && tx.pay_period_start && new Date(tx.pay_period_start).toDateString() === new Date(currentPayPeriodStart).toDateString())
    .reduce((sum, tx) => sum + Number(tx.amount_hours), 0);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const modalJSX = modalType && mounted ? createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4" onClick={handleCloseModal}>
      <div className="rounded-3xl p-6 w-full max-w-lg border border-white/20 bg-zinc-950 shadow-2xl relative z-[10000]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {modalType === "BANK" && <FontAwesomeIcon icon={faPlusCircle} className="text-amber-400" />}
            {modalType === "WITHDRAW" && <FontAwesomeIcon icon={faMinusCircle} className="text-emerald-400" />}
            {modalType === "HISTORY" && <FontAwesomeIcon icon={faHistory} className="text-purple-400" />}
            {modalType === "BANK" ? "Bank Extra Worked Hours" : modalType === "WITHDRAW" ? "Use Banked Hours for Pay Period" : "Banked Hours History"}
          </h3>
          <button onClick={handleCloseModal} className="text-white/60 hover:text-white transition-colors cursor-pointer text-lg">
            ✕
          </button>
        </div>

        {modalType === "HISTORY" ? (
          <div className="max-h-96 overflow-y-auto pr-1">
            {bankData.transactions.length === 0 ? (
              <p className="text-sm text-white/50 text-center py-6">No bank transactions recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {bankData.transactions.map((tx) => (
                  <div key={tx.id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${tx.type === "BANK" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                          {tx.type === "BANK" ? "+ BANK" : "- USE"}
                        </span>
                        <span className="font-semibold text-white">{formatDecimalHours(Number(tx.amount_hours))}</span>
                        <span className="text-white/40">• {formatDate(new Date(tx.created_at))}</span>
                      </div>
                      {tx.notes && <p className="text-white/70 text-[11px]">{tx.notes}</p>}
                    </div>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="text-red-400/70 hover:text-red-400 p-1 transition-colors cursor-pointer"
                      title="Delete transaction"
                    >
                      <FontAwesomeIcon icon={faTrashAlt} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs">{errorMsg}</div>}

            <div>
              <label className="block text-xs font-medium text-white/80 mb-2">Amount to {modalType === "BANK" ? "Bank" : "Use"}</label>
              <div className="grid grid-cols-2 gap-4">
                {/* Hours Stepper */}
                <div className="bg-white/5 border border-white/20 rounded-2xl p-3 flex flex-col items-center gap-2">
                  <span className="text-xs text-white/60 uppercase tracking-wider font-semibold">Hours</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setHoursInput((prev) => Math.max(0, parseInt(prev || "0", 10) - 1).toString())}
                      className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-lg flex items-center justify-center cursor-pointer transition-colors active:scale-95 select-none"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={hoursInput}
                      onChange={(e) => setHoursInput(e.target.value)}
                      className="w-16 text-center bg-transparent text-white font-bold text-xl focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => setHoursInput((prev) => (parseInt(prev || "0", 10) + 1).toString())}
                      className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-lg flex items-center justify-center cursor-pointer transition-colors active:scale-95 select-none"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Minutes Stepper */}
                <div className="bg-white/5 border border-white/20 rounded-2xl p-3 flex flex-col items-center gap-2">
                  <span className="text-xs text-white/60 uppercase tracking-wider font-semibold">Minutes</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMinutesInput((prev) => Math.max(0, parseInt(prev || "0", 10) - 1).toString())}
                      className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-lg flex items-center justify-center cursor-pointer transition-colors active:scale-95 select-none"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      step="1"
                      value={minutesInput}
                      onChange={(e) => setMinutesInput(e.target.value)}
                      className="w-16 text-center bg-transparent text-white font-bold text-xl focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => setMinutesInput((prev) => Math.min(59, parseInt(prev || "0", 10) + 1).toString())}
                      className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-lg flex items-center justify-center cursor-pointer transition-colors active:scale-95 select-none"
                    >
                      +
                    </button>
                  </div>
                </div>

              </div>
              {modalType === "WITHDRAW" && payPeriodHours !== undefined && (
                <p className="text-[11px] text-white/50 mt-2 text-center">
                  Current pay period hours: {formatDecimalHours(payPeriodHours)} (Short of 80h by {formatDecimalHours(Math.max(0, 80 - payPeriodHours))})
                </p>
              )}
            </div>


            <div>
              <label className="block text-xs font-medium text-white/80 mb-1.5">Notes / Description (Optional)</label>
              <input
                type="text"
                placeholder={modalType === "BANK" ? "e.g. Extra weekend work" : "e.g. Bringing pay period up to 80h"}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/15 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-5 py-2 rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer ${
                  modalType === "BANK" ? "bg-amber-500 hover:bg-amber-400 text-black" : "bg-emerald-500 hover:bg-emerald-400 text-black"
                }`}
              >
                {submitting ? "Processing..." : modalType === "BANK" ? "Deposit to Bank" : "Apply Hours"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="p-6 mb-6 rounded-3xl border border-white/20 bg-linear-to-br from-indigo-950/40 via-purple-950/20 to-black backdrop-blur-xl shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl shadow-inner">
            <FontAwesomeIcon icon={faPiggyBank} />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg flex items-center gap-2">
              Banked Hours Pool
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Active
              </span>
            </h2>
            <p className="text-xs text-white/60">Reserve surplus hours to use towards future 80h pay periods</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl shadow-lg">
          <div className="text-right">
            <div className="text-xs text-white/60 font-medium">Bank Balance</div>
            <div className="text-2xl font-bold text-amber-300 tracking-tight flex items-center justify-end gap-1.5">
              <FontAwesomeIcon icon={faCoins} className="text-amber-400 text-lg" />
              {loading ? "..." : formatDecimalHours(bankData.balance_hours)}
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => handleOpenModal("BANK")}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-medium text-sm transition-all shadow-md active:scale-98 cursor-pointer"
        >
          <FontAwesomeIcon icon={faPlusCircle} />
          Bank Worked Hours
        </button>

        <button
          onClick={() => handleOpenModal("WITHDRAW")}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 font-medium text-sm transition-all shadow-md active:scale-98 cursor-pointer"
        >
          <FontAwesomeIcon icon={faMinusCircle} />
          Use Banked Hours
        </button>

        <button
          onClick={() => handleOpenModal("HISTORY")}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 border border-white/20 font-medium text-sm transition-all shadow-md active:scale-98 cursor-pointer"
        >
          <FontAwesomeIcon icon={faHistory} />
          Transaction History ({bankData.transactions.length})
        </button>
      </div>

      {/* Net Banked Adjustment Banner for Current Pay Period */}
      {(() => {
        const periodTransactions = bankData.transactions.filter(
          (tx) => currentPayPeriodStart && tx.pay_period_start && new Date(tx.pay_period_start).toDateString() === new Date(currentPayPeriodStart).toDateString()
        );
        const netAdjustment = periodTransactions.reduce((acc, tx) => {
          const amt = Number(tx.amount_hours);
          return tx.type === "WITHDRAW" ? acc + amt : acc - amt;
        }, 0);

        if (netAdjustment === 0) return null;

        return (
          <div className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${netAdjustment > 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-amber-500/10 border-amber-500/20 text-amber-300"}`}>
            <FontAwesomeIcon icon={faCoins} className={netAdjustment > 0 ? "text-emerald-400" : "text-amber-400"} />
            <span>
              {netAdjustment > 0 ? (
                <>
                  <strong>{formatDecimalHours(netAdjustment)}</strong> claimed from bank and applied to this pay period (Payable Total: 80h).
                </>
              ) : (
                <>
                  <strong>{formatDecimalHours(Math.abs(netAdjustment))}</strong> banked from this pay period (Payable Total: 80h).
                </>
              )}
            </span>
          </div>
        );
      })()}


      {modalJSX}
    </div>
  );
}


