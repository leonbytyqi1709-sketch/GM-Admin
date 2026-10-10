"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  CreditCard,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
  Sparkles,
  Calendar,
  Clock,
  Trash2,
  CheckCircle2,
  ChevronRight,
  Scissors,
  Award,
  Target,
  Receipt,
  PieChart,
  Lock,
} from "lucide-react";
import type { PaymentRecord } from "@/lib/db";
import KassenPinPad from "@/components/KassenPinPad";

interface PortfolioModuleProps {
  payments: PaymentRecord[];
  onRefresh: () => void;
  onOpenSpontaneousModal: () => void;
  onDeletePayment: (id: string) => Promise<void>;
  playSound?: (type: "chime" | "success" | "click" | "cash") => void;
  todayStr: string;
  isUnlocked: boolean;
  onUnlock: () => void;
  onLock: () => void;
}

type Period = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

export default function PortfolioModule({
  payments,
  onRefresh,
  onOpenSpontaneousModal,
  onDeletePayment,
  playSound,
  todayStr,
  isUnlocked,
  onUnlock,
  onLock,
}: PortfolioModuleProps) {
  const [period, setPeriod] = useState<Period>("1W");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "bar" | "karte">("all");

  // Zeitraum & Filter aus localStorage laden (Persistenz bei Reload)
  useEffect(() => {
    try {
      const savedPeriod = localStorage.getItem("gmcutz_portfolio_period") as Period | null;
      if (savedPeriod && ["1D", "1W", "1M", "3M", "1Y", "ALL"].includes(savedPeriod)) {
        setPeriod(savedPeriod);
      }
      const savedFilter = localStorage.getItem("gmcutz_portfolio_filter") as "all" | "bar" | "karte" | null;
      if (savedFilter && ["all", "bar", "karte"].includes(savedFilter)) {
        setPaymentFilter(savedFilter);
      }
    } catch {}
  }, []);

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
    setHoveredPoint(null);
    try {
      localStorage.setItem("gmcutz_portfolio_period", newPeriod);
    } catch {}
  };

  const handlePaymentFilterChange = (newFilter: "all" | "bar" | "karte") => {
    setPaymentFilter(newFilter);
    try {
      localStorage.setItem("gmcutz_portfolio_filter", newFilter);
    } catch {}
  };

  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    fullDate: string;
    amount: number;
    count: number;
    x: number;
    y: number;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // === 1. DATEN-FILTERUNG NACH ZEITRAUM ===
  const { currentPayments, previousPayments, periodLabel, daysCount } = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    let days = 7;
    let label = "Diese Woche";

    if (period === "1D") {
      days = 1;
      label = "Heute";
    } else if (period === "1W") {
      days = 7;
      label = "Letzte 7 Tage";
    } else if (period === "1M") {
      days = 30;
      label = "Letzte 30 Tage";
    } else if (period === "3M") {
      days = 90;
      label = "Letzte 3 Monate";
    } else if (period === "1Y") {
      days = 365;
      label = "Letztes Jahr";
    } else if (period === "ALL") {
      days = 3650;
      label = "Gesamte Historie";
    }

    const currentStartDate = new Date(now);
    currentStartDate.setDate(now.getDate() - days + 1);
    currentStartDate.setHours(0, 0, 0, 0);

    const prevStartDate = new Date(currentStartDate);
    prevStartDate.setDate(currentStartDate.getDate() - days);
    prevStartDate.setHours(0, 0, 0, 0);

    const prevEndDate = new Date(currentStartDate);
    prevEndDate.setMilliseconds(-1);

    const parsePaymentDate = (p: PaymentRecord) => {
      // Datum im Format YYYY-MM-DD
      const parts = p.date.split("-").map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]);
    };

    const current = payments.filter((p) => {
      const d = parsePaymentDate(p);
      return d >= currentStartDate && d <= now;
    });

    const previous = payments.filter((p) => {
      const d = parsePaymentDate(p);
      return d >= prevStartDate && d <= prevEndDate;
    });

    return {
      currentPayments: current,
      previousPayments: previous,
      periodLabel: label,
      daysCount: days,
    };
  }, [payments, period]);

  // === 2. KENNZAHLEN (METRIKEN) ===
  const metrics = useMemo(() => {
    const totalCurrent = currentPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPrev = previousPayments.reduce((sum, p) => sum + p.amount, 0);

    const barCurrent = currentPayments
      .filter((p) => p.paymentMethod === "bar")
      .reduce((sum, p) => sum + p.amount, 0);

    const karteCurrent = currentPayments
      .filter((p) => p.paymentMethod === "karte")
      .reduce((sum, p) => sum + p.amount, 0);

    const count = currentPayments.length;
    const avgTicket = count > 0 ? totalCurrent / count : 0;

    // Rendite / Differenz
    const diff = totalCurrent - totalPrev;
    const percentChange =
      totalPrev > 0 ? (diff / totalPrev) * 100 : totalCurrent > 0 ? 100 : 0;

    // Tagesziel (z.B. 350 € für heute)
    const todayPayments = payments.filter((p) => p.date === todayStr);
    const todayRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0);
    const todayTarget = 350;
    const targetProgress = Math.min(100, Math.round((todayRevenue / todayTarget) * 100));

    // Top Service Assets (Umsatzbringer)
    const serviceMap: { [key: string]: { amount: number; count: number } } = {};
    currentPayments.forEach((p) => {
      const s = p.service || "Unbekannter Schnitt";
      if (!serviceMap[s]) serviceMap[s] = { amount: 0, count: 0 };
      serviceMap[s].amount += p.amount;
      serviceMap[s].count += 1;
    });

    const topServices = Object.entries(serviceMap)
      .map(([name, val]) => ({
        name,
        amount: val.amount,
        count: val.count,
        percent: totalCurrent > 0 ? Math.round((val.amount / totalCurrent) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      totalRevenue: totalCurrent,
      totalPrev,
      diff,
      percentChange,
      barCurrent,
      karteCurrent,
      count,
      avgTicket,
      todayRevenue,
      todayTarget,
      targetProgress,
      topServices,
    };
  }, [currentPayments, previousPayments, payments, todayStr]);

  // === 3. CHART DATAPOINTS BERECHNUNG ===
  const chartData = useMemo(() => {
    const points: Array<{ label: string; fullDate: string; amount: number; count: number }> = [];

    if (period === "1D") {
      // Für 1 Tag: Stundenbasierte Aufschlüsselung von 10:00 bis 21:00
      const hours = [
        "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00",
        "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
      ];
      const todayList = payments.filter((p) => p.date === todayStr);

      hours.forEach((h) => {
        const hourNum = parseInt(h.split(":")[0], 10);
        const matching = todayList.filter((p) => {
          const pHour = parseInt(p.time.split(":")[0] || "0", 10);
          return pHour === hourNum;
        });
        const amt = matching.reduce((s, p) => s + p.amount, 0);
        points.push({
          label: h,
          fullDate: `Heute ${h}`,
          amount: amt,
          count: matching.length,
        });
      });
    } else {
      // Für Tage (z.B. 7 Tage, 30 Tage)
      const countDays = Math.min(daysCount, 30);
      const today = new Date();

      for (let i = countDays - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dayNum = String(d.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${dayNum}`;

        const dayName = d.toLocaleDateString("de-DE", {
          weekday: countDays <= 7 ? "short" : undefined,
          day: "2-digit",
          month: countDays > 7 ? "short" : undefined,
        });

        const matching = payments.filter((p) => p.date === dateStr);
        const amt = matching.reduce((s, p) => s + p.amount, 0);

        points.push({
          label: dayName,
          fullDate: d.toLocaleDateString("de-DE", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          }),
          amount: amt,
          count: matching.length,
        });
      }
    }

    return points;
  }, [period, payments, todayStr, daysCount]);

  // === 4. SVG PATH GENERIERUNG (Glatter Bezier-Chart) ===
  const { pathD, areaD, pointsWithCoords } = useMemo(() => {
    if (chartData.length === 0) {
      return { pathD: "", areaD: "", pointsWithCoords: [] };
    }

    const svgWidth = 800;
    const svgHeight = 220;
    const paddingX = 40;
    const paddingTop = 25;
    const paddingBottom = 35;

    const amounts = chartData.map((p) => p.amount);
    const maxVal = Math.max(...amounts, 50); // Mindestens 50€ als Skala
    const minVal = 0;

    const usableWidth = svgWidth - paddingX * 2;
    const usableHeight = svgHeight - paddingTop - paddingBottom;

    const coords = chartData.map((p, idx) => {
      const x = paddingX + (idx / Math.max(chartData.length - 1, 1)) * usableWidth;
      const normalizedY = (p.amount - minVal) / (maxVal - minVal);
      const y = paddingTop + usableHeight - normalizedY * usableHeight;
      return { ...p, x, y };
    });

    if (coords.length === 1) {
      const p = coords[0];
      return {
        pathD: `M ${paddingX} ${p.y} L ${svgWidth - paddingX} ${p.y}`,
        areaD: `M ${paddingX} ${p.y} L ${svgWidth - paddingX} ${p.y} L ${svgWidth - paddingX} ${svgHeight - paddingBottom} L ${paddingX} ${svgHeight - paddingBottom} Z`,
        pointsWithCoords: coords,
      };
    }

    // Bezier Curve
    let path = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cp1x = curr.x + (next.x - curr.x) * 0.45;
      const cp1y = curr.y;
      const cp2x = curr.x + (next.x - curr.x) * 0.55;
      const cp2y = next.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }

    const last = coords[coords.length - 1];
    const first = coords[0];
    const bottomY = svgHeight - paddingBottom;
    const area = `${path} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;

    return { pathD: path, areaD: area, pointsWithCoords: coords };
  }, [chartData]);

  // Scrubbing / Hover Interaction
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || pointsWithCoords.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 800;

    // Finde nächsten Punkt
    let closest = pointsWithCoords[0];
    let minDiff = Math.abs(closest.x - mouseX);

    for (const pt of pointsWithCoords) {
      const diff = Math.abs(pt.x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }

    setHoveredPoint(closest);
  };

  const handleSvgTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current || pointsWithCoords.length === 0 || !e.touches[0]) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.touches[0].clientX - rect.left) / rect.width) * 800;

    let closest = pointsWithCoords[0];
    let minDiff = Math.abs(closest.x - mouseX);

    for (const pt of pointsWithCoords) {
      const diff = Math.abs(pt.x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }

    setHoveredPoint(closest);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Möchtest du diese Einnahme wirklich aus dem Kassenbuch löschen?")) {
      return;
    }
    setDeletingId(id);
    try {
      await onDeletePayment(id);
      playSound?.("click");
    } finally {
      setDeletingId(null);
    }
  };

  // Gefilterte Zahlungsliste
  const filteredPayments = useMemo(() => {
    let list = currentPayments;
    if (paymentFilter === "bar") list = list.filter((p) => p.paymentMethod === "bar");
    if (paymentFilter === "karte") list = list.filter((p) => p.paymentMethod === "karte");
    return list;
  }, [currentPayments, paymentFilter]);

  // Angezeigter Wert oben (ändert sich dynamisch beim Drüberwischen wie bei Apple Stocks / Trade Republic)
  const displayRevenue = hoveredPoint ? hoveredPoint.amount : metrics.totalRevenue;
  const isPositive = metrics.diff >= 0;

  if (!isUnlocked) {
    return (
      <div className="space-y-6">
        <KassenPinPad
          mode="card"
          title="Kassen-Tresor & Finanzen"
          subtitle="Erhöhter Sicherheitsbereich · Bitte 4-stelligen Kassen-PIN eingeben"
          onSuccess={onUnlock}
          playSound={playSound}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 pb-20 sm:pb-8">
      {/* ========================================================================= */}
      {/* 1. TOP CONTROL BAR & AKTIONEN                                            */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#e8ba84] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#e8ba84]" />
              GMCUTZ TRADING DESK
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Kasse (Autorisiert)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
            Kassen-Portfolio & Performance
          </h2>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              onRefresh();
              playSound?.("click");
            }}
            className="h-10 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            onClick={() => {
              onLock();
              playSound?.("click");
            }}
            className="h-10 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
            title="Kassen-Portfolio jetzt sperren"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sperren</span>
          </button>

          <button
            onClick={() => {
              onOpenSpontaneousModal();
              playSound?.("click");
            }}
            className="flex-1 sm:flex-initial h-10 px-4 rounded-xl bg-gradient-to-r from-[#e8ba84] to-[#c99756] hover:brightness-110 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#e8ba84]/15 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Einnahme buchen</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. HERO AKTIE / DEPOT HEADER (TRADE REPUBLIC STYLE)                      */}
      {/* ========================================================================= */}
      <div className="website-card rounded-3xl p-5 sm:p-7 border border-[#e8ba84]/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-b from-[#e8ba84]/10 to-transparent blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4 relative z-10">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <span>{hoveredPoint ? "Umsatz an diesem Tag" : `Gesamtumsatz (${periodLabel})`}</span>
              {hoveredPoint && (
                <span className="text-[#e8ba84] font-bold text-xs">
                  • {hoveredPoint.fullDate}
                </span>
              )}
            </div>

            {/* Große Zahl wie Trade Republic */}
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl sm:text-5xl lg:text-6xl font-black text-white font-mono tracking-tight">
                {displayRevenue.toLocaleString("de-DE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#e8ba84]">€</span>
            </div>

            {/* Rendite-Pille / Ticker */}
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black border ${
                  isPositive
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                }`}
              >
                {isPositive ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-rose-400" />
                )}
                <span>
                  {isPositive ? "+" : ""}
                  {metrics.percentChange.toFixed(1)}% ({metrics.diff >= 0 ? "+" : ""}
                  {metrics.diff.toFixed(2)} €)
                </span>
              </span>

              <span className="text-xs text-zinc-400">
                vs. Vorperiode ({metrics.totalPrev.toFixed(2)} €)
              </span>
            </div>
          </div>

          {/* Zeitraum Buttons: [ 1T ] [ 1W ] [ 1M ] [ 3M ] [ 1J ] [ GESAMT ] */}
          <div className="flex items-center gap-1 bg-[#121218] p-1.5 rounded-2xl border border-white/10 self-start sm:self-auto">
            {(["1D", "1W", "1M", "3M", "1Y", "ALL"] as Period[]).map((p) => {
              const active = period === p;
              const labels: Record<Period, string> = {
                "1D": "1T",
                "1W": "1W",
                "1M": "1M",
                "3M": "3M",
                "1Y": "1J",
                ALL: "MAX",
              };
              return (
                <button
                  key={p}
                  onClick={() => {
                    handlePeriodChange(p);
                    playSound?.("click");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    active
                      ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-black shadow-md shadow-[#e8ba84]/20 scale-105"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. INTERAKTIVER SVG AKTIEN-CHART                                         */}
        {/* ========================================================================= */}
        <div className="relative mt-2 pt-2">
          <div className="h-56 sm:h-64 w-full relative">
            <svg
              ref={svgRef}
              viewBox="0 0 800 220"
              preserveAspectRatio="none"
              onMouseMove={handleSvgMouseMove}
              onTouchMove={handleSvgTouchMove}
              onMouseLeave={() => setHoveredPoint(null)}
              onTouchEnd={() => setHoveredPoint(null)}
              className="w-full h-full cursor-crosshair overflow-visible"
            >
              <defs>
                <linearGradient id="goldAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e8ba84" stopOpacity="0.35" />
                  <stop offset="60%" stopColor="#c99756" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#0d0d12" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#e8ba84" />
                  <stop offset="50%" stopColor="#ffd8a8" />
                  <stop offset="100%" stopColor="#c99756" />
                </linearGradient>

                <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Horizontale Hilfslinien */}
              <line x1="40" y1="50" x2="760" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1="40" y1="110" x2="760" y2="110" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1="40" y1="170" x2="760" y2="170" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

              {/* Farbverlauf unter der Kurve */}
              {areaD && (
                <path d={areaD} fill="url(#goldAreaGrad)" />
              )}

              {/* Die eigentliche Aktien-Kurve */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="url(#lineGrad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glowEffect)"
                />
              )}

              {/* Datenpunkte auf der Kurve */}
              {pointsWithCoords.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredPoint && hoveredPoint.x === pt.x ? "6" : "3.5"}
                  fill={hoveredPoint && hoveredPoint.x === pt.x ? "#ffffff" : "#e8ba84"}
                  stroke="#0d0d12"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />
              ))}

              {/* Interaktiver Crosshair Cursor beim Scrubben */}
              {hoveredPoint && (
                <g>
                  {/* Vertikale Linie */}
                  <line
                    x1={hoveredPoint.x}
                    y1="25"
                    x2={hoveredPoint.x}
                    y2="185"
                    stroke="#e8ba84"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.8"
                  />
                  {/* Pulsierender Punkt */}
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r="8"
                    fill="#e8ba84"
                    opacity="0.3"
                    className="animate-ping"
                  />
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r="5"
                    fill="#ffffff"
                    stroke="#e8ba84"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>

            {/* X-Achsen Beschriftung */}
            <div className="flex justify-between px-6 text-[10px] font-bold text-zinc-500 mt-2 font-mono">
              {pointsWithCoords.length > 0 && (
                <>
                  <span>{pointsWithCoords[0].label}</span>
                  {pointsWithCoords.length > 2 && (
                    <span>{pointsWithCoords[Math.floor(pointsWithCoords.length / 2)].label}</span>
                  )}
                  <span>{pointsWithCoords[pointsWithCoords.length - 1].label}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. WALL STREET KPIS & DEPOT-KACHELN                                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Kachel 1: Bar in der Kasse */}
        <div className="website-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-emerald-400" />
              Bar-Kasse
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {metrics.totalRevenue > 0
                ? `${Math.round((metrics.barCurrent / metrics.totalRevenue) * 100)}%`
                : "0%"}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {metrics.barCurrent.toFixed(2)} €
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Physisch im Laden</div>
        </div>

        {/* Kachel 2: Kartenzahlung / PayPal */}
        <div className="website-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-sky-400" />
              Karte / PayPal
            </span>
            <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
              {metrics.totalRevenue > 0
                ? `${Math.round((metrics.karteCurrent / metrics.totalRevenue) * 100)}%`
                : "0%"}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {metrics.karteCurrent.toFixed(2)} €
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Bankkonto / Digital</div>
        </div>

        {/* Kachel 3: Ø Bon / Haarschnitt */}
        <div className="website-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-[#e8ba84]" />
              Ø Bon pro Cut
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {metrics.avgTicket.toFixed(2)} €
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            {metrics.count} Kunden im Zeitraum
          </div>
        </div>

        {/* Kachel 4: Tagesziel-Fortschritt */}
        <div className="website-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#e8ba84]/30 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#e8ba84]">
              <Target className="w-4 h-4 text-[#e8ba84]" />
              Tagesziel (350 €)
            </span>
            <span className="text-xs font-black text-[#e8ba84]">{metrics.targetProgress}%</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {metrics.todayRevenue.toFixed(2)} €
          </div>
          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-white/10 mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#e8ba84] to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${metrics.targetProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. TOP PERFORMER ASSETS (DIE BESTEN SCHNITTE IM DEPOT)                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="website-card rounded-3xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-[#e8ba84]" />
              Top Cuts im Depot
            </h3>
            <span className="text-[10px] text-zinc-500 font-bold">Nach Umsatz</span>
          </div>

          {metrics.topServices.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              Noch keine Buchungen im gewählten Zeitraum.
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.topServices.map((srv, idx) => (
                <div key={srv.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span className="text-[#e8ba84] font-black">{idx + 1}.</span>
                      <span className="truncate max-w-[170px]">{srv.name}</span>
                    </span>
                    <span className="font-mono font-bold text-[#e8ba84]">
                      {srv.amount.toFixed(2)} €
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden flex">
                    <div
                      className="bg-gradient-to-r from-[#e8ba84] to-[#c99756] h-full rounded-full"
                      style={{ width: `${srv.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>{srv.count}x geschnitten</span>
                    <span>{srv.percent}% vom Depot</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 6. TRANSAKTIONS-JOURNAL (KASSENBUCH HISTORIE)                            */}
        {/* ========================================================================= */}
        <div className="lg:col-span-2 website-card rounded-3xl p-5 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#e8ba84]" />
                Kassen-Journal ({filteredPayments.length} Buchungen)
              </h3>
              <p className="text-xs text-zinc-400">
                Lückenlose Dokumentation aller Einnahmen
              </p>
            </div>

            {/* Filter: Alle / Bar / Karte */}
            <div className="flex items-center gap-1 bg-[#121218] p-1 rounded-xl border border-white/10 self-start sm:self-auto">
              <button
                onClick={() => handlePaymentFilterChange("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  paymentFilter === "all"
                    ? "bg-[#e8ba84] text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Alle
              </button>
              <button
                onClick={() => handlePaymentFilterChange("bar")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  paymentFilter === "bar"
                    ? "bg-emerald-500 text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                💵 Nur Bar
              </button>
              <button
                onClick={() => handlePaymentFilterChange("karte")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  paymentFilter === "karte"
                    ? "bg-sky-500 text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                💳 Nur Karte
              </button>
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              Keine Einnahmen für den ausgewählten Filter gefunden.
            </div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {filteredPayments.map((p) => (
                <div
                  key={p.id}
                  className="p-3 sm:p-3.5 rounded-2xl bg-[#121218] border border-white/5 hover:border-white/10 flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        p.paymentMethod === "bar"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-sky-500/15 text-sky-400"
                      }`}
                    >
                      {p.paymentMethod === "bar" ? (
                        <Banknote className="w-4 h-4" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-white truncate">
                          {p.clientName}
                        </span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase ${
                            p.paymentMethod === "bar"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-sky-500/20 text-sky-300"
                          }`}
                        >
                          {p.paymentMethod === "bar" ? "Bar" : "Karte"}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {p.service} • {p.date} um {p.time} Uhr
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                      +{p.amount.toFixed(2)} €
                    </span>

                    <button
                      title="Aus Kassenbuch löschen (Storno)"
                      disabled={deletingId === p.id}
                      onClick={() => handleDelete(p.id)}
                      className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
