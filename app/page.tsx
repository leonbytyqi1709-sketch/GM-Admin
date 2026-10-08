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

  // === SALON STATUS STEUERUNG (VOLLE KONTROLLE) ===
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

  // Auth Status beim Laden prüfen (Persistenz für iPad)
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
        setDetailActionSuccess("Barber-Notiz dauerhaft gespeichert!");
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

  const [cleaningUp, setCleaningUp] = useState(false);

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

  // =========================================================================
  // BERECHNUNG DER GANZEN AKTUELLEN WOCHE FÜRS DASHBOARD (MO - SO)
  // =========================================================================
  const currentWeekDays = useMemo(() => {
    const now = new Date(currentTime);
    const dayOfWeek = now.getDay(); // 0 = So, 1 = Mo, 2 = Di...
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
      const dayFullDate = d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
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

  // Gesamtanzahl der Termine der aktuellen Woche
  const totalWeekAppointmentsCount = useMemo(() => {
    return currentWeekDays.reduce((acc, day) => acc + day.bookings.filter((b) => b.status !== "blocked").length, 0);
  }, [currentWeekDays]);

  // Kalender-Berechnungen (Monatskacheln)
  const calendarMonthData = useMemo(() => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDay.getDay(); // 0 = Sonntag
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // 0 = Mo, 6 = So

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

  // Details zum ausgewählten Tag im Kalender
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

  // Kundenliste (CRM) filtern
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

  // Detail Drawer öffnen (Für JEDEN Termin auf Klick)
  const openDetailDrawer = (booking: Booking) => {
    setSelectedBookingForDetail(booking);
    setEditingNotes(booking.notes || "");
    playSound("click");
  };

  // =========================================================================
  // ANSICHT: MASTER-PASSWORT LOGIN SCREEN (WENN NICHT EINGELOGGT)
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
        <div className="w-full max-w-md">
          {/* Logo & Brand */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#1c1c24] to-[#0e0e11] border border-[#e8ba84]/30 shadow-2xl mx-auto flex items-center justify-center mb-4">
              <Scissors className="w-8 h-8 text-[#e8ba84]" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              GM-CUTZ <span className="gold-gradient-text">TERMINAL</span>
            </h1>
            <p className="text-xs uppercase tracking-widest text-zinc-400 mt-2 font-mono">
              Salon Cockpit • Master Zugang
            </p>
          </div>

          {/* Login Card */}
          <div className="website-card-active rounded-3xl p-7 border border-[#e8ba84]/30 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <div className="p-2.5 rounded-2xl bg-[#e8ba84]/10 text-[#e8ba84] border border-[#e8ba84]/25">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Sicherheits-Authentifizierung</h2>
                <p className="text-xs text-zinc-400">Master-Passwort zum Entsperren eingeben</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                  Master-Passwort
                </label>
                <div className="relative">
                  <Key className="w-5 h-5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoFocus
                    placeholder="Passwort eingeben..."
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full h-14 pl-12 pr-12 rounded-2xl bg-[#09090c] border border-white/15 text-white placeholder-zinc-600 font-mono text-base focus:outline-none focus:border-[#e8ba84] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifyingAuth}
                className="w-full h-14 bg-gradient-to-r from-[#e8ba84] to-[#c99756] hover:brightness-110 text-[#070708] font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {isVerifyingAuth ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Unlock className="w-5 h-5 stroke-[2.5]" />
                    <span>Terminal Entsperren</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-white/5 text-center">
              <span className="text-[11px] text-zinc-500 font-mono">
                iPad Kiosk Modus • Sitzung bleibt gespeichert
              </span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================================
  // HAUPT-ANWENDUNG (AUTHENTIFIZIERT)
  // =========================================================================
  return (
    <main className="min-h-screen bg-[#070708] hero-halo text-white flex flex-col md:flex-row font-sans selection:bg-[#e8ba84] selection:text-black">
      
      {/* ========================================================================= */}
      {/* IPAD SIDEBAR NAVIGATION                                                   */}
      {/* ========================================================================= */}
      <aside className="w-full md:w-64 bg-[#0a0a0d] border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between p-4 md:p-6 shrink-0 z-30">
        <div>
          {/* Studio Brand Header */}
          <div className="flex items-center justify-between md:block mb-6 md:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1c1c24] to-[#0e0e11] border border-[#e8ba84]/30 shadow-lg flex items-center justify-center">
                <Scissors className="w-5 h-5 text-[#e8ba84]" />
              </div>
              <div>
                <h1 className="font-black text-base tracking-tight leading-none text-white">
                  GM-CUTZ <span className="text-[#e8ba84]">STUDIO</span>
                </h1>
                <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest mt-1">
                  iPad Terminal
                </p>
              </div>
            </div>

            {/* Mobile Status Punkt */}
            <div className="md:hidden flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  studioStatus === "open"
                    ? "bg-emerald-400 animate-pulse"
                    : studioStatus === "pause"
                    ? "bg-amber-400"
                    : "bg-rose-500"
                }`}
              />
            </div>
          </div>

          {/* Live Uhrzeit */}
          <div className="mb-6 p-4 rounded-2xl bg-[#101014] border border-white/10">
            <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-[#e8ba84]" />
              <span>Studio Zeit</span>
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-white">
              {currentTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">
              {currentTime.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>

          {/* Module Navigation Tabs */}
          <div className="space-y-2">
            <button
              onClick={() => {
                setActiveModule("dashboard");
                playSound("click");
              }}
              className={`w-full h-12 rounded-2xl px-4 flex items-center gap-3 text-sm font-bold transition-all ${
                activeModule === "dashboard"
                  ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708] shadow-lg shadow-[#e8ba84]/15"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
              <span>Studio Dashboard</span>
            </button>

            <button
              onClick={() => {
                setActiveModule("calendar");
                playSound("click");
              }}
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
              onClick={() => {
                setActiveModule("clients");
                playSound("click");
              }}
              className={`w-full h-12 rounded-2xl px-4 flex items-center gap-3 text-sm font-bold transition-all ${
                activeModule === "clients"
                  ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708] shadow-lg shadow-[#e8ba84]/15"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-5 h-5 flex-shrink-0" />
              <span>Buchungsbuch & Kartei</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer: Salon Steuerung & Logout */}
        <div className="mt-8 pt-4 border-t border-white/10 space-y-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1.5">
              Salon Betriebsmodus
            </span>
            <div className="grid grid-cols-3 gap-1 bg-[#121216] p-1 rounded-xl border border-white/10">
              <button
                onClick={() => {
                  setStudioStatus("open");
                  playSound("click");
                }}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  studioStatus === "open"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Aktiv
              </button>
              <button
                onClick={() => {
                  setStudioStatus("pause");
                  playSound("click");
                }}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  studioStatus === "pause"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Pause
              </button>
              <button
                onClick={() => {
                  setStudioStatus("closed");
                  playSound("click");
                }}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  studioStatus === "closed"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Zu
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs flex items-center gap-1.5 transition-all"
              title="Ton an/aus"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#e8ba84]" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs flex items-center gap-1.5 transition-all"
              title="Vollbildmodus fürs iPad"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs flex items-center gap-1.5 transition-all"
              title="Terminal sperren"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* HAUPTINHALT DER MODULE                                                    */}
      {/* ========================================================================= */}
      <section className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-[#070708]/90 backdrop-blur-xl border-b border-white/10 px-4 md:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase tracking-wider text-white">
                {activeModule === "dashboard" && "Salon Cockpit"}
                {activeModule === "calendar" && "Terminkalender"}
                {activeModule === "clients" && "Kundenkartei & Buchungsbuch"}
              </span>
              <span className="hidden sm:inline-block text-xs px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-400 font-mono">
                {bookings.length} Buchungen Total
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchBookings(true)}
              disabled={refreshing}
              className="h-10 px-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 flex items-center gap-2 active:scale-95 transition-all"
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
              className="h-10 px-4 bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708] font-black text-xs rounded-2xl shadow-lg flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Neuer Termin</span>
            </button>
          </div>
        </header>

        {/* Globaler Benachrichtigungs-Banner */}
        {notification && (
          <div className="mx-4 md:mx-8 mt-4 p-4 rounded-2xl bg-[#e8ba84]/15 border border-[#e8ba84]/30 text-[#fff6e8] text-sm flex items-center justify-between shadow-2xl animate-pulse">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-[#e8ba84]" />
              <span className="font-bold">{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Hauptmodul-Inhalt */}
        <div className="p-4 md:p-8 space-y-6">

          {/* ========================================================================= */}
          {/* MODUL 1: STUDIO DASHBOARD (MIT WOCHEN-TERMINE & VOLLE KONTROLLE)           */}
          {/* ========================================================================= */}
          {activeModule === "dashboard" && (
            <div className="space-y-6">
              
              {/* Salon KPI Kacheln */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                
                {/* Kunden Heute */}
                <div className="website-card rounded-3xl p-5 border border-white/10">
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#e8ba84]">Kunden Heute</span>
                    <Scissors className="w-4 h-4 text-[#e8ba84]" />
                  </div>
                  <div className="text-3xl font-black text-white">{todayMetrics.totalClients}</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    {todayMetrics.completedCount} bedient • {todayMetrics.openCount} offen
                  </div>
                </div>

                {/* Behandlungszeit Heute */}
                <div className="website-card rounded-3xl p-5 border border-white/10">
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Arbeitszeit Heute</span>
                    <Clock3 className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-3xl font-black text-amber-300 font-mono">
                    {todayMetrics.treatmentTimeFormatted}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Reine Schnittzeit im Salon
                  </div>
                </div>

                {/* Aktueller Stuhl-Status */}
                <div className="website-card rounded-3xl p-5 border border-white/10">
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">Barbier-Stuhl</span>
                    <Scissors className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-3xl font-black text-sky-300">
                    {todayMetrics.inProgressBooking ? "Belegt" : "Frei"}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    {todayMetrics.inProgressBooking
                      ? todayMetrics.inProgressBooking.name
                      : "Bereit für nächsten Kunden"}
                  </div>
                </div>

                {/* Termine Diese Ganze Woche */}
                <div className="website-card rounded-3xl p-5 border border-white/10">
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Ganze Woche Total</span>
                    <CalendarCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-black text-white">
                    {totalWeekAppointmentsCount} Kunden
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">Montag bis Sonntag</div>
                </div>
              </div>

              {/* DASHBOARD KONTROLLZENTRALE: LIVE STUHL & WOCHEN-TERMINE */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Spalte Links (5): LIVE STUHL-CONTROLLER & SPOTLIGHT */}
                <div className="lg:col-span-5 space-y-5">
                  
                  {/* LIVE AUF DEM STUHL */}
                  {todayMetrics.inProgressBooking ? (
                    <div
                      onClick={() => openDetailDrawer(todayMetrics.inProgressBooking!)}
                      className="website-card-active rounded-3xl p-6 border border-sky-400/40 shadow-2xl relative overflow-hidden cursor-pointer"
                    >
                      <div className="absolute top-0 right-0 px-4 py-1.5 bg-sky-500/20 text-sky-300 border-b border-l border-sky-400/30 text-xs font-mono font-bold uppercase rounded-bl-2xl flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                        <span>Schnitt Läuft Gerade</span>
                      </div>

                      <div className="mt-2 mb-4">
                        <span className="text-xs uppercase font-mono tracking-widest text-sky-400 font-bold">
                          Aktuell im Stuhl
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                          {todayMetrics.inProgressBooking.name}
                        </h3>
                        <p className="text-xs text-zinc-400 font-mono mt-0.5">
                          Termin: {todayMetrics.inProgressBooking.time} Uhr • Dauer: {getServiceDuration(todayMetrics.inProgressBooking.service, todayMetrics.inProgressBooking.addons)}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#0a0a0e] border border-white/10 mb-4">
                        <div className="text-sm font-bold text-white">
                          {todayMetrics.inProgressBooking.service}
                        </div>
                        {todayMetrics.inProgressBooking.addons.length > 0 && (
                          <div className="text-xs text-[#e8ba84] mt-1">
                            Extras: {todayMetrics.inProgressBooking.addons.join(", ")}
                          </div>
                        )}
                        {todayMetrics.inProgressBooking.notes && (
                          <div className="text-xs text-zinc-300 mt-2 p-2 bg-white/5 rounded-xl border border-white/5">
                            "{todayMetrics.inProgressBooking.notes}"
                          </div>
                        )}
                      </div>

                      {/* Stuhl-Kontrolle Aktionen */}
                      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          disabled={updatingId === todayMetrics.inProgressBooking.id}
                          onClick={() => handleStatusChange(todayMetrics.inProgressBooking!.id, "completed")}
                          className="w-full h-12 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
                        >
                          <Check className="w-5 h-5 text-emerald-400" />
                          <span>Schnitt Fertig • Stuhl Freigeben</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleShiftAppointmentTime(todayMetrics.inProgressBooking!.id, 15)}
                            className="h-10 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                          >
                            <FastForward className="w-3.5 h-3.5" />
                            <span>+15 Min Mehr</span>
                          </button>

                          <button
                            onClick={() => openDetailDrawer(todayMetrics.inProgressBooking!)}
                            className="h-10 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#e8ba84]" />
                            <span>Details & Notiz</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* KEIN KUNDE IM STUHL -> NÄCHSTER KUNDE SPOTLIGHT */
                    <div
                      onClick={() => todayMetrics.nextUpcoming && openDetailDrawer(todayMetrics.nextUpcoming)}
                      className="website-card-active rounded-3xl p-6 border border-[#e8ba84]/40 shadow-2xl cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#e8ba84] flex items-center gap-1.5">
                          <Scissors className="w-4 h-4" />
                          <span>Nächster Kunde im Spotlight</span>
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                          Heute
                        </span>
                      </div>

                      {todayMetrics.nextUpcoming ? (
                        <div>
                          <div className="flex items-baseline justify-between mt-1">
                            <h3 className="text-2xl sm:text-3xl font-black text-white">
                              {todayMetrics.nextUpcoming.name}
                            </h3>
                            <div className="font-mono text-lg font-bold text-[#e8ba84] bg-black/50 px-3 py-1 rounded-xl border border-white/10">
                              {todayMetrics.nextUpcoming.time} Uhr
                            </div>
                          </div>

                          <div className="mt-3 p-3.5 rounded-2xl bg-[#0f0f13] border border-white/10">
                            <div className="text-sm font-bold text-[#fff6e8]">
                              {todayMetrics.nextUpcoming.service}
                            </div>
                            {todayMetrics.nextUpcoming.addons && todayMetrics.nextUpcoming.addons.length > 0 && (
                              <div className="text-xs text-zinc-400 mt-1">
                                Extras: {todayMetrics.nextUpcoming.addons.join(", ")}
                              </div>
                            )}
                            <div className="mt-2 text-xs font-mono text-zinc-400">
                              Dauer: {getServiceDuration(todayMetrics.nextUpcoming.service, todayMetrics.nextUpcoming.addons)}
                            </div>
                          </div>

                          {todayMetrics.nextUpcoming.notes && (
                            <div className="mt-3 text-xs text-amber-200/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                              Notiz: "{todayMetrics.nextUpcoming.notes}"
                            </div>
                          )}

                          <div className="mt-5 space-y-2.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              disabled={updatingId === todayMetrics.nextUpcoming.id}
                              onClick={() => handleStatusChange(todayMetrics.nextUpcoming!.id, "in_progress")}
                              className="w-full h-12 bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708] rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
                            >
                              <Scissors className="w-5 h-5" />
                              <span>Auf den Stuhl setzen (Schnitt starten)</span>
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
                                className="h-10 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                              >
                                <MessageCircle className="w-4 h-4 text-emerald-400" />
                                <span>WhatsApp</span>
                              </a>

                              <button
                                onClick={() => openDetailDrawer(todayMetrics.nextUpcoming!)}
                                className="h-10 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#e8ba84]" />
                                <span>Details ansehen</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-10 text-center text-zinc-400">
                          Keine weiteren anstehenden Kunden für heute in der Schlange.
                        </div>
                      )}
                    </div>
                  )}

                  {/* SCHNELL-AKTIONEN BAR */}
                  <div className="website-card rounded-3xl p-5 border border-white/10 space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                      Salon Schnell-Aktionen
                    </h4>

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
                      className="w-full h-11 bg-[#141418] hover:bg-[#1c1c22] border border-white/10 rounded-2xl text-xs font-bold px-4 flex items-center justify-between text-zinc-200"
                    >
                      <span className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-[#e8ba84]" />
                        <span>Walk-In Express Check-in</span>
                      </span>
                      <span className="text-[#e8ba84] font-mono">+ Direkt</span>
                    </button>

                    <button
                      onClick={() => handleQuickPause(30)}
                      className="w-full h-11 bg-[#141418] hover:bg-[#1c1c22] border border-white/10 rounded-2xl text-xs font-bold px-4 flex items-center justify-between text-zinc-200"
                    >
                      <span className="flex items-center gap-2">
                        <Coffee className="w-4 h-4 text-amber-400" />
                        <span>30 Min Sofort-Pause sperren</span>
                      </span>
                      <span className="text-amber-400 font-mono">☕ 30m</span>
                    </button>
                  </div>
                </div>

                {/* Spalte Rechts (7): TERMINE DER GANZEN WOCHE (WOCHEN-ABLAUF) */}
                <div className="lg:col-span-7">
                  <div className="website-card rounded-3xl p-6 border border-white/10 h-full flex flex-col">
                    
                    {/* Header der Wochenübersicht */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-white/10">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                          <CalendarCheck className="w-4 h-4 text-[#e8ba84]" />
                          <span>Wochenübersicht ({totalWeekAppointmentsCount} Termine diese Woche)</span>
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Tippe auf einen Kunden für alle Details, Schnittkartei & Verschiebung
                        </p>
                      </div>

                      <div className="flex items-center gap-1 bg-[#101014] p-1 rounded-2xl border border-white/10 self-start sm:self-auto">
                        <button
                          onClick={() => {
                            setDashboardDayFilter("all");
                            playSound("click");
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            dashboardDayFilter === "all"
                              ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708]"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          Ganze Woche
                        </button>
                        <button
                          onClick={() => {
                            setDashboardDayFilter(todayStr);
                            playSound("click");
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            dashboardDayFilter === todayStr
                              ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708]"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          Nur Heute
                        </button>
                      </div>
                    </div>

                    {/* Wochentag-Filter Buttons */}
                    <div className="grid grid-cols-7 gap-1.5 mb-4">
                      {currentWeekDays.map((day) => {
                        const isFiltered = dashboardDayFilter === day.dateStr;
                        return (
                          <button
                            key={day.dateStr}
                            onClick={() => {
                              setDashboardDayFilter(day.dateStr);
                              playSound("click");
                            }}
                            className={`p-2 rounded-xl border text-center transition-all ${
                              isFiltered
                                ? "bg-[#e8ba84] text-black border-[#e8ba84] font-black shadow-lg"
                                : day.isToday
                                ? "bg-[#16161e] border-white/30 text-white font-bold"
                                : "bg-[#0f0f13] hover:bg-[#141418] border-white/5 text-zinc-400"
                            }`}
                          >
                            <div className="text-[10px] uppercase">{day.dayName}</div>
                            <div className="text-xs font-mono font-bold mt-0.5">{day.dayNumber}</div>
                            <div className="text-[9px] mt-0.5 opacity-80">
                              {day.bookings.length}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Liste der Termine für die Woche */}
                    <div className="flex-1 space-y-4 overflow-y-auto max-h-[580px] pr-1">
                      {currentWeekDays
                        .filter((day) => dashboardDayFilter === "all" || dashboardDayFilter === day.dateStr)
                        .map((day) => (
                          <div key={day.dateStr} className="space-y-2">
                            {/* Tag-Trennlinie & Überschrift */}
                            <div className="flex items-center justify-between pt-2 pb-1 border-b border-white/5">
                              <span
                                className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
                                  day.isToday ? "text-[#e8ba84]" : "text-zinc-300"
                                }`}
                              >
                                <span>{day.dayFullDate}</span>
                                {day.isToday && (
                                  <span className="text-[9px] bg-[#e8ba84]/20 text-[#e8ba84] px-2 py-0.5 rounded-full border border-[#e8ba84]/30 font-bold">
                                    HEUTE
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-zinc-500 font-mono">
                                {day.bookings.length} {day.bookings.length === 1 ? "Kunde" : "Kunden"}
                              </span>
                            </div>

                            {/* Termine an diesem Tag */}
                            {day.bookings.length === 0 ? (
                              <div className="p-3 text-xs text-zinc-600 italic bg-[#0a0a0d] rounded-xl border border-white/[0.03]">
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
                                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                                      isInProgress
                                        ? "bg-sky-500/10 border-sky-500/40 shadow-lg"
                                        : isCompleted
                                        ? "bg-white/[0.02] border-white/5 opacity-60"
                                        : isPause
                                        ? "bg-amber-500/5 border-amber-500/20"
                                        : "bg-[#101014] hover:bg-[#16161c] border-white/10"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="font-mono text-sm font-bold text-[#e8ba84] bg-black/40 px-2.5 py-1 rounded-xl border border-white/10 shrink-0">
                                          {b.time}
                                        </div>
                                        <div>
                                          <div className="font-bold text-sm text-white flex items-center gap-2">
                                            <span>{b.name}</span>
                                            {isInProgress && (
                                              <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-mono font-bold">
                                                Im Stuhl
                                              </span>
                                            )}
                                            {isCompleted && (
                                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                                                Erledigt
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                                            <span>{b.service}</span>
                                            <span>•</span>
                                            <span className="font-mono text-zinc-500">{getServiceDuration(b.service, b.addons)}</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Rechts: Aktionen */}
                                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        {b.phone && (
                                          <a
                                            href={getWhatsAppUrl(b.phone, b.name, b.date, b.time, b.service)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                            title="WhatsApp Chat"
                                          >
                                            <MessageCircle className="w-4 h-4" />
                                          </a>
                                        )}

                                        <button
                                          onClick={() => openDetailDrawer(b)}
                                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold border border-white/10"
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
          {/* MODUL 2: SALON KALENDER (KACHELN MIT KUNDENDETAILS & KLICK-FENSTER)        */}
          {/* ========================================================================= */}
          {activeModule === "calendar" && (
            <div className="space-y-6">
              
              {/* Kalender Header Bar */}
              <div className="website-card rounded-3xl p-5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const d = new Date(currentCalendarMonth);
                        d.setMonth(d.getMonth() - 1);
                        setCurrentCalendarMonth(d);
                        playSound("click");
                      }}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        const d = new Date(currentCalendarMonth);
                        d.setMonth(d.getMonth() + 1);
                        setCurrentCalendarMonth(d);
                        playSound("click");
                      }}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white capitalize">
                    {calendarMonthData.monthName} {calendarMonthData.year}
                  </h2>
                </div>

                {/* Ansichts-Wechsler: Monatskacheln / Tages-Slots */}
                <div className="flex items-center gap-2 bg-[#101014] p-1 rounded-2xl border border-white/10">
                  <button
                    onClick={() => {
                      setCalendarView("month");
                      playSound("click");
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      calendarView === "month"
                        ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708]"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Monatskacheln
                  </button>
                  <button
                    onClick={() => {
                      setCalendarView("day");
                      playSound("click");
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      calendarView === "day"
                        ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708]"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Tages-Slots
                  </button>
                </div>
              </div>

              {/* 1. MONATS-KACHELANSICHT MIT KUNDEN-DETAILS IN JEDER KACHEL */}
              {calendarView === "month" && (
                <div className="space-y-4">
                  {/* Wochentag-Spalten */}
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <div>Mo</div>
                    <div>Di</div>
                    <div>Mi</div>
                    <div>Do</div>
                    <div>Fr</div>
                    <div>Sa</div>
                    <div>So</div>
                  </div>

                  {/* Kacheln Grid: Größer, mit Kunden-Previews & Direktklick */}
                  <div className="grid grid-cols-7 gap-2 sm:gap-3">
                    {calendarMonthData.tiles.map((tile, idx) => {
                      if (tile.dayNumber === null) {
                        return (
                          <div
                            key={`empty-${idx}`}
                            className="min-h-[140px] sm:min-h-[165px] rounded-2xl bg-white/[0.01] border border-white/[0.03]"
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
                          className={`min-h-[140px] sm:min-h-[165px] rounded-2xl p-2 sm:p-2.5 border flex flex-col justify-between cursor-pointer transition-all ${
                            isSelected
                              ? "bg-[#181820] border-[#e8ba84] shadow-xl shadow-[#e8ba84]/10 ring-1 ring-[#e8ba84]"
                              : tile.isToday
                              ? "bg-[#14141a] border-white/20"
                              : "bg-[#0b0b0e] hover:bg-[#121217] border-white/5"
                          }`}
                        >
                          {/* Kachel-Header */}
                          <div className="flex items-center justify-between pb-1 border-b border-white/5">
                            <span
                              className={`text-xs font-black ${
                                tile.isToday
                                  ? "w-6 h-6 rounded-full bg-[#e8ba84] text-black flex items-center justify-center font-bold"
                                  : "text-zinc-300"
                              }`}
                            >
                              {tile.dayNumber}
                            </span>
                            {tile.bookings.length > 0 && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-[#e8ba84] font-bold">
                                {tile.bookings.length} {tile.bookings.length === 1 ? "Kunde" : "Kunden"}
                              </span>
                            )}
                          </div>

                          {/* Termine direkt in der Kachel gerendert (Antippen öffnet Detail-Fenster) */}
                          <div className="flex-1 my-1.5 space-y-1 overflow-y-auto max-h-[110px] pr-0.5">
                            {tile.bookings.length === 0 ? (
                              <div className="h-full flex items-center justify-center text-[10px] text-zinc-600 font-mono">
                                Frei
                              </div>
                            ) : (
                              tile.bookings.map((b) => (
                                <div
                                  key={b.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDetailDrawer(b);
                                  }}
                                  className={`px-2 py-1 rounded-xl border text-[11px] transition-all hover:scale-[1.02] flex items-center justify-between gap-1 shadow-sm ${
                                    b.status === "in_progress"
                                      ? "bg-sky-500/20 border-sky-400/40 text-sky-200 font-bold"
                                      : b.status === "completed"
                                      ? "bg-white/[0.03] border-white/5 text-zinc-400 opacity-70"
                                      : b.status === "blocked"
                                      ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                                      : "bg-[#14141a] hover:bg-[#1c1c24] border-white/10 text-white"
                                  }`}
                                  title={`${b.time} Uhr: ${b.name} (${b.service}) - Tippen für Fenster`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-mono text-[10px] font-bold text-[#e8ba84] shrink-0">
                                      {b.time}
                                    </span>
                                    <span className="font-bold truncate text-[11px]">
                                      {b.name}
                                    </span>
                                  </div>
                                  <span className="text-[9px] text-zinc-400 truncate max-w-[55px] hidden sm:inline">
                                    {b.service}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Kachel-Fußzeile */}
                          <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-500">
                            <span className="truncate">
                              {tile.bookings.length > 0 ? "Klick für Details" : "+ Freier Tag"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Detailansicht des ausgewählten Tages unter den Kacheln */}
                  <div className="website-card rounded-3xl p-6 border border-white/10 mt-6">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                      <div>
                        <h3 className="text-base font-bold text-white">
                          Termine am {selectedDayDetails.dateStr}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {selectedDayDetails.totalClients} Kunden gebucht • Klicke auf eine Karte für das Detail-Fenster
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
                        className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708] text-xs font-black flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Termin eintragen</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedDayDetails.bookings.length === 0 ? (
                        <div className="col-span-full py-8 text-center text-zinc-400 text-sm">
                          Keine Buchungen an diesem Tag eingetragen.
                        </div>
                      ) : (
                        selectedDayDetails.bookings.map((b) => (
                          <div
                            key={b.id}
                            onClick={() => openDetailDrawer(b)}
                            className="p-4 rounded-2xl bg-[#101014] hover:bg-[#16161c] border border-white/10 cursor-pointer transition-all hover:scale-[1.01]"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-sm font-bold text-[#e8ba84] bg-black/40 px-2 py-0.5 rounded-lg border border-white/10">
                                {b.time} Uhr
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 font-bold uppercase text-zinc-300">
                                {b.status}
                              </span>
                            </div>
                            <div className="font-bold text-white text-sm">{b.name}</div>
                            <div className="text-xs text-zinc-400 mt-1">{b.service}</div>
                            <div className="mt-2 text-[10px] text-[#e8ba84] font-mono">
                              Antippen für alle Kundendetails →
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. TAGES-SLOTS ANSICHT */}
              {calendarView === "day" && (
                <div className="website-card rounded-3xl p-6 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                    <h3 className="text-base font-bold text-white">
                      Zeitslots am {selectedDayDetails.dateStr}
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {STANDARD_STUDIO_SLOTS.map((slotTime) => {
                      const booking = selectedDayDetails.bookings.find((b) => b.time === slotTime);

                      return (
                        <div
                          key={slotTime}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                            booking
                              ? "bg-[#14141a] border-[#e8ba84]/30"
                              : "bg-[#0b0b0e] border-white/5 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="font-mono text-sm font-bold text-[#e8ba84] w-16">
                              {slotTime} Uhr
                            </div>
                            {booking ? (
                              <div>
                                <div className="font-bold text-sm text-white">{booking.name}</div>
                                <div className="text-xs text-zinc-400">
                                  {booking.service} • {getServiceDuration(booking.service, booking.addons)}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-zinc-500 font-mono">Freier Slot</div>
                            )}
                          </div>

                          <div>
                            {booking ? (
                              <button
                                onClick={() => openDetailDrawer(booking)}
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 border border-white/10"
                              >
                                Details ansehen
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
                                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/20"
                              >
                                Buchen
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
          {/* MODUL 3: KUNDENKARTEI & BUCHUNGSBUCH (CRM ARCHIV)                         */}
          {/* ========================================================================= */}
          {activeModule === "clients" && (
            <div className="space-y-6">
              
              {/* Auto-Cleanup Info & Manueller Purge Button */}
              <div className="p-4 rounded-2xl bg-[#101014] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Automatische 5-Tage-Bereinigung aktiv</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                        Auto-Purge (5 Tage)
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Vergangene Termine werden nach 5 Tagen automatisch gelöscht. Zukünftige Termine bleiben immer sicher erhalten.
                    </div>
                  </div>
                </div>

                <button
                  disabled={cleaningUp}
                  onClick={handleManualCleanup}
                  className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-200 flex items-center gap-2 self-start sm:self-auto shrink-0 transition-all active:scale-95"
                >
                  <RefreshCw className={`w-4 h-4 ${cleaningUp ? "animate-spin text-[#e8ba84]" : "text-[#e8ba84]"}`} />
                  <span>{cleaningUp ? "Prüfe..." : "Jetzt bereinigen"}</span>
                </button>
              </div>

              {/* Filter- und Suchleiste */}
              <div className="website-card rounded-3xl p-5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Kunde, Telefon, Service suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 rounded-2xl bg-[#09090c] border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#e8ba84]"
                  />
                </div>

                <div className="flex items-center gap-2 bg-[#101014] p-1 rounded-2xl border border-white/10 w-full sm:w-auto">
                  <button
                    onClick={() => setClientStatusFilter("active")}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      clientStatusFilter === "active"
                        ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708]"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Offen / Aktiv
                  </button>
                  <button
                    onClick={() => setClientStatusFilter("completed")}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      clientStatusFilter === "completed"
                        ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708]"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Erledigt
                  </button>
                  <button
                    onClick={() => setClientStatusFilter("all")}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      clientStatusFilter === "all"
                        ? "bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708]"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Alle
                  </button>
                </div>
              </div>

              {/* Kundenkartei Liste */}
              <div className="website-card rounded-3xl border border-white/10 overflow-hidden">
                <div className="divide-y divide-white/5">
                  {filteredBookingsList.length === 0 ? (
                    <div className="py-16 text-center text-zinc-500 text-sm">
                      Keine Kundenbuchungen zu diesem Filter gefunden.
                    </div>
                  ) : (
                    filteredBookingsList.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => openDetailDrawer(b)}
                        className="p-4 sm:p-5 hover:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white text-sm shrink-0">
                            {b.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-base text-white flex items-center gap-2">
                              <span>{b.name}</span>
                              <span className="font-mono text-xs text-zinc-400">({b.phone})</span>
                            </div>
                            <div className="text-xs text-zinc-400 mt-0.5">
                              {b.service} • Dauer: {getServiceDuration(b.service, b.addons)}
                            </div>
                            {b.notes && (
                              <div className="text-xs text-zinc-500 italic mt-1">
                                Notiz: "{b.notes}"
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                          <div className="text-right">
                            <div className="font-mono text-xs font-bold text-[#e8ba84]">
                              {b.date} • {b.time} Uhr
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 uppercase font-bold text-zinc-400">
                              {b.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {b.phone && (
                              <a
                                href={getWhatsAppUrl(b.phone, b.name, b.date, b.time, b.service)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                title="WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => openDetailDrawer(b)}
                              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300"
                              title="Details"
                            >
                              <Edit3 className="w-4 h-4 text-[#e8ba84]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </section>

      {/* ========================================================================= */}
      {/* TERMIN-DETAIL DRAWER / MODAL (MEHR DETAILS & INTERNE BARBER-NOTIZEN)      */}
      {/* ========================================================================= */}
      {selectedBookingForDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl website-card-active rounded-3xl p-6 sm:p-7 border border-[#e8ba84]/40 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#e8ba84]/15 border border-[#e8ba84]/30 flex items-center justify-center text-[#e8ba84] font-black text-lg">
                  {selectedBookingForDetail.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">
                    {selectedBookingForDetail.name}
                  </h3>
                  <p className="text-xs font-mono text-[#e8ba84]">
                    {selectedBookingForDetail.date} um {selectedBookingForDetail.time} Uhr
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedBookingForDetail(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feedback Toast */}
            {detailActionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{detailActionSuccess}</span>
              </div>
            )}

            {/* Schnitt- & Behandlungs-Details */}
            <div className="p-4 rounded-2xl bg-[#0d0d12] border border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                Gebuchter Haarschnitt
              </span>
              <div className="text-base font-bold text-white">
                {selectedBookingForDetail.service}
              </div>
              <div className="text-xs text-zinc-400 font-mono">
                Geschätzte Dauer: {getServiceDuration(selectedBookingForDetail.service, selectedBookingForDetail.addons)}
              </div>

              {selectedBookingForDetail.addons.length > 0 && (
                <div className="pt-2 border-t border-white/5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                    Gewählte Add-ons / Extras
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedBookingForDetail.addons.map((a, i) => (
                      <span
                        key={i}
                        className="text-xs px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[#fff6e8]"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Kontakt & Schnellanbindung */}
            <div className="grid grid-cols-2 gap-3">
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
                className="h-11 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Chat</span>
              </a>

              {selectedBookingForDetail.phone ? (
                <a
                  href={`tel:${selectedBookingForDetail.phone}`}
                  className="h-11 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4 text-[#e8ba84]" />
                  <span>Anrufen</span>
                </a>
              ) : (
                <div className="h-11 rounded-2xl bg-white/5 text-zinc-500 border border-white/5 text-xs flex items-center justify-center">
                  Keine Telefonnr.
                </div>
              )}
            </div>

            {/* Verzögerungs-Helfer (+15 Min / +30 Min Verschiebung) */}
            <div className="p-4 rounded-2xl bg-[#0d0d12] border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1.5">
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Verzögerungs-Helfer / Uhrzeit verschieben</span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  disabled={updatingId === selectedBookingForDetail.id}
                  onClick={() => handleShiftAppointmentTime(selectedBookingForDetail.id, 15)}
                  className="h-10 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-bold"
                >
                  +15 Min
                </button>
                <button
                  disabled={updatingId === selectedBookingForDetail.id}
                  onClick={() => handleShiftAppointmentTime(selectedBookingForDetail.id, 30)}
                  className="h-10 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-bold"
                >
                  +30 Min
                </button>
                <a
                  href={getWhatsAppDelayNoticeUrl(selectedBookingForDetail.phone, selectedBookingForDetail.name, 15)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-xs font-bold flex items-center justify-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>Info via WA</span>
                </a>
              </div>
            </div>

            {/* Interne Barber-Notizen / Schnittkartei */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-[#e8ba84]" />
                  <span>Interne Barber-Notiz (Schnittkartei für Gio)</span>
                </label>
              </div>
              <textarea
                rows={3}
                placeholder="z.B. Seiten 0.5mm Übergang, Scheitel links, mag kein Gel, Trinkgeld..."
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#09090c] border border-white/10 text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-[#e8ba84]"
              />
              <button
                disabled={savingNotes}
                onClick={handleSaveNotes}
                className="w-full h-10 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {savingNotes ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-[#e8ba84]" />}
                <span>Notiz dauerhaft speichern</span>
              </button>
            </div>

            {/* Status-Umschaltung */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
                Status direkt ändern
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleStatusChange(selectedBookingForDetail.id, "in_progress")}
                  className={`h-10 rounded-xl text-xs font-bold transition-all ${
                    selectedBookingForDetail.status === "in_progress"
                      ? "bg-sky-500 text-black font-black"
                      : "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                  }`}
                >
                  Im Stuhl
                </button>
                <button
                  onClick={() => handleStatusChange(selectedBookingForDetail.id, "completed")}
                  className={`h-10 rounded-xl text-xs font-bold transition-all ${
                    selectedBookingForDetail.status === "completed"
                      ? "bg-emerald-500 text-black font-black"
                      : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  }`}
                >
                  Erledigt
                </button>
                <button
                  onClick={() => handleStatusChange(selectedBookingForDetail.id, "cancelled")}
                  className={`h-10 rounded-xl text-xs font-bold transition-all ${
                    selectedBookingForDetail.status === "cancelled"
                      ? "bg-rose-500 text-white font-black"
                      : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                  }`}
                >
                  No-Show / Abgesagt
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => handleDeleteBooking(selectedBookingForDetail.id)}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 p-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Diesen Termin endgültig löschen</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEUER TERMIN / WALK-IN / PAUSE                                     */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg website-card-active rounded-3xl p-6 sm:p-7 border border-[#e8ba84]/30 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-black text-white">
                {modalMode === "customer" ? "Neuen Termin anlegen" : "Pause / Sperrung anlegen"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
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
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Name des Kunden
                </label>
                <input
                  type="text"
                  required
                  placeholder="z.B. Alex Müller oder Walk-In"
                  value={newBooking.name}
                  onChange={(e) => setNewBooking({ ...newBooking, name: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-[#09090c] border border-white/15 text-white text-xs focus:outline-none focus:border-[#e8ba84]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Telefonnummer (für WhatsApp)
                </label>
                <input
                  type="tel"
                  placeholder="0176 12345678"
                  value={newBooking.phone}
                  onChange={(e) => setNewBooking({ ...newBooking, phone: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-[#09090c] border border-white/15 text-white text-xs focus:outline-none focus:border-[#e8ba84]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                    Datum
                  </label>
                  <input
                    type="date"
                    required
                    value={newBooking.date}
                    onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-[#09090c] border border-white/15 text-white text-xs focus:outline-none focus:border-[#e8ba84]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                    Uhrzeit
                  </label>
                  <input
                    type="time"
                    required
                    value={newBooking.time}
                    onChange={(e) => setNewBooking({ ...newBooking, time: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-[#09090c] border border-white/15 text-white text-xs focus:outline-none focus:border-[#e8ba84]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Haarschnitt / Service
                </label>
                <select
                  value={newBooking.service}
                  onChange={(e) => setNewBooking({ ...newBooking, service: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-[#09090c] border border-white/15 text-white text-xs focus:outline-none focus:border-[#e8ba84]"
                >
                  {SERVICE_CATALOG.map((s, idx) => (
                    <option key={idx} value={s.name}>
                      {s.name} ({s.duration})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Interne Notiz (Schnittwünsche)
                </label>
                <input
                  type="text"
                  placeholder="z.B. Seiten 0.5mm, Taper Fade..."
                  value={newBooking.notes}
                  onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-[#09090c] border border-white/15 text-white text-xs focus:outline-none focus:border-[#e8ba84]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="w-full h-12 bg-gradient-to-r from-[#e8ba84] to-[#c99756] text-[#070708] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
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
