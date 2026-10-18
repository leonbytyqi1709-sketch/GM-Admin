"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Lock,
  Unlock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  ShieldAlert,
  Loader2,
  Clock,
  User,
} from "lucide-react";

export interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  addons: string[];
  date: string;
  time: string;
  notes?: string;
  status: "confirmed" | "cancelled" | "completed" | "in_progress" | "blocked";
  createdAt: string;
}

interface BlockDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  bookings: Booking[];
  onSuccess: (message: string) => void;
  playSound?: (type?: "chime" | "success" | "click" | "cash") => void;
}

const REASON_PRESETS = [
  "Freier Tag / Urlaub",
  "Studio geschlossen",
  "Feierabend (Studio schließt)",
  "Krankheit / Notfall",
  "Privattermin / Fortbildung",
  "Eigener Grund...",
];

function getFormattedDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getNextDayOfWeek(dayIndex: number): string {
  const d = new Date();
  const currentDay = d.getDay();
  let diff = dayIndex - currentDay;
  if (diff <= 0) diff += 7;
  d.setDate(d.getDate() + diff);
  return getFormattedDate(d);
}

export default function BlockDayModal({
  isOpen,
  onClose,
  initialDate,
  bookings,
  onSuccess,
  playSound,
}: BlockDayModalProps) {
  const todayStr = useMemo(() => getFormattedDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [reasonPreset, setReasonPreset] = useState<string>(REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    } else {
      setSelectedDate(todayStr);
    }
  }, [initialDate, todayStr, isOpen]);

  // Prüfen, ob der gewählte Tag aktuell gesperrt ist
  const blockedStatus = useMemo(() => {
    const blockedBookings = bookings.filter(
      (b) =>
        b.date === selectedDate &&
        b.status === "blocked" &&
        (b.id.startsWith("GM-LOCK-") ||
          b.name.includes("STUDIO GESPERRT") ||
          b.service.toLowerCase().includes("gesperrt") ||
          b.service.toLowerCase().includes("feierabend") ||
          (b.notes &&
            (b.notes.toLowerCase().includes("gesperrt") ||
              b.notes.toLowerCase().includes("feierabend") ||
              b.notes.toLowerCase().includes("urlaub") ||
              b.notes.toLowerCase().includes("frei"))))
    );

    const isBlocked = blockedBookings.length > 0;
    const reason =
      blockedBookings[0]?.notes ||
      blockedBookings[0]?.service ||
      "Studio geschlossen";

    return {
      isBlocked,
      blockedCount: blockedBookings.length,
      reason,
    };
  }, [bookings, selectedDate]);

  // Bestehende echte Kundentermine an diesem Tag
  const clientBookings = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.date === selectedDate &&
        b.status !== "cancelled" &&
        b.status !== "blocked"
    );
  }, [bookings, selectedDate]);

  if (!isOpen) return null;

  const effectiveReason =
    reasonPreset === "Eigener Grund..."
      ? customReason.trim() || "Tag gesperrt"
      : reasonPreset;

  // Tag sperren
  const handleLockDay = async () => {
    if (submitting) return;

    if (clientBookings.length > 0) {
      const ok = window.confirm(
        `Hinweis: An diesem Tag (${selectedDate}) gibt es bereits ${clientBookings.length} bestehende Kundentermine.\n\nDiese Termine bleiben erhalten, aber alle noch freien Slots werden für die Webseite gesperrt, sodass keine neuen Buchungen reinkommen können.\n\nFortfahren?`
      );
      if (!ok) return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    playSound?.("click");

    try {
      const res = await fetch("/api/bookings/lockdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          reason: effectiveReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Fehler beim Sperren des Tages");
      }

      playSound?.("success");
      onSuccess(
        `🔒 Tag ${selectedDate} erfolgreich gesperrt! (${data.count} Slots blockiert)`
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Netzwerkfehler beim Sperren des Tages");
    } finally {
      setSubmitting(false);
    }
  };

  // Tag entsperren
  const handleUnlockDay = async () => {
    if (submitting) return;

    const ok = window.confirm(
      `Möchtest du die Sperre für den ${selectedDate} wirklich aufheben?\n\nDie freien Zeitslots werden auf der Webseite sofort wieder für Kunden buchbar.`
    );
    if (!ok) return;

    setSubmitting(true);
    setErrorMsg(null);
    playSound?.("click");

    try {
      const res = await fetch(`/api/bookings/lockdown?date=${selectedDate}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Fehler beim Entsperren des Tages");
      }

      playSound?.("success");
      onSuccess(
        `☀️ Sperre für ${selectedDate} aufgehoben: ${data.count} Slots wieder freigegeben!`
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Netzwerkfehler beim Aufheben der Sperre");
    } finally {
      setSubmitting(false);
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getFormattedDate(tomorrow);

  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  const dayAfterTomorrowStr = getFormattedDate(dayAfterTomorrow);

  const nextSaturdayStr = getNextDayOfWeek(6);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="website-card w-full max-w-lg rounded-3xl p-5 sm:p-7 border border-white/15 bg-[#0f0f14] shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2.5 rounded-2xl border ${
                blockedStatus.isBlocked
                  ? "bg-purple-500/15 border-purple-500/30 text-purple-300"
                  : "bg-red-500/15 border-red-500/30 text-red-300"
              }`}
            >
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Einzelnen Tag sperren / freigeben
              </h3>
              <p className="text-xs text-zinc-400">
                Steuerung von Urlaub, Ruhetagen & Studio-Sperren
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Datumsauswahl */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#e8ba84]" /> Datum auswählen
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl bg-[#16161e] border border-white/15 text-white text-sm font-mono focus:outline-none focus:border-[#e8ba84] transition"
          />

          {/* Quick Date Pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                selectedDate === todayStr
                  ? "bg-[#e8ba84] text-black border-[#e8ba84]"
                  : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
              }`}
            >
              Heute
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(tomorrowStr)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                selectedDate === tomorrowStr
                  ? "bg-[#e8ba84] text-black border-[#e8ba84]"
                  : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
              }`}
            >
              Morgen
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(dayAfterTomorrowStr)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                selectedDate === dayAfterTomorrowStr
                  ? "bg-[#e8ba84] text-black border-[#e8ba84]"
                  : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
              }`}
            >
              Übermorgen
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(nextSaturdayStr)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                selectedDate === nextSaturdayStr
                  ? "bg-[#e8ba84] text-black border-[#e8ba84]"
                  : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
              }`}
            >
              Nächster Samstag
            </button>
          </div>
        </div>

        {/* Live Status Karte für das gewählte Datum */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            blockedStatus.isBlocked
              ? "bg-purple-950/40 border-purple-500/40"
              : "bg-emerald-950/20 border-emerald-500/30"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Live Status für {selectedDate}
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                blockedStatus.isBlocked
                  ? "bg-purple-500/30 text-purple-200 border border-purple-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {blockedStatus.isBlocked ? "GESPERRT" : "OFFEN"}
            </span>
          </div>

          {blockedStatus.isBlocked ? (
            <div className="space-y-1">
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Dieser Tag ist für Buchungen blockiert</span>
              </div>
              <p className="text-xs text-purple-300">
                Grund: <span className="font-semibold text-white">{blockedStatus.reason}</span>
              </p>
              <p className="text-[11px] text-zinc-400 pt-0.5">
                Auf der Webseite sind alle freien Slots dieses Tages gesperrt.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Dieser Tag ist für Online-Buchungen geöffnet</span>
              </div>
              <p className="text-xs text-zinc-300">
                Kunden können freie Zeitslots über die Webseite buchen.
              </p>
            </div>
          )}

          {/* Kundentermine an diesem Tag */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-zinc-400 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-zinc-400" /> Bestehende Kundentermine:
            </span>
            <span
              className={`font-mono font-bold ${
                clientBookings.length > 0 ? "text-[#e8ba84]" : "text-zinc-400"
              }`}
            >
              {clientBookings.length} gebucht
            </span>
          </div>
        </div>

        {/* Grund auswählen (nur wenn noch nicht gesperrt) */}
        {!blockedStatus.isBlocked && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Grund für die Sperre
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {REASON_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setReasonPreset(p)}
                  className={`p-2 rounded-xl text-xs font-semibold text-left border transition truncate ${
                    reasonPreset === p
                      ? "bg-[#e8ba84]/20 border-[#e8ba84] text-[#e8ba84]"
                      : "bg-[#16161e] border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {reasonPreset === "Eigener Grund..." && (
              <input
                type="text"
                placeholder="z.B. Gio auf Barber-Convention"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full h-10 mt-1 px-3.5 rounded-xl bg-[#16161e] border border-white/15 text-white text-xs focus:outline-none focus:border-[#e8ba84]"
              />
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-1/3 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold transition border border-white/10"
          >
            Abbrechen
          </button>

          {blockedStatus.isBlocked ? (
            <button
              type="button"
              onClick={handleUnlockDay}
              disabled={submitting}
              className="w-full sm:w-2/3 h-11 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 transition active:scale-98 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Wird freigegeben...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Sperre aufheben (Tag freigeben)</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLockDay}
              disabled={submitting}
              className="w-full sm:w-2/3 h-11 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 transition active:scale-98 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Wird gesperrt...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Diesen Tag komplett sperren</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
