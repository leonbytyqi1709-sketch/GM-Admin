"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  CreditCard,
  Banknote,
  Scissors,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Receipt,
  User,
  Lock,
} from "lucide-react";
import KassenPinPad from "@/components/KassenPinPad";

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  addons: string[];
  date: string;
  time: string;
  notes?: string;
  status: string;
}

interface CheckoutModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: {
    amount: number;
    paymentMethod: "bar" | "karte";
    notes?: string;
  }) => Promise<void>;
  playSound?: (type: "chime" | "success" | "click" | "cash") => void;
  isUnlocked?: boolean;
  onUnlock?: () => void;
}

// Vom Kunden gewünschte Schnelltasten: 10€, 15€, 20€, 40€, 50€, 60€
const QUICK_AMOUNTS = [10, 15, 20, 40, 50, 60];

export default function CheckoutModal({
  booking,
  isOpen,
  onClose,
  onComplete,
  playSound,
  isUnlocked = false,
  onUnlock,
}: CheckoutModalProps) {
  const [amount, setAmount] = useState<string>("" );
  const [paymentMethod, setPaymentMethod] = useState<"bar" | "karte">("bar");
  const [customNotes, setCustomNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [showPinPad, setShowPinPad] = useState(false);
  const [pendingOverrideAmount, setPendingOverrideAmount] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (isOpen && booking) {
      // Standardmäßig leeres oder aufgerundetes Feld, Gio hat die volle Kontrolle
      setAmount("");
      setPaymentMethod("bar");
      setCustomNotes("");
    }
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const handleQuickSelect = (val: number) => {
    setAmount(val.toString());
    playSound?.("click");
  };

  const handleAddTip = (tip: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + tip).toString());
    playSound?.("click");
  };

  const executePayment = async (overrideAmount?: number) => {
    const finalAmount = overrideAmount !== undefined ? overrideAmount : parseFloat(amount) || 0;
    setSubmitting(true);
    try {
      await onComplete({
        amount: finalAmount,
        paymentMethod,
        notes: customNotes.trim() ? customNotes : undefined,
      });
      playSound?.("cash");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (overrideAmount?: number) => {
    const finalAmount = overrideAmount !== undefined ? overrideAmount : parseFloat(amount) || 0;
    // Wenn Betrag > 0 und Kasse noch nicht entsperrt ist: PIN abfragen
    if (finalAmount > 0 && !isUnlocked) {
      setPendingOverrideAmount(overrideAmount);
      setShowPinPad(true);
      playSound?.("click");
      return;
    }
    executePayment(overrideAmount);
  };

  const parsedAmount = parseFloat(amount) || 0;

  return (
    <>
      {showPinPad && (
        <KassenPinPad
          mode="modal"
          title="Kassieren autorisieren"
          subtitle={`Sicherheits-PIN zum Verbuchen von ${(pendingOverrideAmount !== undefined ? pendingOverrideAmount : parsedAmount).toFixed(2)} € eingeben`}
          onSuccess={() => {
            setShowPinPad(false);
            onUnlock?.();
            executePayment(pendingOverrideAmount);
          }}
          onClose={() => setShowPinPad(false)}
          playSound={playSound}
        />
      )}

      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="w-full sm:max-w-md bg-[#0d0d12] border-t sm:border border-[#e8ba84]/30 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glow Akzente */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-gradient-to-b from-[#e8ba84]/20 to-transparent blur-xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#e8ba84] to-[#c99756] flex items-center justify-center text-black font-black shadow-lg shadow-[#e8ba84]/20">
                <Receipt className="w-5 h-5 text-[#070708]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  Termin kassieren
                  {isUnlocked ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      Kasse 🔓
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                      PIN 🔒
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400">
                  Betrag eintragen & ins Portfolio buchen
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

        {/* Kunden & Service Info */}
        <div className="my-4 p-3.5 rounded-2xl bg-[#14141a] border border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#e8ba84]" />
              Kunde:
            </span>
            <span className="font-bold text-white text-sm">{booking.name}</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-white/5">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-[#e8ba84]" />
              Service:
            </span>
            <span className="text-[#e8ba84] font-medium text-right max-w-[200px] truncate">
              {booking.service}
            </span>
          </div>
          {booking.addons && booking.addons.length > 0 && (
            <div className="text-[11px] text-zinc-400 mt-1 pl-5">
              + {booking.addons.join(", ")}
            </div>
          )}
        </div>

        {/* Betrag Eingabe & Display */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span>Eingenommener Betrag (€)</span>
            <span className="text-[11px] text-[#e8ba84] lowercase font-normal">
              Frei wählbar oder Schnelltaste
            </span>
          </label>

          <div className="relative">
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              className="w-full h-16 rounded-2xl bg-[#09090c] border-2 border-[#e8ba84]/50 focus:border-[#e8ba84] text-white text-3xl font-black px-4 pr-14 text-center tracking-wide focus:outline-none focus:ring-4 focus:ring-[#e8ba84]/20 transition-all font-mono"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl font-black text-[#e8ba84]">
              €
            </span>
          </div>
        </div>

        {/* Schnelltasten (10€, 15€, 20€, 40€, 50€, 60€) */}
        <div className="mb-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-2">
            Schnelltasten
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {QUICK_AMOUNTS.map((val) => {
              const isSelected = parsedAmount === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickSelect(val)}
                  className={`h-11 rounded-xl text-sm font-black transition-all flex items-center justify-center active:scale-95 border ${
                    isSelected
                      ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-black border-[#e8ba84] shadow-lg shadow-[#e8ba84]/20 scale-105"
                      : "bg-[#14141a] hover:bg-white/10 text-white border-white/10 hover:border-white/20"
                  }`}
                >
                  {val} €
                </button>
              );
            })}
          </div>

          {/* Schnelle Trinkgeld Add-ons (+2€, +5€) */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-zinc-500 font-bold uppercase">Trinkgeld:</span>
            <button
              type="button"
              onClick={() => handleAddTip(2)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-emerald-400 active:scale-95"
            >
              + 2 € Tip
            </button>
            <button
              type="button"
              onClick={() => handleAddTip(5)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-emerald-400 active:scale-95"
            >
              + 5 € Tip
            </button>
            {amount && (
              <button
                type="button"
                onClick={() => { setAmount(""); playSound?.("click"); }}
                className="ml-auto text-[11px] text-zinc-400 hover:text-rose-400 underline"
              >
                Zurücksetzen
              </button>
            )}
          </div>
        </div>

        {/* Zahlungsart (Bar vs Karte) */}
        <div className="mb-5">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-2">
            Zahlungsart
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setPaymentMethod("bar"); playSound?.("click"); }}
              className={`h-12 rounded-2xl flex items-center justify-center gap-2.5 font-black text-xs transition-all border ${
                paymentMethod === "bar"
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-500/10"
                  : "bg-[#14141a] border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              <Banknote className="w-4 h-4 text-emerald-400" />
              <span>💵 Barzahlung</span>
            </button>

            <button
              type="button"
              onClick={() => { setPaymentMethod("karte"); playSound?.("click"); }}
              className={`h-12 rounded-2xl flex items-center justify-center gap-2.5 font-black text-xs transition-all border ${
                paymentMethod === "karte"
                  ? "bg-sky-500/20 border-sky-500/50 text-sky-300 shadow-lg shadow-sky-500/10"
                  : "bg-[#14141a] border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              <CreditCard className="w-4 h-4 text-sky-400" />
              <span>💳 Karte / PayPal</span>
            </button>
          </div>
        </div>

        {/* Haupt-Aktionen */}
        <div className="space-y-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit()}
            className="w-full h-14 bg-gradient-to-r from-[#e8ba84] to-[#c99756] hover:brightness-110 active:scale-[0.98] text-[#070708] rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#e8ba84]/20 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <span>Wird im Portfolio gebucht...</span>
            ) : (
              <>
                <TrendingUp className="w-5 h-5 text-[#070708]" />
                <span>
                  {parsedAmount > 0
                    ? `Kassieren & Buchen (${parsedAmount.toFixed(2)} €)`
                    : "Kassieren & Buchen"}
                </span>
                <ArrowRight className="w-4 h-4 text-[#070708]" />
              </>
            )}
          </button>

          {/* Fallback falls Gio den Termin ohne Einnahme abschließen möchte */}
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit(0)}
            className="w-full h-10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all"
          >
            <Check className="w-3.5 h-3.5 text-zinc-500" />
            <span>Ohne Einnahme abschließen (0,00 €)</span>
          </button>
        </div>
      </div>
    </div>
  </>
);
}
