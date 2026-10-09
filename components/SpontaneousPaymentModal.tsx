"use client";

import React, { useState } from "react";
import {
  X,
  CreditCard,
  Banknote,
  Plus,
  Receipt,
  Sparkles,
  Scissors,
  Check,
} from "lucide-react";

interface SpontaneousPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    clientName: string;
    service: string;
    amount: number;
    paymentMethod: "bar" | "karte";
    notes?: string;
  }) => Promise<void>;
  playSound?: (type: "chime" | "success" | "click" | "cash") => void;
}

const QUICK_AMOUNTS = [10, 15, 20, 40, 50, 60];

const PRESET_SERVICES = [
  "Walk-In Haarschnitt",
  "Fade & Beard Lineup",
  "Tressa Texture Spray / Wachs",
  "Kopfmassage & Treatment",
  "Trinkgeld-Kasse",
  "Sonstige Einnahme",
];

export default function SpontaneousPaymentModal({
  isOpen,
  onClose,
  onSubmit,
  playSound,
}: SpontaneousPaymentModalProps) {
  const [clientName, setClientName] = useState("Walk-In Kunde");
  const [service, setService] = useState("Walk-In Haarschnitt");
  const [amount, setAmount] = useState<string>("35");
  const [paymentMethod, setPaymentMethod] = useState<"bar" | "karte">("bar");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleQuickSelect = (val: number) => {
    setAmount(val.toString());
    playSound?.("click");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        clientName: clientName.trim() || "Walk-In Kunde",
        service,
        amount: parsed,
        paymentMethod,
        notes: notes.trim() ? notes : undefined,
      });
      playSound?.("cash");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#0d0d12] border-t sm:border border-[#e8ba84]/30 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-gradient-to-b from-[#e8ba84]/20 to-transparent blur-xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-black font-black shadow-lg shadow-emerald-500/20">
              <Plus className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Spontane Einnahme erfassen
              </h3>
              <p className="text-xs text-zinc-400">
                Walk-In, Produktverkauf oder Trinkgeld direkt buchen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 my-4">
          {/* Betrag */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Betrag (€)</span>
              <span className="text-[11px] text-[#e8ba84] lowercase font-normal">
                Schnelltaste oder tippen
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                className="w-full h-14 rounded-2xl bg-[#09090c] border-2 border-[#e8ba84]/50 focus:border-[#e8ba84] text-white text-2xl font-black px-4 pr-12 text-center tracking-wide focus:outline-none focus:ring-4 focus:ring-[#e8ba84]/20 transition-all font-mono"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-black text-[#e8ba84]">
                €
              </span>
            </div>
          </div>

          {/* Schnelltasten: 10, 15, 20, 40, 50, 60 */}
          <div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {QUICK_AMOUNTS.map((val) => {
                const isSelected = parsedAmount === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickSelect(val)}
                    className={`h-10 rounded-xl text-xs font-black transition-all flex items-center justify-center active:scale-95 border ${
                      isSelected
                        ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-black border-[#e8ba84] font-black scale-105"
                        : "bg-[#14141a] text-zinc-300 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {val} €
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kunde & Zweck */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Kunde / Notiz
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="z.B. Walk-In, Enes..."
                className="w-full h-11 rounded-xl bg-[#14141a] border border-white/10 text-white text-xs px-3 focus:outline-none focus:border-[#e8ba84]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Kategorie / Service
              </label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full h-11 rounded-xl bg-[#14141a] border border-white/10 text-white text-xs px-2.5 focus:outline-none focus:border-[#e8ba84]"
              >
                {PRESET_SERVICES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Zahlungsart */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Zahlungsart
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setPaymentMethod("bar"); playSound?.("click"); }}
                className={`h-11 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all border ${
                  paymentMethod === "bar"
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                    : "bg-[#14141a] border-white/10 text-zinc-400"
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span>💵 Bar</span>
              </button>

              <button
                type="button"
                onClick={() => { setPaymentMethod("karte"); playSound?.("click"); }}
                className={`h-11 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all border ${
                  paymentMethod === "karte"
                    ? "bg-sky-500/20 border-sky-500/50 text-sky-300"
                    : "bg-[#14141a] border-white/10 text-zinc-400"
                }`}
              >
                <CreditCard className="w-4 h-4 text-sky-400" />
                <span>💳 Karte</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || parsedAmount <= 0}
            className="w-full h-13 bg-gradient-to-r from-emerald-400 to-teal-500 hover:brightness-110 active:scale-[0.98] text-[#070708] rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all disabled:opacity-50 mt-4"
          >
            {submitting ? (
              <span>Wird gespeichert...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Einnahme buchen ({parsedAmount.toFixed(2)} €)</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
