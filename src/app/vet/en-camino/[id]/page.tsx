"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useStore } from "@/store/useStore";
import InteractiveMap from "@/components/InteractiveMap";
import {
  MapPin,
  Navigation,
  Phone,
  MessageCircle,
  Clock,
  ShieldAlert,
  User,
  HeartPulse,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  FileText
} from "lucide-react";

export default function EnCaminoPage() {
  const router = useRouter();
  const params = useParams();
  const dispatchId = params?.id as string || "demo-101";

  const currentDispatch = useStore((state) => state.currentDispatch);
  const setCurrentDispatch = useStore((state) => state.setCurrentDispatch);

  const [etaMinutes, setEtaMinutes] = useState(12);
  const [distanceKm, setDistanceKm] = useState(2.4);
  const [isArrived, setIsArrived] = useState(false);

  // Coordenadas y datos del domicilio del tutor
  const [activeData, setActiveData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const str = localStorage.getItem("mock_realtime_dispatch") || localStorage.getItem("avo_pending_request");
        if (str) setActiveData(JSON.parse(str));
      } catch (e) {}
    }
  }, []);

  const destLat = currentDispatch?.lat || activeData.lat || -34.598;
  const destLng = currentDispatch?.lng || activeData.lng || -58.421;
  const tutorAddress = activeData.address || "Av. Corrientes 1234, CABA";
  const tutorName = currentDispatch?.tutorName || activeData.tutorName || "Carlos Rossi";
  const tutorPhone = "+54 9 11 5555-0192";
  const petName = currentDispatch?.petName || activeData.petName || "Toby";
  const petDetails = currentDispatch?.petSpecies 
    ? `${currentDispatch.petSpecies} • Consulta en domicilio` 
    : (activeData.petSpecies ? `${activeData.petSpecies} • Consulta en domicilio` : "Caniche Toy • 4 años • 5.2 kg");

  // Simulación del progreso de viaje (disminuyendo tiempo ETA en modo demo)
  useEffect(() => {
    const timer = setInterval(() => {
      setEtaMinutes((prev) => (prev > 1 ? prev - 1 : 1));
    }, 15000); // Reduce 1 minuto cada 15 segundos en demostración
    return () => clearInterval(timer);
  }, []);

  const handleOpenWhatsApp = () => {
    const msg = encodeURIComponent(
      `Hola ${tutorName}, soy el veterinario de AVO. Estoy en camino a tu domicilio para la atención de ${petName}. Llego en aprox. ${etaMinutes} minutos.`
    );
    window.open(`https://wa.me/5491155550192?text=${msg}`, "_blank");
  };

  const handleOpenNavigation = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`, "_blank");
  };

  const handleArrivedAndStartClinical = () => {
    setIsArrived(true);
    if (currentDispatch) {
      setCurrentDispatch({
        ...currentDispatch,
        status: "in_progress"
      });
    }
    // Breve pausa para animación antes de ir a historia clínica presencial
    setTimeout(() => {
      router.push("/vet/atencion");
    }, 600);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* HEADER SUPERIOR CON BARRA DE ESTADO DE VIAJE */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push("/vet/dashboard")}
            className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/60"
          >
            <ChevronLeft size={16} />
            <span>Volver al Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              ⚡ En Camino al Domicilio
            </span>
          </div>

          <div className="text-xs font-mono bg-sky-500/10 text-sky-400 px-3 py-1 rounded-xl border border-sky-500/20 font-bold">
            ID: {dispatchId}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* PANEL PRINCIPAL CON ETA Y BOTONES DE NAVEGACIÓN RÁPIDA */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
                <Navigation size={15} className="animate-pulse" />
                <span>Navegación Activa hacia Destino</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {tutorAddress}
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-400 shrink-0" />
                <span>Posición fijada en mapa Leaflet GPS • CABA</span>
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl shrink-0">
              <div className="text-center pr-4 border-r border-slate-800">
                <div className="text-2xl font-black text-emerald-400">
                  ~{etaMinutes} min
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-400">
                  Tiempo Est.
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-white">
                  {distanceKm} km
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-400">
                  Distancia
                </div>
              </div>
            </div>
          </div>

          {/* MAPA LEAFLET MOSTRANDO UBICACIÓN DE DESTINO */}
          <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-lg">
            <InteractiveMap
              initialLat={destLat}
              initialLng={destLng}
              initialAddress={tutorAddress}
              showSearch={false}
              height="300px"
              onLocationSelect={() => {}}
            />
          </div>

          {/* BOTONES DE CONTACTO CON EL TUTOR Y GPS EXTERNO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-xs active:scale-95"
            >
              <MessageCircle size={17} />
              <span>WhatsApp al Tutor</span>
            </button>

            <button
              type="button"
              onClick={() => window.open(`tel:${tutorPhone}`)}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition-all text-xs active:scale-95"
            >
              <Phone size={17} />
              <span>Llamar ({tutorPhone})</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNavigation}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-lg shadow-sky-600/20 transition-all text-xs active:scale-95"
            >
              <ExternalLink size={17} />
              <span>GPS Google / Waze</span>
            </button>
          </div>
        </div>

        {/* TARJETA DEL TUTOR Y PACIENTE (TRIAGE CLÍNICO) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <User size={18} className="text-sky-400" />
              <span>Datos del Tutor y Paciente (Triage Presencial)</span>
            </h3>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              Prioridad: Guardia
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-400">Tutor Responsable</span>
              <p className="font-extrabold text-lg text-white">{tutorName}</p>
              <p className="text-xs text-slate-400">{tutorAddress}</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-400">Paciente a Atender</span>
              <p className="font-extrabold text-lg text-white">🐾 {petName}</p>
              <p className="text-xs text-slate-400">{petDetails}</p>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert size={16} />
              <span>Motivo de Consulta y Síntomas Reportados:</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {["Decaimiento o letargo", "Vómitos repetidos", "Fiebre sospechada"].map((sym, idx) => (
                <span
                  key={idx}
                  className="bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1 rounded-lg text-xs font-bold"
                >
                  • {sym}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ACCIÓN PRINCIPAL: HE LLEGADO / INICIAR CONSULTA PRESENCIAL */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-emerald-500/10 border-2 border-emerald-500/40 rounded-3xl p-6 text-center space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-white">
              ¿Ya te encuentras en el domicilio del tutor?
            </h2>
            <p className="text-xs text-slate-300">
              Al confirmar tu llegada se habilitará la Historia Clínica presencial para el paciente {petName}.
            </p>
          </div>

          <button
            type="button"
            onClick={handleArrivedAndStartClinical}
            disabled={isArrived}
            className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-75"
          >
            {isArrived ? (
              <>
                <CheckCircle2 size={24} className="animate-bounce" />
                <span>Ingresando a Historia Clínica y Receta Electrónica...</span>
              </>
            ) : (
              <>
                <MapPin size={24} className="fill-white text-emerald-600" />
                <span>📍 Llegué al Domicilio • Iniciar Consulta Presencial</span>
                <ArrowRight size={22} />
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
