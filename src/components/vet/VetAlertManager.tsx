"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Volume2, VolumeX, BellRing } from "lucide-react";

interface VetAlertManagerProps {
  hasIncomingRequest: boolean;
  requestPetName?: string;
}

export function VetAlertManager({
  hasIncomingRequest,
  requestPetName = "Mascota",
}: VetAlertManagerProps) {
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const originalTitleRef = useRef<string>("AVO Veterinario | Dashboard");

  // Cargar preferencia de mute
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedMute = localStorage.getItem("avo_vet_muted");
      if (storedMute === "true") setIsMuted(true);
      originalTitleRef.current = document.title || "AVO Veterinario | Dashboard";
    }
  }, []);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("avo_vet_muted", String(next));
    }
  };

  // Síntesis acústica mediante Web Audio API (Bitono agradable de alerta veterinaria)
  const playAlertChime = useCallback(() => {
    if (isMuted || typeof window === "undefined") return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Primer tono (C5 = 523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Segundo tono (E5 = 659.25 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, now + 0.15);
      gain2.gain.setValueAtTime(0.2, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.6);

      // Tercer tono agudo (G5 = 783.99 Hz)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(783.99, now + 0.3);
      gain3.gain.setValueAtTime(0.25, now + 0.3);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.3);
      osc3.stop(now + 0.9);
    } catch (e) {
      console.warn("No se pudo emitir sonido de alerta Web Audio API:", e);
    }
  }, [isMuted]);

  // Manejo de parpadeo de título e intervalo sonoro cuando hay solicitud entrante
  useEffect(() => {
    if (hasIncomingRequest) {
      setIsPlaying(true);
      playAlertChime();

      let toggle = false;
      intervalRef.current = setInterval(() => {
        toggle = !toggle;
        if (toggle) {
          document.title = `🔔 ¡NUEVA CONSULTA: ${requestPetName.toUpperCase()}!`;
        } else {
          document.title = "AVO Veterinario | Solicitud Entrante";
        }

        // Repetir sonido cada 4.5 segundos si no ha respondido ni cancelado
        if (toggle && !isMuted) {
          playAlertChime();
        }
      }, 2000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        document.title = originalTitleRef.current;
        setIsPlaying(false);
      };
    } else {
      setIsPlaying(false);
      document.title = originalTitleRef.current;
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [hasIncomingRequest, requestPetName, isMuted, playAlertChime]);

  return (
    <div className="flex items-center gap-2">
      {isPlaying && (
        <div className="flex items-center gap-1.5 bg-red-500/20 text-red-400 border border-red-500/40 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse">
          <BellRing size={14} />
          <span className="hidden sm:inline">Alerta Entrante</span>
        </div>
      )}
      <button
        onClick={toggleMute}
        type="button"
        className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
          isMuted
            ? "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
            : "bg-sky-500/20 border-sky-500/40 text-sky-400 hover:bg-sky-500/30"
        }`}
        title={isMuted ? "Sonido de alertas silenciado" : "Alertas sonoras activas"}
      >
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        <span className="text-[11px] font-bold hidden md:inline">
          {isMuted ? "Silencioso" : "Audio Activo"}
        </span>
      </button>
    </div>
  );
}
