"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Scissors,
  Clock,
  Calendar as CalendarIcon,
  Phone,
  MessageCircle,
  RefreshCw,
  Plus,
  Search,
  Sparkles,
  Volume2,
  VolumeX,
  Trash2,
  Check,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  Coffee,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  CalendarDays,
  Users,
  CheckCircle2,
  X,
  UserCheck,
  Clock3,
  CalendarRange,
  Layers,
  ArrowUpRight,
  Lock,
  Unlock,
  Key,
  Eye,
  EyeOff,
  LogOut,
  Edit3,
  Save,
  FastForward,
  Timer,
  AlertTriangle,
  CalendarCheck,
} from "lucide-react";

export type BookingStatus = "confirmed" | "cancelled" | "completed" | "in_progress" | "blocked";

interface Booking {
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

// GMCUTZ Service Katalog (Fokus auf Handwerk & Zeitbedarf)
const SERVICE_CATALOG: { name: string; duration: string; durationMinutes: number }[] = [
  { name: "Skin Fade (Seiten auf 0)", duration: "45 Min", durationMinutes: 45 },
  { name: "Low / Mid / High Taper Fade", duration: "45 Min", durationMinutes: 45 },
  { name: "Burst Fade & Crop", duration: "45 Min", durationMinutes: 45 },
  { name: "Signature Haircut & Finish", duration: "50 Min", durationMinutes: 50 },
  { name: "Klassischer Herrenhaarschnitt", duration: "35 Min", durationMinutes: 35 },
  { name: "Dauerwelle / Perm Treatment", duration: "90 Min", durationMinutes: 90 },
  { name: "Strähnen / Highlights", duration: "75 Min", durationMinutes: 75 },
];

const ADDON_CATALOG: { name: string; duration: string; durationMinutes: number }[] = [
  { name: "Bartrasur & Konturen mit Heißkompresse", duration: "20 Min", durationMinutes: 20 },
  { name: "Black Mask Tiefenreinigung", duration: "15 Min", durationMinutes: 15 },
  { name: "Augenbrauen zupfen / Formen", duration: "10 Min", durationMinutes: 10 },
  { name: "Haarwäsche & Kopfmassage", duration: "10 Min", durationMinutes: 10 },
  { name: "Tressa Texture Spray Finish", duration: "5 Min", durationMinutes: 5 },
];

const STANDARD_STUDIO_SLOTS = [
  "10:00",
  "10:45",
  "11:30",
  "12:15",
  "13:00",
  "13:45",
  "14:30",
  "15:15",
  "16:00",
  "16:45",
  "17:30",
  "18:15",
  "19:00",
  "19:45",
  "20:30",
];

function getServiceDuration(serviceName: string, addonsList: string[] = []): string {
  const matchService = SERVICE_CATALOG.find(
    (s) => s.name.toLowerCase() === serviceName.toLowerCase() || serviceName.toLowerCase().includes(s.name.toLowerCase())
  );
  let totalMin = matchService ? matchService.durationMinutes : 45;

  addonsList.forEach((a) => {
    const matchAddon = ADDON_CATALOG.find(
      (ad) => ad.name.toLowerCase() === a.toLowerCase() || a.toLowerCase().includes(ad.name.toLowerCase())
    );
    if (matchAddon) totalMin += matchAddon.durationMinutes;
  });

  return `${totalMin} Min`;
}

export default function GioModularStudio() {
  // === AUTHENTIFIZIERUNG: MASTER-PASSWORT ===
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState<boolean>(false);

  // === BUCHUNGSDATEN & STATUS ===
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // === SALON STATUS STEUERUNG ===
  const [studioStatus, setStudioStatus] = useState<"open" | "pause" | "closed">("open");

  // === ANWENDUNGS-MODULE ===
  const [activeModule, setActiveModule] = useState<"dashboard" | "calendar" | "clients">("dashboard");

  // Dashboard Wochen-Filter ("all" = ganze Woche, oder ein bestimmtes Datum)
  const [dashboardDayFilter, setDashboardDayFilter] = useState<string>("all");

  // Kalender-Ansicht: Monat / Tag
  const [calendarView, setCalendarView] = useState<"month" | "day">("month");
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(new Date());
  const [selectedDayForDetails, setSelectedDayForDetails] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  // Filter & Suche
  const [searchQuery, setSearchQuery] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [clientStatusFilter, setClientStatusFilter] = useState<"all" | "active" | "completed">("active");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // === DETAIL-DRAWER / MODAL FÜR EINEN KUNDENTERMIN ===
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<Booking | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState<boolean>(false);
  const [detailActionSuccess, setDetailActionSuccess] = useState<string | null>(null);

  // Modal für neue Termine & Pausen
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"customer" | "pause">("customer");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [newBooking, setNewBooking] = useState({
    name: "",
    phone: "",
    service: SERVICE_CATALOG[0].name,
    addons: [] as string[],
    date: "",
    time: "15:00",
    notes: "",
  });

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const previousBookingsRef = useRef<Booking[]>([]);
  const [cleaningUp, setCleaningUp] = useState(false);

  // Sound Effekte
  const playSound = (type: "chime" | "success" | "click" = "click") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === "chime") {
        const notes = [587.33, 880];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
          gain.gain.setValueAtTime(0.0001, ctx.currentTime + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + idx * 0.12 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.12);
          osc.stop(ctx.currentTime + idx * 0.12 + 0.55);
        });
      } else if (type === "success") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {}
  };

  // Auth Status beim Laden prüfen (Persistenz)
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem("gmcutz_terminal_auth");
      if (savedAuth === "true") {
        setIsAuthenticated(true);
      }
    } catch {}
    setAuthLoading(false);
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError("Bitte Master-Passwort eingeben");
      return;
    }
    setIsVerifyingAuth(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        localStorage.setItem("gmcutz_terminal_auth", "true");
        playSound("success");
      } else {
        setAuthError(data.error || "Ungültiges Master-Passwort");
      }
    } catch (err) {
      setAuthError("Netzwerkfehler beim Anmelden");
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("gmcutz_terminal_auth");
    } catch {}
    setIsAuthenticated(false);
    setPasswordInput("");
    playSound("click");
  };

  // Live Timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Buchungen laden
  const fetchBookings = async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
      playSound("click");
    }
    try {
      const res = await fetch("/api/bookings", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.bookings)) {
        if (previousBookingsRef.current.length > 0 && data.bookings.length > previousBookingsRef.current.length) {
          const newest = data.bookings[data.bookings.length - 1];
          setNotification(`Neuer Online-Termin: ${newest.name} (${newest.date}, ${newest.time} Uhr)`);
          playSound("chime");
        }
        previousBookingsRef.current = data.bookings;
        setBookings(data.bookings);

        if (selectedBookingForDetail) {
          const updated = data.bookings.find((b: Booking) => b.id === selectedBookingForDetail.id);
          if (updated) setSelectedBookingForDetail(updated);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
      const poll = setInterval(fetchBookings, 8000);
      return () => clearInterval(poll);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 7000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Formatiertes Heute
  const todayStr = useMemo(() => {
    const y = currentTime.getFullYear();
    const m = String(currentTime.getMonth() + 1).padStart(2, "0");
    const d = String(currentTime.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [currentTime]);

  // Status-Änderung eines Termins
  const handleStatusChange = async (id: string, status: BookingStatus) => {
    setUpdatingId(id);
    playSound("click");
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
        if (selectedBookingForDetail && selectedBookingForDetail.id === id) {
          setSelectedBookingForDetail((prev) => (prev ? { ...prev, status } : null));
        }
        playSound("success");
      }
    } catch (err) {
      console.error("Fehler beim Status-Update:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Termin-Verschiebung um X Minuten (+15 oder +30 Min)
  const handleShiftAppointmentTime = async (id: string, minutes: number) => {
    const targetBooking = bookings.find((b) => b.id === id);
    if (!targetBooking) return;

    const [h, m] = targetBooking.time.split(":").map(Number);
    const dateObj = new Date();
    dateObj.setHours(h, m + minutes, 0);
    const newTime = `${String(dateObj.getHours()).padStart(2, "0")}:${String(dateObj.getMinutes()).padStart(2, "0")}`;

    setUpdatingId(id);
    playSound("click");
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time: newTime }),
      });
      const data = await res.json();
      if (data.success) {
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, time: newTime } : b)));
        if (selectedBookingForDetail && selectedBookingForDetail.id === id) {
          setSelectedBookingForDetail((prev) => (prev ? { ...prev, time: newTime } : null));
        }
        setDetailActionSuccess(`Uhrzeit auf ${newTime} Uhr verschoben!`);
        setTimeout(() => setDetailActionSuccess(null), 3500);
        playSound("success");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Interne Barber-Notiz speichern
  const handleSaveNotes = async () => {
    if (!selectedBookingForDetail) return;
    setSavingNotes(true);
    playSound("click");
    try {
      const res = await fetch(`/api/bookings/${selectedBookingForDetail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: editingNotes }),
      });
      const data = await res.json();
      if (data.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === selectedBookingForDetail.id ? { ...b, notes: editingNotes } : b))
        );
        setSelectedBookingForDetail((prev) => (prev ? { ...prev, notes: editingNotes } : null));
        setDetailActionSuccess("Barber-Notiz gespeichert!");
        setTimeout(() => setDetailActionSuccess(null), 3000);
        playSound("success");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotes(false);
    }
  };

  // Termin löschen
  const handleDeleteBooking = async (id: string) => {
    if (!window.confirm("Diesen Termin wirklich unwiderruflich löschen?")) return;
    setUpdatingId(id);
    playSound("click");
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
        if (selectedBookingForDetail?.id === id) {
          setSelectedBookingForDetail(null);
        }
        playSound("success");
      }
    } catch (err) {
      console.error("Fehler beim Löschen:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Manuelle Bereinigung alter Termine (> 5 Tage)
  const handleManualCleanup = async () => {
    setCleaningUp(true);
    playSound("click");
    try {
      const res = await fetch("/api/bookings/cleanup", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setNotification(
          data.deletedCount > 0
            ? `${data.deletedCount} alte Termine (> 5 Tage) wurden automatisch gelöscht!`
            : "Keine alten Termine älter als 5 Tage vorhanden. Datenbank ist sauber!"
        );
        fetchBookings();
        playSound("success");
      }
    } catch (err) {
      console.error("Fehler bei der Bereinigung:", err);
    } finally {
      setCleaningUp(false);
    }
  };

  // Spontane Sofort-Pause über 30 Min blockieren
  const handleQuickPause = async (minutes: number = 30) => {
    const now = new Date();
    const currentH = String(now.getHours()).padStart(2, "0");
    const currentM = String(now.getMinutes()).padStart(2, "0");
    const pauseTime = `${currentH}:${currentM}`;

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "PAUSE / STUDIO GESPERRT",
          phone: "0000000000",
          service: `Pause (${minutes} Min)`,
          addons: [],
          date: todayStr,
          time: pauseTime,
          notes: "Spontane Pause im Salon",
          status: "blocked",
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBookings();
        playSound("success");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // WhatsApp Vorlage generieren
  const getWhatsAppUrl = (phone: string, name: string, date: string, time: string, service?: string) => {
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) clean = "49" + clean.substring(1);
    const text = encodeURIComponent(
      `Hallo ${name}! 👋\nDein Termin bei GM-Cutz steht für ${date} um ${time} Uhr an (${service || "Haarschnitt"}).\nBis gleich im Studio! 💈`
    );
    return `https://wa.me/${clean}?text=${text}`;
  };

  const getWhatsAppDelayNoticeUrl = (phone: string, name: string, minutes: number = 15) => {
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) clean = "49" + clean.substring(1);
    const text = encodeURIComponent(
      `Hallo ${name}! 👋\nKurze Info aus dem GM-Cutz Studio: Wir haben aktuell eine kleine Verzögerung von ca. ${minutes} Minuten. Du kannst ganz entspannt etwas später kommen. Danke für dein Verständnis! 💈`
    );
    return `https://wa.me/${clean}?text=${text}`;
  };

  // Metriken & Terminübersicht für Heute
  const todayMetrics = useMemo(() => {
    const todayBookings = bookings.filter((b) => b.date === todayStr);
    const activeClients = todayBookings.filter((b) => b.status !== "cancelled" && b.status !== "blocked");
    const completedCount = todayBookings.filter((b) => b.status === "completed").length;
    const inProgressBooking = todayBookings.find((b) => b.status === "in_progress");

    const pending = todayBookings
      .filter((b) => b.status === "confirmed")
      .sort((a, b) => a.time.localeCompare(b.time));
    const nextUpcoming = pending[0] || null;

    let totalMinutesToday = 0;
    activeClients.forEach((b) => {
      const match = SERVICE_CATALOG.find((s) => s.name.toLowerCase() === b.service.toLowerCase());
      totalMinutesToday += match ? match.durationMinutes : 45;
    });

    const hours = Math.floor(totalMinutesToday / 60);
    const mins = totalMinutesToday % 60;
    const treatmentTimeFormatted = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ""}` : `${mins}m`;

    return {
      todayBookings,
      totalClients: activeClients.length,
      completedCount,
      inProgressBooking,
      nextUpcoming,
      treatmentTimeFormatted,
      openCount: pending.length,
    };
  }, [bookings, todayStr]);

  // Berechnung der ganzen aktuellen Woche fürs Dashboard
  const currentWeekDays = useMemo(() => {
    const now = new Date(currentTime);
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const days: {
      dateStr: string;
      dayName: string;
      dayFullDate: string;
      dayNumber: number;
      isToday: boolean;
      bookings: Booking[];
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${day}`;

      const dayBookings = bookings
        .filter((b) => b.date === dateStr && b.status !== "cancelled")
        .sort((a, b) => a.time.localeCompare(b.time));

      const dayName = d.toLocaleDateString("de-DE", { weekday: "short" });
      const dayFullDate = d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" });
      const isToday = dateStr === todayStr;

      days.push({
        dateStr,
        dayName,
        dayFullDate,
        dayNumber: d.getDate(),
        isToday,
        bookings: dayBookings,
      });
    }

    return days;
  }, [currentTime, bookings, todayStr]);

  const totalWeekAppointmentsCount = useMemo(() => {
    return currentWeekDays.reduce((acc, day) => acc + day.bookings.filter((b) => b.status !== "blocked").length, 0);
  }, [currentWeekDays]);

  // Kalender-Berechnungen (Monatskacheln)
  const calendarMonthData = useMemo(() => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDay.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const totalDays = lastDay.getDate();
    const tiles: {
      dayNumber: number | null;
      dateStr: string | null;
      isToday: boolean;
      bookings: Booking[];
      hasInProgress: boolean;
    }[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      tiles.push({ dayNumber: null, dateStr: null, isToday: false, bookings: [], hasInProgress: false });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayBookings = bookings
        .filter((b) => b.date === dateStr && b.status !== "cancelled")
        .sort((a, b) => a.time.localeCompare(b.time));
      const isToday = dateStr === todayStr;
      const hasInProgress = dayBookings.some((b) => b.status === "in_progress");

      tiles.push({
        dayNumber: d,
        dateStr,
        isToday,
        bookings: dayBookings,
        hasInProgress,
      });
    }

    return {
      year,
      monthName: currentCalendarMonth.toLocaleDateString("de-DE", { month: "long" }),
      tiles,
    };
  }, [currentCalendarMonth, bookings, todayStr]);

  const selectedDayDetails = useMemo(() => {
    const dayBookings = bookings
      .filter((b) => b.date === selectedDayForDetails && b.status !== "cancelled")
      .sort((a, b) => a.time.localeCompare(b.time));
    return {
      dateStr: selectedDayForDetails,
      bookings: dayBookings,
      totalClients: dayBookings.filter((b) => b.status !== "blocked").length,
    };
  }, [bookings, selectedDayForDetails]);

  const filteredBookingsList = useMemo(() => {
    return bookings
      .filter((b) => {
        if (clientStatusFilter === "active") {
          return b.status === "confirmed" || b.status === "in_progress";
        }
        if (clientStatusFilter === "completed") {
          return b.status === "completed";
        }
        return true;
      })
      .filter((b) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          b.name.toLowerCase().includes(q) ||
          b.phone.toLowerCase().includes(q) ||
          b.service.toLowerCase().includes(q) ||
          (b.notes && b.notes.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const dateComp = b.date.localeCompare(a.date);
        return dateComp !== 0 ? dateComp : a.time.localeCompare(b.time);
      });
  }, [bookings, clientStatusFilter, searchQuery]);

  const openDetailDrawer = (booking: Booking) => {
    setSelectedBookingForDetail(booking);
    setEditingNotes(booking.notes || "");
    playSound("click");
  };

  // =========================================================================
  // LOGIN SCREEN
  // =========================================================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070708] flex items-center justify-center text-zinc-500 font-mono text-sm">
        <RefreshCw className="w-6 h-6 animate-spin text-[#e8ba84]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#070708] hero-halo flex flex-col items-center justify-center p-4 selection:bg-[#e8ba84] selection:text-black">
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-gradient-to-br from-[#1c1c24] to-[#0e0e11] border border-[#e8ba84]/30 shadow-2xl mx-auto flex items-center justify-center mb-3 sm:mb-4">
              <Scissors className="w-7 h-7 sm:w-8 sm:h-8 text-[#e8ba84]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              GM-CUTZ <span className="gold-gradient-text">TERMINAL</span>
            </h1>
            <p className="text-[10px] sm:text-xs uppercase tracking-widest text-zinc-400 mt-1 font-mono">
              Salon Cockpit • Master Zugang
            </p>
          </div>

          <div className="website-card-active rounded-3xl p-5 sm:p-7 border border-[#e8ba84]/30 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10">
              <div className="p-2 sm:p-2.5 rounded-2xl bg-[#e8ba84]/10 text-[#e8ba84] border border-[#e8ba84]/25">
                <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-white">Sicherheits-Authentifizierung</h2>
                <p className="text-[11px] sm:text-xs text-zinc-400">Master-Passwort eingeben</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                  Master-Passwort
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoFocus
                    placeholder="Passwort..."
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full h-12 sm:h-14 pl-11 sm:pl-12 pr-11 sm:pr-12 rounded-2xl bg-[#09090c] border border-white/15 text-white placeholder-zinc-600 font-mono text-sm sm:text-base focus:outline-none focus:border-[#e8ba84] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifyingAuth}
                className="w-full h-12 sm:h-14 bg-gradient-to-r from-[#e8ba84] to-[#c99756] hover:brightness-110 text-[#070708] font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {isVerifyingAuth ? (
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                ) : (
                  <>
                    <Unlock className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                    <span>Terminal Entsperren</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================================
  // HAUPT-ANWENDUNG (MOBIL-OPTIMIERT)
  // =========================================================================
  return (
    <main className="min-h-screen bg-[#070708] hero-halo text-white flex flex-col md:flex-row font-sans selection:bg-[#e8ba84] selection:text-black">
      
      {/* DESKTOP & IPAD SIDEBAR (Auf Handy ausgeblendet) */}
      <aside className="hidden md:flex md:w-64 bg-[#0a0a0d] border-r border-white/10 flex-col justify-between p-6 shrink-0 z-30">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1c1c24] to-[#0e0e11] border border-[#e8ba84]/30 shadow-lg flex items-center justify-center">
              <Scissors className="w-5 h-5 text-[#e8ba84]" />
            </div>
            <div>
              <h1 className="font-black text-base tracking-tight leading-none text-white">
                GM-CUTZ <span className="text-[#e8ba84]">STUDIO</span>
              </h1>
              <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest mt-1">
                Salon Terminal
              </p>
            </div>
          </div>

          <div className="mb-6 p-4 rounded-2xl bg-[#101014] border border-white/10">
            <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-[#e8ba84]" />
              <span>Studio Zeit</span>
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-white">
              {currentTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">
              {currentTime.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" })}
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => { setActiveModule("dashboard"); playSound("click"); }}
              className={`w-full h-12 rounded-2xl px-4 flex items-center gap-3 text-sm font-bold transition-all ${
                activeModule === "dashboard"
                  ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708] shadow-lg shadow-[#e8ba84]/15"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
              <span>Studio Cockpit</span>
            </button>

            <button
              onClick={() => { setActiveModule("calendar"); playSound("click"); }}
              className={`w-full h-12 rounded-2xl px-4 flex items-center gap-3 text-sm font-bold transition-all ${
                activeModule === "calendar"
                  ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708] shadow-lg shadow-[#e8ba84]/15"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <CalendarDays className="w-5 h-5 flex-shrink-0" />
              <span>Salon Kalender</span>
            </button>

            <button
              onClick={() => { setActiveModule("clients"); playSound("click"); }}
              className={`w-full h-12 rounded-2xl px-4 flex items-center gap-3 text-sm font-bold transition-all ${
                activeModule === "clients"
                  ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708] shadow-lg shadow-[#e8ba84]/15"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-5 h-5 flex-shrink-0" />
              <span>Buchungsbuch</span>
            </button>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/10 space-y-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1.5">
              Betriebsmodus
            </span>
            <div className="grid grid-cols-3 gap-1 bg-[#121216] p-1 rounded-xl border border-white/10">
              <button
                onClick={() => { setStudioStatus("open"); playSound("click"); }}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  studioStatus === "open" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-zinc-400"
                }`}
              >
                Aktiv
              </button>
              <button
                onClick={() => { setStudioStatus("pause"); playSound("click"); }}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  studioStatus === "pause" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-zinc-400"
                }`}
              >
                Pause
              </button>
              <button
                onClick={() => { setStudioStatus("closed"); playSound("click"); }}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  studioStatus === "closed" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "text-zinc-400"
                }`}
              >
                Zu
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 text-xs"
              title="Ton an/aus"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#e8ba84]" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 text-xs"
              title="Vollbild"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs"
              title="Sperren"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* HAUPTINHALT */}
      <section className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen pb-24 md:pb-8">
        
        {/* COMPACT HEADER (Für Handy & Desktop) */}
        <header className="sticky top-0 z-20 bg-[#070708]/95 backdrop-blur-xl border-b border-white/10 px-3.5 sm:px-6 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#1c1c24] border border-[#e8ba84]/30 flex items-center justify-center md:hidden">
              <Scissors className="w-4 h-4 text-[#e8ba84]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  {activeModule === "dashboard" && "Salon Cockpit"}
                  {activeModule === "calendar" && "Terminkalender"}
                  {activeModule === "clients" && "Kundenkartei"}
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  studioStatus === "open" ? "bg-emerald-400 animate-pulse" : studioStatus === "pause" ? "bg-amber-400" : "bg-rose-500"
                }`} />
              </div>
              <div className="text-[10px] text-zinc-400 font-mono hidden xs:block">
                {currentTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr • {bookings.length} Termine
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchBookings(true)}
              disabled={refreshing}
              className="h-9 px-2.5 sm:px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 flex items-center gap-1.5 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#e8ba84]" : ""}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            <button
              onClick={() => {
                setModalMode("customer");
                setNewBooking({
                  name: "",
                  phone: "",
                  service: SERVICE_CATALOG[0].name,
                  addons: [],
                  date: todayStr,
                  time: "15:00",
                  notes: "",
                });
                setIsModalOpen(true);
              }}
              className="h-9 px-3 sm:px-4 bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708] font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span className="text-xs">Termin</span>
            </button>
          </div>
        </header>

        {notification && (
          <div className="mx-3.5 sm:mx-6 md:mx-8 mt-3 p-3 sm:p-4 rounded-2xl bg-[#e8ba84]/15 border border-[#e8ba84]/30 text-[#fff6e8] text-xs sm:text-sm flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#e8ba84] shrink-0" />
              <span className="font-bold">{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-zinc-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-3.5 sm:p-6 md:p-8 space-y-5 sm:space-y-6">

          {/* ========================================================================= */}
          {/* MODUL 1: DASHBOARD (MOBIL OPTIMIERT)                                      */}
          {/* ========================================================================= */}
          {activeModule === "dashboard" && (
            <div className="space-y-5 sm:space-y-6">
              
              {/* KPI Kacheln (Kompakt auf Handy, 2-Spaltig) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <div className="website-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-white/10">
                  <div className="flex items-center justify-between text-zinc-400 mb-0.5">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#e8ba84]">Kunden Heute</span>
                    <Scissors className="w-3.5 h-3.5 text-[#e8ba84]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white">{todayMetrics.totalClients}</div>
                  <div className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">
                    {todayMetrics.completedCount} fertig • {todayMetrics.openCount} offen
                  </div>
                </div>

                <div className="website-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-white/10">
                  <div className="flex items-center justify-between text-zinc-400 mb-0.5">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-400">Arbeitszeit</span>
                    <Clock3 className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                    {todayMetrics.treatmentTimeFormatted}
                  </div>
                  <div className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">
                    Reine Schnittzeit
                  </div>
                </div>

                <div className="website-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-white/10">
                  <div className="flex items-center justify-between text-zinc-400 mb-0.5">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-sky-400">Stuhl-Status</span>
                    <Scissors className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-sky-300">
                    {todayMetrics.inProgressBooking ? "Belegt" : "Frei"}
                  </div>
                  <div className="text-[10px] sm:text-xs text-zinc-400 mt-0.5 truncate">
                    {todayMetrics.inProgressBooking ? todayMetrics.inProgressBooking.name : "Bereit"}
                  </div>
                </div>

                <div className="website-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-white/10">
                  <div className="flex items-center justify-between text-zinc-400 mb-0.5">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-400">Woche Total</span>
                    <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white">
                    {totalWeekAppointmentsCount} Kunden
                  </div>
                  <div className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">Mo - So gebucht</div>
                </div>
              </div>

              {/* GRID: SPOTLIGHT & WOCHENLISTE */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
                
                {/* Spalte Links: STUHL-CONTROLLER & SPOTLIGHT */}
                <div className="lg:col-span-5 space-y-4 sm:space-y-5">
                  
                  {todayMetrics.inProgressBooking ? (
                    <div
                      onClick={() => openDetailDrawer(todayMetrics.inProgressBooking!)}
                      className="website-card-active rounded-3xl p-4 sm:p-6 border border-sky-400/40 shadow-2xl relative overflow-hidden cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs uppercase font-mono tracking-wider text-sky-400 font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                          <span>Aktuell im Stuhl</span>
                        </span>
                        <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-mono font-bold">
                          LIVE
                        </span>
                      </div>

                      <div className="mb-3">
                        <h3 className="text-xl sm:text-2xl font-black text-white">
                          {todayMetrics.inProgressBooking.name}
                        </h3>
                        <p className="text-xs text-zinc-400 font-mono mt-0.5">
                          Termin: {todayMetrics.inProgressBooking.time} Uhr • {getServiceDuration(todayMetrics.inProgressBooking.service, todayMetrics.inProgressBooking.addons)}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#0a0a0e] border border-white/10 mb-3 text-xs">
                        <div className="font-bold text-white">{todayMetrics.inProgressBooking.service}</div>
                        {todayMetrics.inProgressBooking.addons.length > 0 && (
                          <div className="text-[#e8ba84] mt-1 text-[11px]">
                            Extras: {todayMetrics.inProgressBooking.addons.join(", ")}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          disabled={updatingId === todayMetrics.inProgressBooking.id}
                          onClick={() => handleStatusChange(todayMetrics.inProgressBooking!.id, "completed")}
                          className="w-full h-11 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-2xl text-xs font-black flex items-center justify-center gap-2 active:scale-95"
                        >
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Schnitt Fertig • Stuhl Freigeben</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleShiftAppointmentTime(todayMetrics.inProgressBooking!.id, 15)}
                            className="h-9 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95"
                          >
                            <FastForward className="w-3.5 h-3.5" />
                            <span>+15 Min</span>
                          </button>

                          <button
                            onClick={() => openDetailDrawer(todayMetrics.inProgressBooking!)}
                            className="h-9 bg-white/5 text-zinc-300 border border-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#e8ba84]" />
                            <span>Details</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => todayMetrics.nextUpcoming && openDetailDrawer(todayMetrics.nextUpcoming)}
                      className="website-card-active rounded-3xl p-4 sm:p-6 border border-[#e8ba84]/40 shadow-2xl cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#e8ba84] flex items-center gap-1.5">
                          <Scissors className="w-3.5 h-3.5" />
                          <span>Nächster Kunde</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                          Heute
                        </span>
                      </div>

                      {todayMetrics.nextUpcoming ? (
                        <div>
                          <div className="flex items-baseline justify-between mt-1">
                            <h3 className="text-xl sm:text-2xl font-black text-white">
                              {todayMetrics.nextUpcoming.name}
                            </h3>
                            <div className="font-mono text-sm sm:text-base font-bold text-[#e8ba84] bg-black/50 px-2.5 py-0.5 rounded-xl border border-white/10">
                              {todayMetrics.nextUpcoming.time} Uhr
                            </div>
                          </div>

                          <div className="mt-2.5 p-3 rounded-2xl bg-[#0f0f13] border border-white/10 text-xs">
                            <div className="font-bold text-[#fff6e8]">{todayMetrics.nextUpcoming.service}</div>
                            <div className="text-zinc-400 mt-0.5 font-mono text-[11px]">
                              Dauer: {getServiceDuration(todayMetrics.nextUpcoming.service, todayMetrics.nextUpcoming.addons)}
                            </div>
                          </div>

                          <div className="mt-3.5 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              disabled={updatingId === todayMetrics.nextUpcoming.id}
                              onClick={() => handleStatusChange(todayMetrics.nextUpcoming!.id, "in_progress")}
                              className="w-full h-11 bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708] rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 shadow-xl"
                            >
                              <Scissors className="w-4 h-4" />
                              <span>Auf den Stuhl setzen (Start)</span>
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                              <a
                                href={getWhatsAppUrl(
                                  todayMetrics.nextUpcoming.phone,
                                  todayMetrics.nextUpcoming.name,
                                  todayMetrics.nextUpcoming.date,
                                  todayMetrics.nextUpcoming.time,
                                  todayMetrics.nextUpcoming.service
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-9 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                                <span>WhatsApp</span>
                              </a>

                              <button
                                onClick={() => openDetailDrawer(todayMetrics.nextUpcoming!)}
                                className="h-9 bg-white/5 text-zinc-300 border border-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#e8ba84]" />
                                <span>Details</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-zinc-400 text-xs">
                          Keine offenen Kunden für heute.
                        </div>
                      )}
                    </div>
                  )}

                  {/* SCHNELL-AKTIONEN */}
                  <div className="website-card rounded-3xl p-4 sm:p-5 border border-white/10 space-y-2">
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1">Schnell-Aktionen</h4>
                    
                    <button
                      onClick={() => {
                        setModalMode("customer");
                        setNewBooking({
                          name: "Walk-In Kunde",
                          phone: "",
                          service: SERVICE_CATALOG[0].name,
                          addons: [],
                          date: todayStr,
                          time: "16:00",
                          notes: "Spontan vor Ort",
                        });
                        setIsModalOpen(true);
                      }}
                      className="w-full h-10 bg-[#141418] hover:bg-[#1c1c22] border border-white/10 rounded-xl text-xs font-bold px-3.5 flex items-center justify-between text-zinc-200"
                    >
                      <span className="flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-[#e8ba84]" />
                        <span>Walk-In Express Check-in</span>
                      </span>
                      <span className="text-[#e8ba84] font-mono text-[11px]">+ Direkt</span>
                    </button>

                    <button
                      onClick={() => handleQuickPause(30)}
                      className="w-full h-10 bg-[#141418] hover:bg-[#1c1c22] border border-white/10 rounded-xl text-xs font-bold px-3.5 flex items-center justify-between text-zinc-200"
                    >
                      <span className="flex items-center gap-2">
                        <Coffee className="w-3.5 h-3.5 text-amber-400" />
                        <span>30 Min Sofort-Pause sperren</span>
                      </span>
                      <span className="text-amber-400 font-mono text-[11px]">☕ 30m</span>
                    </button>
                  </div>
                </div>

                {/* Spalte Rechts: WOCHEN-ABLAUF */}
                <div className="lg:col-span-7">
                  <div className="website-card rounded-3xl p-4 sm:p-6 border border-white/10 flex flex-col">
                    
                    <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-white/10">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                          <CalendarCheck className="w-4 h-4 text-[#e8ba84]" />
                          <span>Wochenübersicht ({totalWeekAppointmentsCount})</span>
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 bg-[#101014] p-1 rounded-xl border border-white/10">
                        <button
                          onClick={() => { setDashboardDayFilter("all"); playSound("click"); }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            dashboardDayFilter === "all" ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708]" : "text-zinc-400"
                          }`}
                        >
                          Woche
                        </button>
                        <button
                          onClick={() => { setDashboardDayFilter(todayStr); playSound("click"); }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            dashboardDayFilter === todayStr ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708]" : "text-zinc-400"
                          }`}
                        >
                          Heute
                        </button>
                      </div>
                    </div>

                    {/* Wochentag-Leiste: Horizontal scrollbar auf Handy */}
                    <div className="flex sm:grid sm:grid-cols-7 gap-1.5 mb-3 overflow-x-auto pb-1 no-scrollbar">
                      {currentWeekDays.map((day) => {
                        const isFiltered = dashboardDayFilter === day.dateStr;
                        return (
                          <button
                            key={day.dateStr}
                            onClick={() => { setDashboardDayFilter(day.dateStr); playSound("click"); }}
                            className={`p-2 rounded-xl border text-center transition-all shrink-0 min-w-[50px] sm:min-w-0 ${
                              isFiltered
                                ? "bg-[#e8ba84] text-black border-[#e8ba84] font-black shadow-lg"
                                : day.isToday
                                ? "bg-[#16161e] border-white/30 text-white font-bold"
                                : "bg-[#0f0f13] border-white/5 text-zinc-400"
                            }`}
                          >
                            <div className="text-[9px] sm:text-[10px] uppercase font-bold">{day.dayName}</div>
                            <div className="text-xs font-mono font-bold">{day.dayNumber}</div>
                            <div className="text-[9px] opacity-80">{day.bookings.length}</div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Liste der Termine */}
                    <div className="space-y-3 overflow-y-auto max-h-[500px] pr-0.5">
                      {currentWeekDays
                        .filter((day) => dashboardDayFilter === "all" || dashboardDayFilter === day.dateStr)
                        .map((day) => (
                          <div key={day.dateStr} className="space-y-1.5">
                            <div className="flex items-center justify-between pt-1 text-[11px] font-bold border-b border-white/5 pb-1">
                              <span className={day.isToday ? "text-[#e8ba84]" : "text-zinc-400"}>
                                {day.dayFullDate} {day.isToday && "• HEUTE"}
                              </span>
                              <span className="text-zinc-500 font-mono text-[10px]">{day.bookings.length} Termine</span>
                            </div>

                            {day.bookings.length === 0 ? (
                              <div className="p-2.5 text-[11px] text-zinc-600 italic bg-[#0a0a0d] rounded-xl border border-white/[0.03]">
                                Keine Termine eingetragen.
                              </div>
                            ) : (
                              day.bookings.map((b) => {
                                const isPause = b.service.toLowerCase().includes("pause") || b.status === "blocked";
                                const isInProgress = b.status === "in_progress";
                                const isCompleted = b.status === "completed";

                                return (
                                  <div
                                    key={b.id}
                                    onClick={() => openDetailDrawer(b)}
                                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                                      isInProgress
                                        ? "bg-sky-500/10 border-sky-500/40"
                                        : isCompleted
                                        ? "bg-white/[0.02] border-white/5 opacity-60"
                                        : isPause
                                        ? "bg-amber-500/5 border-amber-500/20"
                                        : "bg-[#101014] hover:bg-[#16161c] border-white/10"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="font-mono text-xs font-bold text-[#e8ba84] bg-black/40 px-2 py-1 rounded-xl border border-white/10 shrink-0">
                                          {b.time}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                                            <span className="truncate">{b.name}</span>
                                            {isInProgress && (
                                              <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded-full font-mono shrink-0">
                                                Im Stuhl
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[11px] text-zinc-400 truncate">
                                            {b.service}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {b.phone && (
                                          <a
                                            href={getWhatsAppUrl(b.phone, b.name, b.date, b.time, b.service)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400"
                                          >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                          </a>
                                        )}
                                        <button
                                          onClick={() => openDetailDrawer(b)}
                                          className="px-2.5 py-1 rounded-xl bg-white/5 text-zinc-300 text-[11px] font-bold border border-white/10"
                                        >
                                          Details
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        ))}
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODUL 2: KALENDER (MOBIL: RESPONSIVE KACHELN + TAGES-AGENDA)              */}
          {/* ========================================================================= */}
          {activeModule === "calendar" && (
            <div className="space-y-4 sm:space-y-6">
              
              <div className="website-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const d = new Date(currentCalendarMonth);
                        d.setMonth(d.getMonth() - 1);
                        setCurrentCalendarMonth(d);
                        playSound("click");
                      }}
                      className="p-2 rounded-xl bg-white/5 text-zinc-300"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const d = new Date(currentCalendarMonth);
                        d.setMonth(d.getMonth() + 1);
                        setCurrentCalendarMonth(d);
                        playSound("click");
                      }}
                      className="p-2 rounded-xl bg-white/5 text-zinc-300"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <h2 className="text-base sm:text-2xl font-black text-white capitalize truncate">
                    {calendarMonthData.monthName} {calendarMonthData.year}
                  </h2>
                </div>

                <div className="flex items-center gap-1 bg-[#101014] p-1 rounded-xl border border-white/10 shrink-0">
                  <button
                    onClick={() => { setCalendarView("month"); playSound("click"); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      calendarView === "month" ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708]" : "text-zinc-400"
                    }`}
                  >
                    Monat
                  </button>
                  <button
                    onClick={() => { setCalendarView("day"); playSound("click"); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      calendarView === "day" ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708]" : "text-zinc-400"
                    }`}
                  >
                    Slots
                  </button>
                </div>
              </div>

              {calendarView === "month" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <div>Mo</div><div>Di</div><div>Mi</div><div>Do</div><div>Fr</div><div>Sa</div><div>So</div>
                  </div>

                  {/* KACHELN: Auf Handy kompakt (min-h-[60px]), auf Tablet/Desktop groß (min-h-[140px]) */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2.5">
                    {calendarMonthData.tiles.map((tile, idx) => {
                      if (tile.dayNumber === null) {
                        return (
                          <div
                            key={`empty-${idx}`}
                            className="h-14 sm:min-h-[140px] rounded-xl sm:rounded-2xl bg-white/[0.01] border border-white/[0.03]"
                          />
                        );
                      }

                      const isSelected = tile.dateStr === selectedDayForDetails;

                      return (
                        <div
                          key={`day-${tile.dayNumber}`}
                          onClick={() => {
                            if (tile.dateStr) setSelectedDayForDetails(tile.dateStr);
                            playSound("click");
                          }}
                          className={`h-16 sm:min-h-[140px] rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border flex flex-col justify-between cursor-pointer transition-all ${
                            isSelected
                              ? "bg-[#181820] border-[#e8ba84] shadow-lg ring-1 ring-[#e8ba84]"
                              : tile.isToday
                              ? "bg-[#14141a] border-white/20"
                              : "bg-[#0b0b0e] border-white/5"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[11px] sm:text-xs font-black ${
                                tile.isToday
                                  ? "w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#e8ba84] text-black flex items-center justify-center font-bold"
                                  : "text-zinc-300"
                              }`}
                            >
                              {tile.dayNumber}
                            </span>
                            {tile.bookings.length > 0 && (
                              <span className="text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.2 rounded-full bg-white/10 text-[#e8ba84] font-bold">
                                {tile.bookings.length}
                              </span>
                            )}
                          </div>

                          {/* Desktop & Tablet: Details direkt in Kachel */}
                          <div className="hidden sm:block flex-1 my-1.5 space-y-1 overflow-y-auto max-h-[85px] pr-0.5">
                            {tile.bookings.map((b) => (
                              <div
                                key={b.id}
                                onClick={(e) => { e.stopPropagation(); openDetailDrawer(b); }}
                                className={`px-1.5 py-0.5 rounded-lg border text-[10px] flex items-center justify-between gap-1 ${
                                  b.status === "in_progress"
                                    ? "bg-sky-500/20 border-sky-400/40 text-sky-200 font-bold"
                                    : "bg-[#14141a] border-white/10 text-white"
                                }`}
                              >
                                <span className="font-mono text-[#e8ba84] font-bold">{b.time}</span>
                                <span className="truncate">{b.name}</span>
                              </div>
                            ))}
                          </div>

                          {/* Handy: Farb-Punkte statt Text */}
                          <div className="sm:hidden flex items-center justify-center gap-0.5 mt-1">
                            {tile.bookings.slice(0, 3).map((b, i) => (
                              <span
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  b.status === "in_progress"
                                    ? "bg-sky-400"
                                    : b.status === "completed"
                                    ? "bg-emerald-400"
                                    : "bg-[#e8ba84]"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* TAGES-AGENDA UNTER DEM KALENDER */}
                  <div className="website-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/10">
                      <div>
                        <h3 className="text-xs sm:text-base font-bold text-white">
                          Termine am {selectedDayDetails.dateStr}
                        </h3>
                        <p className="text-[11px] text-zinc-400">
                          {selectedDayDetails.totalClients} Kunden gebucht
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setModalMode("customer");
                          setNewBooking({
                            name: "",
                            phone: "",
                            service: SERVICE_CATALOG[0].name,
                            addons: [],
                            date: selectedDayDetails.dateStr,
                            time: "15:00",
                            notes: "",
                          });
                          setIsModalOpen(true);
                        }}
                        className="h-8 sm:h-9 px-3 rounded-xl bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708] text-xs font-black flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Buchen</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                      {selectedDayDetails.bookings.length === 0 ? (
                        <div className="col-span-full py-6 text-center text-zinc-400 text-xs">
                          Keine Buchungen an diesem Tag.
                        </div>
                      ) : (
                        selectedDayDetails.bookings.map((b) => (
                          <div
                            key={b.id}
                            onClick={() => openDetailDrawer(b)}
                            className="p-3.5 rounded-2xl bg-[#101014] hover:bg-[#16161c] border border-white/10 cursor-pointer"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-mono text-xs font-bold text-[#e8ba84] bg-black/40 px-2 py-0.5 rounded-lg border border-white/10">
                                {b.time} Uhr
                              </span>
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 font-bold uppercase text-zinc-300">
                                {b.status}
                              </span>
                            </div>
                            <div className="font-bold text-white text-xs sm:text-sm">{b.name}</div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">{b.service}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {calendarView === "day" && (
                <div className="website-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/10 space-y-2">
                  <h3 className="text-xs sm:text-sm font-bold text-white mb-2 pb-2 border-b border-white/10">
                    Zeitslots am {selectedDayDetails.dateStr}
                  </h3>
                  <div className="space-y-2">
                    {STANDARD_STUDIO_SLOTS.map((slotTime) => {
                      const booking = selectedDayDetails.bookings.find((b) => b.time === slotTime);
                      return (
                        <div
                          key={slotTime}
                          className={`p-3 rounded-xl border flex items-center justify-between ${
                            booking ? "bg-[#14141a] border-[#e8ba84]/30" : "bg-[#0b0b0e] border-white/5 opacity-70"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold text-[#e8ba84] w-14">{slotTime}</span>
                            {booking ? (
                              <div>
                                <div className="font-bold text-xs text-white">{booking.name}</div>
                                <div className="text-[11px] text-zinc-400">{booking.service}</div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-zinc-500 font-mono">Frei</span>
                            )}
                          </div>
                          <div>
                            {booking ? (
                              <button
                                onClick={() => openDetailDrawer(booking)}
                                className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-zinc-300 border border-white/10"
                              >
                                Details
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setModalMode("customer");
                                  setNewBooking({
                                    name: "",
                                    phone: "",
                                    service: SERVICE_CATALOG[0].name,
                                    addons: [],
                                    date: selectedDayDetails.dateStr,
                                    time: slotTime,
                                    notes: "",
                                  });
                                  setIsModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* MODUL 3: KARTEI (MOBIL OPTIMIERT)                                         */}
          {/* ========================================================================= */}
          {activeModule === "clients" && (
            <div className="space-y-4 sm:space-y-6">
              
              {/* Auto-Cleanup Banner */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#101014] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Auto-Bereinigung aktiv (5 Tage)</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">Alte Termine werden nach 5 Tagen gelöscht.</div>
                  </div>
                </div>
                <button
                  disabled={cleaningUp}
                  onClick={handleManualCleanup}
                  className="h-8 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-200 flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cleaningUp ? "animate-spin text-[#e8ba84]" : "text-[#e8ba84]"}`} />
                  <span>{cleaningUp ? "Prüfe..." : "Bereinigen"}</span>
                </button>
              </div>

              {/* Suchleiste & Filter */}
              <div className="website-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-white/10 space-y-3">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Kunde, Telefon, Service suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-[#09090c] border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#e8ba84]"
                  />
                </div>

                <div className="flex items-center gap-1 bg-[#101014] p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setClientStatusFilter("active")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                      clientStatusFilter === "active" ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708]" : "text-zinc-400"
                    }`}
                  >
                    Aktiv
                  </button>
                  <button
                    onClick={() => setClientStatusFilter("completed")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                      clientStatusFilter === "completed" ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708]" : "text-zinc-400"
                    }`}
                  >
                    Erledigt
                  </button>
                  <button
                    onClick={() => setClientStatusFilter("all")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                      clientStatusFilter === "all" ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708]" : "text-zinc-400"
                    }`}
                  >
                    Alle
                  </button>
                </div>
              </div>

              {/* Kundenliste */}
              <div className="website-card rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden divide-y divide-white/5">
                {filteredBookingsList.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs">Keine Kunden gefunden.</div>
                ) : (
                  filteredBookingsList.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => openDetailDrawer(b)}
                      className="p-3.5 sm:p-4 hover:bg-white/[0.02] flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white text-xs shrink-0">
                          {b.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm text-white truncate">{b.name}</div>
                          <div className="text-[11px] text-zinc-400 truncate">{b.service}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <div className="text-right text-[11px] font-mono font-bold text-[#e8ba84]">
                          {b.time}
                        </div>
                        {b.phone && (
                          <a
                            href={getWhatsAppUrl(b.phone, b.name, b.date, b.time, b.service)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => openDetailDrawer(b)}
                          className="p-2 rounded-xl bg-white/5 text-zinc-300"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#e8ba84]" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

        </div>
      </section>

      {/* ========================================================================= */}
      {/* MOBILE APP BOTTOM DOCK NAVIGATION (Nur auf Handy sichtbar)                */}
      {/* ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0d]/95 backdrop-blur-2xl border-t border-white/10 px-3 py-2 flex items-center justify-around md:hidden shadow-2xl">
        <button
          onClick={() => { setActiveModule("dashboard"); playSound("click"); }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeModule === "dashboard" ? "text-[#e8ba84]" : "text-zinc-500"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-bold">Cockpit</span>
        </button>

        <button
          onClick={() => { setActiveModule("calendar"); playSound("click"); }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeModule === "calendar" ? "text-[#e8ba84]" : "text-zinc-500"
          }`}
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] font-bold">Kalender</span>
        </button>

        <button
          onClick={() => { setActiveModule("clients"); playSound("click"); }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeModule === "clients" ? "text-[#e8ba84]" : "text-zinc-500"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-bold">Kartei</span>
        </button>

        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-rose-400"
          title="Sperren"
        >
          <Lock className="w-5 h-5" />
          <span className="text-[10px] font-bold">Sperren</span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* DETAIL MODAL (AUF HANDY ALS BOTTOM SHEET)                                 */}
      {/* ========================================================================= */}
      {selectedBookingForDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-xl website-card-active rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 border border-[#e8ba84]/40 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto">
            
            {/* iOS Pull Bar Indicator auf Handy */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto -mt-1 mb-2 sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#e8ba84]/15 border border-[#e8ba84]/30 flex items-center justify-center text-[#e8ba84] font-black text-base shrink-0">
                  {selectedBookingForDetail.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base sm:text-xl font-black text-white">
                    {selectedBookingForDetail.name}
                  </h3>
                  <p className="text-[11px] font-mono text-[#e8ba84]">
                    {selectedBookingForDetail.date} • {selectedBookingForDetail.time} Uhr
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedBookingForDetail(null)}
                className="p-2 rounded-xl bg-white/5 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailActionSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{detailActionSuccess}</span>
              </div>
            )}

            {/* Service */}
            <div className="p-3.5 rounded-2xl bg-[#0d0d12] border border-white/10 text-xs space-y-1">
              <div className="font-bold text-white text-sm">{selectedBookingForDetail.service}</div>
              <div className="text-zinc-400 font-mono text-[11px]">
                Dauer: {getServiceDuration(selectedBookingForDetail.service, selectedBookingForDetail.addons)}
              </div>
              {selectedBookingForDetail.addons.length > 0 && (
                <div className="text-[#e8ba84] text-[11px] pt-1">
                  Extras: {selectedBookingForDetail.addons.join(", ")}
                </div>
              )}
            </div>

            {/* Kontakt Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={getWhatsAppUrl(
                  selectedBookingForDetail.phone,
                  selectedBookingForDetail.name,
                  selectedBookingForDetail.date,
                  selectedBookingForDetail.time,
                  selectedBookingForDetail.service
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>

              {selectedBookingForDetail.phone ? (
                <a
                  href={`tel:${selectedBookingForDetail.phone}`}
                  className="h-10 rounded-xl bg-white/5 text-zinc-200 border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-4 h-4 text-[#e8ba84]" />
                  <span>Anrufen</span>
                </a>
              ) : (
                <div className="h-10 rounded-xl bg-white/5 text-zinc-500 text-xs flex items-center justify-center">
                  Keine Tel.
                </div>
              )}
            </div>

            {/* Verzögerungs-Helfer */}
            <div className="p-3 rounded-2xl bg-[#0d0d12] border border-white/10">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block mb-1.5">
                Uhrzeit verschieben (+15m / +30m)
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  disabled={updatingId === selectedBookingForDetail.id}
                  onClick={() => handleShiftAppointmentTime(selectedBookingForDetail.id, 15)}
                  className="h-9 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold"
                >
                  +15 Min
                </button>
                <button
                  disabled={updatingId === selectedBookingForDetail.id}
                  onClick={() => handleShiftAppointmentTime(selectedBookingForDetail.id, 30)}
                  className="h-9 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold"
                >
                  +30 Min
                </button>
                <a
                  href={getWhatsAppDelayNoticeUrl(selectedBookingForDetail.phone, selectedBookingForDetail.name, 15)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-bold flex items-center justify-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>WA Info</span>
                </a>
              </div>
            </div>

            {/* Barber Notiz */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1">
                <Edit3 className="w-3.5 h-3.5 text-[#e8ba84]" />
                <span>Interne Barber-Notiz (Schnittkartei)</span>
              </label>
              <textarea
                rows={2}
                placeholder="z.B. Seiten 0.5mm, Scheitel links..."
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#09090c] border border-white/10 text-white text-xs focus:outline-none focus:border-[#e8ba84]"
              />
              <button
                disabled={savingNotes}
                onClick={handleSaveNotes}
                className="w-full h-9 bg-white/10 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95"
              >
                {savingNotes ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-[#e8ba84]" />}
                <span>Notiz speichern</span>
              </button>
            </div>

            {/* Status-Buttons */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleStatusChange(selectedBookingForDetail.id, "in_progress")}
                  className={`h-9 rounded-xl text-xs font-bold ${
                    selectedBookingForDetail.status === "in_progress"
                      ? "bg-sky-500 text-black font-black"
                      : "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                  }`}
                >
                  Im Stuhl
                </button>
                <button
                  onClick={() => handleStatusChange(selectedBookingForDetail.id, "completed")}
                  className={`h-9 rounded-xl text-xs font-bold ${
                    selectedBookingForDetail.status === "completed"
                      ? "bg-emerald-500 text-black font-black"
                      : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  }`}
                >
                  Erledigt
                </button>
                <button
                  onClick={() => handleStatusChange(selectedBookingForDetail.id, "cancelled")}
                  className={`h-9 rounded-xl text-xs font-bold ${
                    selectedBookingForDetail.status === "cancelled"
                      ? "bg-rose-500 text-white font-black"
                      : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                  }`}
                >
                  No-Show
                </button>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => handleDeleteBooking(selectedBookingForDetail.id)}
                  className="text-[11px] text-rose-400 p-1 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Termin löschen</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEUER TERMIN                                                       */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg website-card-active rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 border border-[#e8ba84]/30 shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto">
            
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto -mt-1 mb-2 sm:hidden" />

            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base sm:text-lg font-black text-white">
                {modalMode === "customer" ? "Neuer Termin" : "Pause anlegen"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setModalSubmitting(true);
                try {
                  const res = await fetch("/api/bookings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newBooking),
                  });
                  const data = await res.json();
                  if (data.success) {
                    setIsModalOpen(false);
                    fetchBookings();
                    playSound("success");
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setModalSubmitting(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="z.B. Alex Müller"
                  value={newBooking.name}
                  onChange={(e) => setNewBooking({ ...newBooking, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-[#09090c] border border-white/15 text-white"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Telefon (WhatsApp)
                </label>
                <input
                  type="tel"
                  placeholder="0176..."
                  value={newBooking.phone}
                  onChange={(e) => setNewBooking({ ...newBooking, phone: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-[#09090c] border border-white/15 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">Datum</label>
                  <input
                    type="date"
                    required
                    value={newBooking.date}
                    onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-[#09090c] border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">Uhrzeit</label>
                  <input
                    type="time"
                    required
                    value={newBooking.time}
                    onChange={(e) => setNewBooking({ ...newBooking, time: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-[#09090c] border border-white/15 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">Service</label>
                <select
                  value={newBooking.service}
                  onChange={(e) => setNewBooking({ ...newBooking, service: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-[#09090c] border border-white/15 text-white"
                >
                  {SERVICE_CATALOG.map((s, idx) => (
                    <option key={idx} value={s.name}>
                      {s.name} ({s.duration})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">Notiz</label>
                <input
                  type="text"
                  placeholder="Kundenwunsch..."
                  value={newBooking.notes}
                  onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-[#09090c] border border-white/15 text-white"
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="w-full h-11 bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708] font-black uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95"
                >
                  {modalSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Termin anlegen</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
