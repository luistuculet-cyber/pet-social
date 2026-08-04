"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Zap,
  XCircle,
  CheckCircle2,
  Users,
  Navigation,
  ArrowLeft,
  Radio,
  Eye,
  UserCheck
} from "lucide-react";

interface AdminVet {
  id: string;
  name: string;
  email: string;
  status: string;
  lat: number;
  lng: number;
  isOnline: boolean;
  actionRadiusKm: number;
}

interface AdminDispatch {
  id: string;
  tutorId: string;
  vetId?: string | null;
  offeredVetId?: string | null;
  offerExpiresAt?: string | null;
  attemptCount: number;
  lat: number;
  lng: number;
  status: string;
  price: number;
  serviceType: string;
  symptoms?: string;
  petName: string;
  petSpecies: string;
  createdAt: string;
}

export default function ControlTowerOperations() {
  const router = useRouter();
  const [vets, setVets] = useState<AdminVet[]>([]);
  const [dispatches, setDispatches] = useState<AdminDispatch[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({
    activeDispatchesCount: 0,
    onlineVetsCount: 0,
    totalVets: 0,
    totalDispatches: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [selectedVetForOverride, setSelectedVetForOverride] = useState<{ [dispatchId: string]: string }>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadOperations = async () => {
    try {
      const res = await fetch("/api/admin/operations");
      if (res.ok) {
        const data = await res.json();
        setVets(data.vets || []);
        setDispatches(data.dispatches || []);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error("Error loading operations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperations();
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadOperations, 5000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleOverride = async (dispatchId: string, action: string, targetVetId?: string) => {
    try {
      const res = await fetch("/api/admin/operations/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatchId, action, targetVetId }),
      });
      if (res.ok) {
        showToast(`⚡ Intervención aplicada (${action.toUpperCase()}) exitosamente.`);
        loadOperations();
      } else {
        showToast("❌ Error al aplicar intervención manual.");
      }
    } catch (err) {
      console.error("Error in handleOverride:", err);
    }
  };

  // Convertir coordenadas en una posición simple en canvas relativo (-34.6, -58.4 centro CABA)
  const getMapPosition = (lat: number, lng: number) => {
    const minLat = -34.68;
    const maxLat = -34.52;
    const minLng = -58.52;
    const maxLng = -58.35;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    return {
      top: `${Math.max(8, Math.min(92, y))}%`,
      left: `${Math.max(8, Math.min(92, x))}%`,
    };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-sky-500 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <Zap className="text-sky-400 shrink-0" size={20} />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Torre de Control */}
      <header className="bg-slate-900/90 border-b border-slate-800 py-4 px-6 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors flex items-center gap-2 text-xs font-bold"
            >
              <ArrowLeft size={16} />
              <span>Volver al HQ</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h1 className="text-lg font-black text-white tracking-tight">
                  AVO • Torre de Control de Operaciones en Vivo
                </h1>
                <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full font-extrabold uppercase">
                  24/7 Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Monitoreo satelital de unidades veterinarias a domicilio, despacho automatizado e intervención manual
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                autoRefresh
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              <RefreshCw size={14} className={autoRefresh ? "animate-spin" : ""} />
              <span>{autoRefresh ? "Auto-refresh: ACTIVO (5s)" : "Auto-refresh: PAUSADO"}</span>
            </button>
            <button
              onClick={loadOperations}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700"
              title="Refrescar Ahora"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-6 py-8 w-full flex-1 space-y-8">
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">
                Urgencias en Curso
              </p>
              <p className="text-3xl font-black text-white mt-1">
                {stats.activeDispatchesCount || 0}
              </p>
              <span className="inline-flex items-center gap-1 text-xs text-sky-400 font-bold mt-2">
                <Activity size={14} />
                Despachos Activos
              </span>
            </div>
            <div className="w-12 h-12 bg-sky-500/10 rounded-xl flex items-center justify-center">
              <Radio size={24} className="text-sky-400 animate-pulse" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">
                Flota Veterinaria Online
              </p>
              <p className="text-3xl font-black text-white mt-1">
                {stats.onlineVetsCount || 0}
              </p>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-bold mt-2">
                <UserCheck size={14} />
                De {stats.totalVets || 0} registrados
              </span>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <Navigation size={24} className="text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">
                ETA Promedio de Guardia
              </p>
              <p className="text-3xl font-black text-white mt-1">
                11 <span className="text-base font-normal text-slate-400">min</span>
              </p>
              <span className="inline-flex items-center gap-1 text-xs text-purple-400 font-bold mt-2">
                <Clock size={14} />
                Tiempo de arribo
              </span>
            </div>
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-purple-400" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">
                Radio Máx. de Cobertura
              </p>
              <p className="text-3xl font-black text-white mt-1">
                25 <span className="text-base font-normal text-slate-400">km</span>
              </p>
              <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-bold mt-2">
                <MapPin size={14} />
                CABA y GBA
              </span>
            </div>
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <MapPin size={24} className="text-amber-400" />
            </div>
          </div>
        </div>

        {/* SECCIÓN MAPA RADAR EN VIVO & FLOTA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MAPA OPERATIVO RADAR (CABA / GBA) */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                  Radar Geoespacial en Vivo
                </span>
                <h2 className="text-lg font-bold text-white">
                  Mapa de Unidades a Domicilio, Vets Online & Urgencias
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Radar Activo</span>
              </span>
            </div>

            {/* RADAR CANVAS SIMULADO */}
            <div className="w-full h-96 bg-slate-950 rounded-2xl border border-slate-800/80 relative overflow-hidden flex items-center justify-center">
              {/* Círculos concéntricos del radar */}
              <div className="absolute w-72 h-72 rounded-full border border-slate-800/60" />
              <div className="absolute w-48 h-48 rounded-full border border-slate-800/80" />
              <div className="absolute w-24 h-24 rounded-full border border-slate-700" />
              <div className="absolute w-full h-px bg-slate-800/80" />
              <div className="absolute h-full w-px bg-slate-800/80" />

              <span className="absolute top-4 left-4 text-[11px] font-mono text-slate-500">
                Centro: CABA / GBA (-34.60, -58.38)
              </span>

              {/* PINS DE VETERINARIOS ONLINE */}
              {vets.map((vet) => {
                const pos = getMapPosition(vet.lat, vet.lng);
                return (
                  <div
                    key={vet.id}
                    style={{ top: pos.top, left: pos.left }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group z-20"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 ${
                      vet.isOnline ? "bg-emerald-500 border-white text-white" : "bg-slate-700 border-slate-600 text-slate-300"
                    }`}>
                      <Navigation size={15} />
                    </div>
                    {/* Tooltip con nombre y radio */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl z-30">
                      <p className="font-bold">{vet.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {vet.isOnline ? "🟢 Online" : "⚫ Offline"} • Radio: {vet.actionRadiusKm}km
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* PINS DE SOLICITUDES / URGENCIAS */}
              {dispatches.map((dsp) => {
                const pos = getMapPosition(dsp.lat, dsp.lng);
                return (
                  <div
                    key={dsp.id}
                    style={{ top: pos.top, left: pos.left }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group z-30"
                  >
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-xl border-2 ${
                      dsp.status === "offered" || dsp.status === "pending"
                        ? "bg-amber-500 border-white text-slate-950 animate-bounce"
                        : dsp.status === "accepted" || dsp.status === "in_progress"
                        ? "bg-sky-500 border-white text-white"
                        : "bg-emerald-600 border-white text-white"
                    }`}>
                      <MapPin size={18} />
                    </div>
                    {/* Tooltip de solicitud */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl whitespace-nowrap shadow-xl z-40">
                      <p className="font-bold">{dsp.petName} ({dsp.petSpecies})</p>
                      <p className="text-[10px] text-amber-400 font-bold uppercase">
                        Estado: {dsp.status} • Intento #{dsp.attemptCount}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 pt-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span>Veterinario Online</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  <span>Urgencia en Oferta (45s)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" />
                  <span>Unidad a Domicilio Aceptada / En Curso</span>
                </span>
              </div>
              <span>Coordenadas actualizadas con motor Haversine AVO v0.4</span>
            </div>
          </div>

          {/* FLOTA DE VETERINARIOS Y ESTADOS ONLINE */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Unidades en Guardia
              </span>
              <h2 className="text-lg font-bold text-white">
                Flota Veterinaria ({vets.filter(v => v.isOnline).length} online)
              </h2>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {vets.map((vet) => (
                <div
                  key={vet.id}
                  className="bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${vet.isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                      <span className="font-bold text-sm text-white">{vet.name}</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Radio: <strong className="text-slate-300">{vet.actionRadiusKm} km</strong> • GPS: {vet.lat.toFixed(3)}, {vet.lng.toFixed(3)}
                    </p>
                  </div>

                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    vet.isOnline
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-slate-800 text-slate-400"
                  }`}>
                    {vet.isOnline ? "EN GUARDIA" : "OFFLINE"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECCIÓN DESPACHOS ACTIVOS E INTERVENCIÓN MANUAL (DISPATCH OVERRIDE) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Intervención de Emergencia (Dispatcher Override)
              </span>
              <h2 className="text-xl font-bold text-white">
                Gestión en Vivo de Solicitudes y Reasignación de Turnos
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Temporizador de Oferta: 45s / Reintentos en cola
            </span>
          </div>

          <div className="space-y-4">
            {dispatches.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                No hay solicitudes en el registro actual.
              </div>
            ) : (
              dispatches.map((dsp) => (
                <div
                  key={dsp.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-slate-700 transition-all"
                >
                  {/* Datos del paciente y estado */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs bg-slate-900 text-sky-400 px-3 py-1 rounded-full font-bold border border-slate-800">
                        #{dsp.id.slice(-6)}
                      </span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        dsp.status === "offered"
                          ? "bg-amber-500/20 text-amber-400 animate-pulse border border-amber-500/40"
                          : dsp.status === "accepted" || dsp.status === "in_progress"
                          ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                          : dsp.status === "cancelled"
                          ? "bg-red-500/20 text-red-400 border border-red-500/40"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      }`}>
                        ESTADO: {dsp.status.toUpperCase()}
                      </span>
                      {dsp.attemptCount > 0 && (
                        <span className="text-xs bg-slate-900 text-slate-400 px-2.5 py-1 rounded-full font-medium border border-slate-800">
                          Intento #{dsp.attemptCount}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white">
                      {dsp.petName} <span className="text-sm font-normal text-slate-400">({dsp.petSpecies})</span>
                    </h3>
                    <p className="text-sm text-slate-300">
                      <strong className="text-slate-400">Síntomas:</strong> {dsp.symptoms || "Consulta domiciliaria de urgencia"}
                    </p>
                    <p className="text-xs text-slate-400">
                      Coordenadas: <span className="font-mono text-slate-300">{dsp.lat}, {dsp.lng}</span> • Modalidad: {dsp.serviceType}
                    </p>
                  </div>

                  {/* CONTROLES DE INTERVENCIÓN MANUAL (DISPATCHER OVERRIDE) */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-t lg:border-t-0 border-slate-800 pt-4 lg:pt-0">
                    {/* Selector de veterinario para reasignación directa */}
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedVetForOverride[dsp.id] || ""}
                        onChange={(e) =>
                          setSelectedVetForOverride({
                            ...selectedVetForOverride,
                            [dsp.id]: e.target.value,
                          })
                        }
                        className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 font-semibold"
                      >
                        <option value="">-- Asignar manual --</option>
                        {vets.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.isOnline ? "Online" : "Offline"})
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => {
                          const target = selectedVetForOverride[dsp.id];
                          if (!target) {
                            showToast("⚠️ Elige un profesional del listado primero");
                            return;
                          }
                          handleOverride(dsp.id, "reassign", target);
                        }}
                        className="px-3.5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-sky-500/20 whitespace-nowrap"
                      >
                        ⚡ Reasignar
                      </button>
                    </div>

                    <button
                      onClick={() => handleOverride(dsp.id, "next")}
                      title="Pasar automáticamente al siguiente profesional cercano en radio"
                      className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-xl text-xs border border-slate-700 transition-colors whitespace-nowrap"
                    >
                      🔄 Siguiente
                    </button>

                    {dsp.status !== "cancelled" && dsp.status !== "completed" && (
                      <button
                        onClick={() => handleOverride(dsp.id, "cancel")}
                        title="Cancelar urgencia administrativamente"
                        className="px-3.5 py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 font-bold rounded-xl text-xs border border-red-500/30 transition-colors whitespace-nowrap"
                      >
                        🚫 Cancelar
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
