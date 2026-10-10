"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Delete,
  X,
  Loader2,
  TrendingUp,
} from "lucide-react";

interface KassenPinPadProps {
  mode?: "card" | "modal";
  title?: string;
  subtitle?: string;
  onSuccess: () => void;
  onClose?: () => void;
  playSound?: (type: "chime" | "success" | "click" | "cash") => void;
}

export default function KassenPinPad({
  mode = "card",
  title = "Kassen-Tresor & Finanzen",
  subtitle = "Sicherheitsbereich · Bitte 4-stelligen Kassen-PIN eingeben",
  onSuccess,
  onClose,
  playSound,
}: KassenPinPadProps) {
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);

  const handleDigit = useCallback(
    (digit: string) => {
      if (loading) return;
      if (pin.length < 4) {
        playSound?.("click");
        const nextPin = pin + digit;
        setPin(nextPin);
        setError(null);
        if (nextPin.length === 4) {
          verifyPin(nextPin);
        }
      }
    },
    [pin, loading, playSound]
  );

  const handleDelete = useCallback(() => {
    if (loading) return;
    playSound?.("click");
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  }, [loading, playSound]);

  const handleClear = useCallback(() => {
    if (loading) return;
    playSound?.("click");
    setPin("");
    setError(null);
  }, [loading, playSound]);

  const verifyPin = async (candidatePin: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: candidatePin }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        playSound?.("success");
        try {
          sessionStorage.setItem("gmcutz_kassen_pin_unlocked", "true");
        } catch {}
        onSuccess();
      } else {
        triggerError(data.error || "Ungültiger PIN");
      }
    } catch (err: any) {
      triggerError("Netzwerkfehler bei PIN-Prüfung");
    } finally {
      setLoading(false);
    }
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setShake(true);
    setPin("");
    playSound?.("click");
    setTimeout(() => {
      setShake(false);
    }, 600);
  };

  // Tastatur-Support (0-9, Backspace, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleDelete();
      } else if (e.key === "Escape" && mode === "modal" && onClose) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDigit, handleDelete, mode, onClose]);

  const content = (
    <div
      className={`relative w-full max-w-sm mx-auto rounded-3xl border border-[#e8ba84]/30 bg-[#0a0a0e] p-6 sm:p-8 shadow-[0_0_50px_rgba(232,186,132,0.12)] text-center select-none ${
        shake ? "animate-[shake_0.5s_ease-in-out]" : ""
      }`}
    >
      {/* Schließen-Button bei Modal */}
      {mode === "modal" && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition"
          title="Abbrechen"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Schloss-Icon mit Glow */}
      <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#e8ba84]/20 to-[#c99756]/10 border border-[#e8ba84]/40 flex items-center justify-center text-[#e8ba84] shadow-[0_0_25px_rgba(232,186,132,0.25)] mb-4">
        <Lock className="w-8 h-8 text-[#e8ba84]" />
      </div>

      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e8ba84]/10 border border-[#e8ba84]/20 text-[10px] font-mono tracking-widest text-[#e8ba84] uppercase">
        <KeyRound className="w-3 h-3" /> SICHERHEITS-STUFE 2
      </span>

      <h3 className="mt-3 text-lg sm:text-xl font-black text-[#fff6e8] uppercase tracking-wide">
        {title}
      </h3>
      <p className="mt-1 text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
        {subtitle}
      </p>

      {/* PIN Dots Indikatoren */}
      <div className="flex items-center justify-center gap-4 my-6">
        {[0, 1, 2, 3].map((index) => {
          const filled = pin.length > index;
          return (
            <div
              key={index}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                filled
                  ? "bg-[#e8ba84] border-[#e8ba84] scale-110 shadow-[0_0_12px_rgba(232,186,132,0.8)]"
                  : "border-white/20 bg-white/5"
              }`}
            />
          );
        })}
      </div>

      {/* Fehlermeldung */}
      {error ? (
        <div className="mb-4 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="mb-4 text-xs font-bold text-[#e8ba84] py-2 px-3 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#e8ba84]" />
          <span>PIN wird verifiziert...</span>
        </div>
      ) : (
        <div className="mb-4 h-8" />
      )}

      {/* Numerisches Tastatur-Pad */}
      <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={loading}
            onClick={() => handleDigit(digit)}
            className="h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-[#e8ba84]/20 border border-white/10 active:border-[#e8ba84]/40 text-xl font-black text-white transition flex items-center justify-center shadow-md active:scale-95 disabled:opacity-50"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          disabled={loading || pin.length === 0}
          onClick={handleClear}
          className="h-14 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition flex items-center justify-center active:scale-95 disabled:opacity-30"
          title="Alles löschen"
        >
          C
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => handleDigit("0")}
          className="h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-[#e8ba84]/20 border border-white/10 active:border-[#e8ba84]/40 text-xl font-black text-white transition flex items-center justify-center shadow-md active:scale-95 disabled:opacity-50"
        >
          0
        </button>

        <button
          type="button"
          disabled={loading || pin.length === 0}
          onClick={handleDelete}
          className="h-14 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-zinc-400 hover:text-zinc-200 transition flex items-center justify-center active:scale-95 disabled:opacity-30"
          title="Rücktaste"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
        <span>GMCUTZ SECURE TERMINAL</span>
      </div>
    </div>
  );

  if (mode === "modal") {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div onClick={(e) => e.stopPropagation()}>{content}</div>
      </div>
    );
  }

  return <div className="py-8 sm:py-16 flex items-center justify-center">{content}</div>;
}
