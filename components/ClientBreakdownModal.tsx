"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  Search,
  MessageCircle,
  Scissors,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

export type BookingStatus = "confirmed" | "cancelled" | "completed" | "in_progress" | "blocked";

export interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  addons: string[];
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes?: string;
  status: BookingStatus;
  createdAt: string;
}

interface ClientBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: "week" | "all";
  onScopeChange: (scope: "week" | "all") => void;
  completedBookings: Booking[];
  upcomingBookings: Booking[];
  initialTab?: "upcoming" | "completed";
  onSelectBooking: (booking: Booking) => void;
  playSound: (type?: "click" | "chime" | "success" | "cash") => void;
}

export default function ClientBreakdownModal({
  isOpen,
  onClose,
  scope,
  onScopeChange,
  completedBookings,
  upcomingBookings,
  initialTab = "upcoming",
  onSelectBooking,
  playSound,
}: ClientBreakdownModalProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const currentList = activeTab === "upcoming" ? upcomingBookings : completedBookings;

  // Filtern nach Suchbegriff
  const filteredList = currentList.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.service.toLowerCase().includes(q) ||
      b.phone.toLowerCase().includes(q) ||
      b.date.includes(q) ||
      b.time.includes(q)
    );
  });

  const formatDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      });
    } catch {
      return dateStr;
    }
  };

  const getWhatsAppLink = (phone: string, name: string) => {
    let clean = phone.replace(/[^\d+]/g, "");
    if (clean.startsWith("0")) clean = "49" + clean.slice(1);
    clean = clean.replace("+", "");
    const text = encodeURIComponent(`Hallo ${name}! 👋 Kurze Info aus dem GM-Cutz Studio...`);
    return `https://wa.me/${clean}?text=${text}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-[#0c0c10] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#121218]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e8ba84]/15 border border-[#e8ba84]/30 flex items-center justify-center text-[#e8ba84]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
                KUNDEN-ÜBERSICHT
              </h2>
              <p className="text-[11px] text-zinc-400">
                {scope === "week" ? "Aktuelle Woche (Montag bis Sonntag)" : "Alle Termine überhaupt (Gesamt)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Scope Toggle: Woche vs Gesamt */}
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  onScopeChange("week");
                  playSound("click");
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  scope === "week"
                    ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708] shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Mo - So
              </button>
              <button
                type="button"
                onClick={() => {
                  onScopeChange("all");
                  playSound("click");
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  scope === "all"
                    ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708] shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Gesamt
              </button>
            </div>

            <button
              onClick={() => {
                onClose();
                playSound("click");
              }}
              className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab-Bar: Anstehend vs. Vergangen */}
        <div className="p-3 sm:px-6 sm:pt-4 border-b border-white/10 bg-[#0d0d12] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab("upcoming");
                playSound("click");
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                activeTab === "upcoming"
                  ? "bg-[#e8ba84]/15 border-[#e8ba84] text-[#e8ba84] shadow-[0_0_15px_rgba(232,186,132,0.15)]"
                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Anstehend</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-white">
                {upcomingBookings.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("completed");
                playSound("click");
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                activeTab === "completed"
                  ? "bg-emerald-500/15 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.15)]"
                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Vergangen</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-white">
                {completedBookings.length}
              </span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Kunde, Service, Datum..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#e8ba84]/60"
            />
          </div>
        </div>

        {/* Scrollable Client List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              Keine Termine in dieser Kategorie gefunden.
            </div>
          ) : (
            filteredList.map((booking) => {
              const isDone = booking.status === "completed" || activeTab === "completed";
              const isInProgress = booking.status === "in_progress";

              return (
                <div
                  key={booking.id}
                  onClick={() => {
                    onSelectBooking(booking);
                    onClose();
                  }}
                  className="group relative bg-[#13131a] hover:bg-[#181822] border border-white/10 hover:border-[#e8ba84]/50 rounded-2xl p-3 sm:p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isDone
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : isInProgress
                          ? "bg-sky-500/10 border-sky-500/30 text-sky-400 animate-pulse"
                          : "bg-[#e8ba84]/10 border-[#e8ba84]/30 text-[#e8ba84]"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isInProgress ? (
                        <Scissors className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm group-hover:text-[#e8ba84] transition-colors">
                          {booking.name}
                        </span>

                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            isDone
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : isInProgress
                              ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                              : "bg-[#e8ba84]/15 text-[#e8ba84] border border-[#e8ba84]/30"
                          }`}
                        >
                          {isDone ? "Vergangen" : isInProgress ? "Im Stuhl" : "Anstehend"}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                        <span className="text-zinc-300 font-medium">{booking.service}</span>
                        {booking.addons && booking.addons.length > 0 && (
                          <span className="text-[#e8ba84]/80 text-[11px]">
                            +{booking.addons.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-bold text-white flex items-center sm:justify-end gap-1.5">
                        <Calendar className="w-3 h-3 text-zinc-400" />
                        <span>{formatDate(booking.date)}</span>
                      </div>
                      <div className="text-[11px] font-mono text-[#e8ba84] flex items-center sm:justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{booking.time} Uhr</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {booking.phone && (
                        <a
                          href={getWhatsAppLink(booking.phone, booking.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 flex items-center justify-center text-emerald-400 transition"
                          title="WhatsApp Nachricht senden"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}

                      <button
                        onClick={() => {
                          onSelectBooking(booking);
                          onClose();
                        }}
                        className="h-8 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#e8ba84]/40 flex items-center gap-1 text-[11px] font-bold text-zinc-300 hover:text-white transition"
                      >
                        <span>Details</span>
                        <ArrowUpRight className="w-3 h-3 text-[#e8ba84]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary */}
        <div className="p-3.5 sm:px-6 bg-[#0a0a0e] border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
          <div>
            Total: <strong className="text-white">{upcomingBookings.length + completedBookings.length}</strong> Kunden
            ({scope === "week" ? "Mo - So" : "Alle Termine"})
          </div>
          <div className="text-right text-[11px]">
            Tippe auf einen Kunden, um Details oder Barber-Notizen zu öffnen.
          </div>
        </div>
      </div>
    </div>
  );
}
