"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { 
  Power, 
  MapPin, 
  BellRing, 
  Check, 
  X, 
  ClipboardPlus, 
  Video, 
  Stethoscope,
  BadgeCheck,
  AlertTriangle,
  User,
  Clock,
  ShieldCheck,
  LogOut
} from "lucide-react";
import { ForcePasswordChangeModal } from "@/components/ui/ForcePasswordChangeModal";
import { VetAlertManager } from "@/components/vet/VetAlertManager";

export default function VetDashboard() {
  const router = useRouter();
  const isVetAvailable = useStore((state) => state.isVetAvailable);
  const setVetAvailable = useStore((state) => state.setVetAvailable);
  const vetAvailableForVideo = useStore((state) => state.vetAvailableForVideo);
  const setVetAvailableForVideo = useStore((state) => state.setVetAvailableForVideo);
  const vetAvailableForHome = useStore((state) => state.vetAvailableForHome);
  const setVetAvailableForHome = useStore((state) => state.setVetAvailableForHome);

  const currentDispatch = useStore((state) => state.currentDispatch);
  const setCurrentDispatch = useStore((state) => state.setCurrentDispatch);
  const tutorServiceType = useStore((state) => state.tutorServiceType);
  const tutorSymptoms = useStore((state) => state.tutorSymptoms);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [vetStatus, setVetStatus] = useState<string>("active");
  const [realVetId, setRealVetId] = useState<string | null>(null);
  const [vetProfile, setVetProfile] = useState<{
    name: string;
    licenseNumber: string;
    specialty?: string;
  }>({
    name: "Dr. Roberto Martínez",
    licenseNumber: "MP 14290",
    specialty: "Clínico & Urgencias"
  });

  const [mustChangePassword, setMustChangePassword] = useState(false);

  const checkVetSession = () => {
    return fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setRealVetId(data.user.id);
          setVetProfile({
            name: data.user.name || "Dr. Roberto Martínez",
            licenseNumber: data.user.licenseNumber || "MP 14290",
            specialty: data.user.specialty || "Clínico & Urgencias a Domicilio"
          });
          setVetStatus(data.user.status || "active");
          if (data.user.mustChangePassword) {
            setMustChangePassword(true);
          }
          // Guardar perfil y sesión para uso en sala de videoconsulta y mobile
          if (typeof window !== "undefined") {
            localStorage.setItem("vet_logged_in", "true");
            localStorage.setItem("avo_active_vet_profile", JSON.stringify({
              id: data.user.id,
              name: data.user.name,
              licenseNumber: data.user.licenseNumber,
              specialty: data.user.specialty,
            }));
          }
          setIsAuthenticated(true);
          return true;
        }
        return false;
      })
      .catch((err) => {
        console.error("Error loading vet from /api/auth/me:", err);
        return false;
      });
  };

  // Verificación de autenticación y carga del perfil de Veterinario en vivo
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLogged = localStorage.getItem("vet_logged_in") === "true";
      if (isLogged) {
        setIsAuthenticated(true);
        const saved = localStorage.getItem("avo_active_vet_profile");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setVetProfile((prev) => ({
              name: parsed.name || prev.name,
              licenseNumber: parsed.licenseNumber || prev.licenseNumber,
              specialty: parsed.specialty || prev.specialty
            }));
          } catch (e) {
            console.error("Error loading vet profile fallback", e);
          }
        }
        checkVetSession();
      } else {
        // Verificar contra el servidor si existe cookie httpOnly pero no está en localStorage
        checkVetSession().then((success) => {
          if (!success) {
            router.push("/vet/login");
          }
        });
      }
    }
  }, [router]);

  // Sincronizar estado global de disponibilidad online/offline con las modalidades activas
  // Y PERSISTIR en la BD para que el dispatch engine pueda encontrar al vet
  useEffect(() => {
    const isNowAvailable = vetAvailableForVideo || vetAvailableForHome;
    setVetAvailable(isNowAvailable);

    // Sincronizar isOnline con la base de datos
    if (realVetId) {
      fetch('/api/vets/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vetId: realVetId,
          lat: -34.5885,
          lng: -58.428,
          isOnline: isNowAvailable,
          actionRadiusKm: typeof window !== "undefined" ? Number(localStorage.getItem("vet_action_radius_km")) || 15 : 15,
        }),
      }).catch((err) => console.error('Error syncing vet availability to DB:', err));
    }
  }, [vetAvailableForVideo, vetAvailableForHome, setVetAvailable, realVetId]);

  const handleLogout = () => {
    // Marcar offline en BD al cerrar sesión
    if (realVetId) {
      fetch('/api/vets/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vetId: realVetId,
          lat: -34.5885,
          lng: -58.428,
          isOnline: false,
        }),
      }).catch(() => {});
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("vet_logged_in");
    }
    router.push("/vet/login");
  };

  // Temporizador de oferta 45 segundos (Uber/Cabify style)
  const [offerCountdown, setOfferCountdown] = useState<number>(45);

  // Limpiar currentDispatch si ya fue atendido, aceptado o completado para evitar alertas fantasma en el dashboard
  useEffect(() => {
    if (typeof window !== "undefined" && currentDispatch) {
      const isCompleted = localStorage.getItem("avo_dispatch_completed_" + currentDispatch.id) === "true";
      const isAccepted = localStorage.getItem("avo_dispatch_accepted_" + currentDispatch.id) === "true";
      if (isCompleted || isAccepted || currentDispatch.status === "completed" || currentDispatch.status === "cancelled") {
        setCurrentDispatch(null);
      }
    }
  }, [currentDispatch, setCurrentDispatch]);

  // Polling de recepción de urgencias — consulta al backend con vetId real
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAuthenticated && isVetAvailable && realVetId && (!currentDispatch || currentDispatch.status === 'completed' || currentDispatch.status === 'cancelled')) {
      interval = setInterval(async () => {
        try {
          let incoming: Record<string, unknown> | null = null;

          // 1. Consultar API con filtro de vetId real
          try {
            // Buscar despachos ofrecidos específicamente a este vet
            const resOffered = await fetch(`/api/dispatch?vetId=${realVetId}`);
            if (resOffered.ok) {
              const data = await resOffered.json();
              if (Array.isArray(data) && data.length > 0) {
                // Tomar el más reciente que esté ofrecido y no rechazado localmente ni atendido
                incoming = data.find((d: { id: string; status?: string }) => {
                  const isRejectedLocally = typeof window !== "undefined" && localStorage.getItem("avo_dispatch_rejected_" + d.id) === "true";
                  const isHandledLocally = typeof window !== "undefined" && (
                    localStorage.getItem("avo_dispatch_completed_" + d.id) === "true" ||
                    localStorage.getItem("avo_dispatch_accepted_" + d.id) === "true"
                  );
                  return !isRejectedLocally && !isHandledLocally && (d.status === 'offered' || d.status === 'pending');
                }) || null;
              }
            }

            // Si no hay ofertas directas, buscar despachos pendientes sin asignar (cola general)
            if (!incoming) {
              const resPending = await fetch('/api/dispatch?status=pending');
              if (resPending.ok) {
                const data = await resPending.json();
                if (Array.isArray(data)) {
                  incoming = data.find((d: { id: string; offeredVetId?: string | null; rejectedVetIds?: string; status?: string }) => {
                    // Si ya está asignada a otro vet real activo, ignorar
                    if (d.offeredVetId && d.offeredVetId !== realVetId && d.offeredVetId !== 'vet-palermo-1' && d.offeredVetId !== 'fallback') return false;
                    const isRejectedLocally = typeof window !== "undefined" && localStorage.getItem("avo_dispatch_rejected_" + d.id) === "true";
                    const isRejectedRemote = d.rejectedVetIds && typeof d.rejectedVetIds === 'string' && d.rejectedVetIds.includes(realVetId);
                    const isHandledLocally = typeof window !== "undefined" && (
                      localStorage.getItem("avo_dispatch_completed_" + d.id) === "true" ||
                      localStorage.getItem("avo_dispatch_accepted_" + d.id) === "true"
                    );
                    return !isRejectedLocally && !isRejectedRemote && !isHandledLocally && (d.status === 'pending' || d.status === 'offered');
                  }) || null;
                }
              }
            }
          } catch (e) {
            console.error("API polling error", e);
          }

          // 2. Fallback localStorage solo para demos en la misma máquina
          if (!incoming && typeof window !== "undefined") {
            const mockStr = localStorage.getItem("mock_realtime_dispatch") || localStorage.getItem("avo_pending_request");
            if (mockStr && mockStr !== "null") {
              try {
                const parsed = JSON.parse(mockStr);
                const isRejectedLocally = localStorage.getItem("avo_dispatch_rejected_" + parsed?.id) === "true";
                const isHandledLocally = (
                  localStorage.getItem("avo_dispatch_completed_" + parsed?.id) === "true" ||
                  localStorage.getItem("avo_dispatch_accepted_" + parsed?.id) === "true"
                );
                if (parsed && !isRejectedLocally && !isHandledLocally && (parsed.status === "offered" || parsed.status === "pending")) {
                  incoming = parsed;
                }
              } catch (e) {}
            }
          }

          if (incoming) {
            setCurrentDispatch(incoming as unknown as typeof currentDispatch);
            setOfferCountdown(45);
          }
        } catch (error) {
          console.error("Polling error", error);
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, isVetAvailable, realVetId, currentDispatch, setCurrentDispatch]);

  // Cuenta regresiva de 45 segundos y auto-rechazo
  useEffect(() => {
    if (!currentDispatch || (currentDispatch.status !== 'offered' && currentDispatch.status !== 'pending')) {
      return;
    }

    const timer = setInterval(() => {
      setOfferCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleReject(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentDispatch]);

  const handleAccept = async () => {
    if (currentDispatch) {
      const vetId = realVetId || 'vet-fallback';
      const isVideo = currentDispatch.serviceType === 'video' || currentDispatch.modality === 'video' || currentDispatch.price === 18000;
      const targetUrl = isVideo ? `/sala/${currentDispatch.id}` : `/vet/en-camino/${currentDispatch.id}`;
      const acceptedObj = {
        ...currentDispatch,
        status: 'accepted',
        vet_id: vetId,
        vetId: vetId,
        serviceType: isVideo ? 'video' : 'domicilio',
        modality: isVideo ? 'video' : 'domicilio'
      };
      setCurrentDispatch(acceptedObj);
      if (typeof window !== "undefined") {
        localStorage.setItem("mock_realtime_dispatch", JSON.stringify(acceptedObj));
        localStorage.setItem("avo_pending_request", JSON.stringify(acceptedObj));
        localStorage.setItem("avo_dispatch_accepted_" + currentDispatch.id, "true");
        localStorage.setItem("avo_dispatch_accepted_global", "true");
      }
      try {
        await fetch(`/api/dispatch/${currentDispatch.id}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vetId })
        });
      } catch (error) {
        console.error("Error accepting", error);
      } finally {
        router.push(targetUrl);
      }
    } else {
      router.push('/vet/atencion');
    }
  };

  const handleReject = async (isTimeout = false) => {
    if (currentDispatch) {
      const vetId = realVetId || 'vet-fallback';
      if (typeof window !== "undefined") {
        localStorage.setItem("avo_dispatch_rejected_" + currentDispatch.id, "true");
        localStorage.removeItem("mock_realtime_dispatch");
        localStorage.removeItem("avo_pending_request");
      }
      try {
        await fetch(`/api/dispatch/${currentDispatch.id}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vetId })
        });
      } catch (error) {
        console.error("Error rejecting", error);
      }
      setCurrentDispatch(null);
      if (isTimeout) {
        showToast("⏱️ Tiempo de oferta agotado (45s). Solicitud reasignada al siguiente profesional disponible.");
      } else {
        showToast("🚫 Solicitud rechazada. Reasignando automáticamente al siguiente veterinario disponible...");
      }
    }
  };

  // Demo: simular la llegada de un servicio de prueba según las preferencias habilitadas
  const triggerDemoDispatch = (modality: 'video' | 'domicilio') => {
    const demoObj = {
      id: "demo-" + Math.floor(Math.random() * 900 + 100),
      tutor_id: "usr-carlos",
      tutorName: modality === 'video' ? "Mariana Gómez (Demo)" : "Carlos Rossi (Demo)",
      petName: modality === 'video' ? "Mimi" : "Toby",
      petSpecies: modality === 'video' ? "Gato" : "Perro",
      serviceType: modality,
      modality: modality,
      symptoms: modality === 'video'
        ? "🐾 PACIENTE: Mimi (Gato - 2 años) | Decaimiento agudo | Vómitos intensos"
        : "🐾 PACIENTE: Toby (Perro - 4 años) | Dificultad respiratoria | Dolor abdominal",
      lat: -34.598,
      lng: -58.421,
      status: "offered",
      price: modality === "video" ? 18000 : 38000,
      created_at: new Date().toISOString(),
    };
    setCurrentDispatch(demoObj);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mock_realtime_dispatch", JSON.stringify(demoObj));
      } catch (e) {}
    }
    setOfferCountdown(45);
    showToast(`🔔 Solicitud entrante de ${modality === 'video' ? 'Video Consulta' : 'Urgencia a Domicilio'} recibida.`);
  };

  const statusText = () => {
    if (vetAvailableForVideo && vetAvailableForHome) {
      return "Online • Video Consulta y Domicilio";
    }
    if (vetAvailableForVideo) {
      return "Online • Solo Video Consultas";
    }
    if (vetAvailableForHome) {
      return "Online • Solo Urgencias a Domicilio";
    }
    return "Offline • Sin servicio activo";
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-6 pb-24">
      <ForcePasswordChangeModal
        isOpen={mustChangePassword}
        onSuccess={() => setMustChangePassword(false)}
      />
      {/* Toast Notificación */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 border border-primary">
          <BadgeCheck className="text-primary shrink-0" size={20} />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <div className="w-full max-w-lg mt-4 space-y-6">
        
        {/* HEADER AVO VET */}
        <header className="flex justify-between items-center bg-surface p-5 rounded-2xl clinical-shadow border border-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary/15 rounded-xl flex items-center justify-center">
              <Stethoscope size={24} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-foreground text-lg">{vetProfile.name}</span>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">
                  AVO Vet
                </span>
              </div>
              <p className="text-xs text-muted">{vetProfile.licenseNumber} • {vetProfile.specialty}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <VetAlertManager
              hasIncomingRequest={Boolean(currentDispatch && (currentDispatch.status === 'offered' || currentDispatch.status === 'pending'))}
              requestPetName={currentDispatch?.petName || "Mascota"}
            />
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isVetAvailable ? 'bg-success' : 'bg-muted'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isVetAvailable ? 'bg-success' : 'bg-muted'}`}></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider">
                {isVetAvailable ? 'Online' : 'Offline'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-colors border border-slate-700/60"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {vetStatus === "pending" ? (
          <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-3xl p-8 text-center space-y-6 clinical-shadow">
            <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border border-amber-500/40">
              <Clock size={40} className="text-amber-400 animate-pulse" />
            </div>
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full uppercase tracking-wider">
                Auditoría en Curso • AVO HQ
              </span>
              <h2 className="text-2xl font-black text-foreground">
                Documentación en Revisión
              </h2>
              <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
                Tu solicitud de registro como <strong>{vetProfile.name} ({vetProfile.licenseNumber})</strong> fue enviada con éxito y se encuentra en proceso de validación por la Dirección Médica de AVO (<strong className="text-foreground">G3r3nt3</strong>).
              </p>
            </div>
            <div className="bg-surface/80 p-4 rounded-2xl border border-border text-left space-y-2 text-xs text-muted">
              <p className="font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                Pasos para la habilitación de tu consola:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>Verificación de título universitario y matrícula CVPBA en registro central.</li>
                <li>Habilitación en el Panel de Administración de AVO por el gerente médico.</li>
                <li>Activación del seguro de praxis y asignación a la red de urgencias.</li>
              </ul>
            </div>
            <button
              onClick={() => {
                showToast("Consultando estado de validación en vivo...");
                checkVetSession();
              }}
              className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-2xl clinical-shadow flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw size={18} />
              <span>Verificar Estado de Validación</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ESTADO DE DISPONIBILIDAD (MODALIDADES AVO) */}
        <div className="clinical-card p-6 space-y-5 border border-border">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                Disponibilidad de Guardia
              </span>
              <h2 className="text-lg font-bold text-foreground">
                Modalidades de Atención
              </h2>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              isVetAvailable 
                ? 'bg-success/15 text-success' 
                : 'bg-muted/15 text-muted'
            }`}>
              {statusText()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* TOGGLE 1: VIDEO CONSULTAS */}
            <button
              type="button"
              onClick={() => setVetAvailableForVideo(!vetAvailableForVideo)}
              className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start justify-between gap-3 ${
                vetAvailableForVideo
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border bg-background hover:border-muted opacity-75'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${vetAvailableForVideo ? 'bg-primary text-white' : 'bg-muted/20 text-muted'}`}>
                    <Video size={18} />
                  </div>
                  <span className="font-bold text-sm text-foreground">
                    Video Consulta
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Atiende por videollamada HD al instante.
                </p>
              </div>

              <div className="pt-1">
                <div className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${vetAvailableForVideo ? 'bg-primary justify-end' : 'bg-slate-300 justify-start'}`}>
                  <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                </div>
              </div>
            </button>

            {/* TOGGLE 2: URGENCIA A DOMICILIO */}
            <button
              type="button"
              onClick={() => setVetAvailableForHome(!vetAvailableForHome)}
              className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start justify-between gap-3 ${
                vetAvailableForHome
                  ? 'border-success bg-success/10 shadow-sm'
                  : 'border-border bg-background hover:border-muted opacity-75'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${vetAvailableForHome ? 'bg-success text-white' : 'bg-muted/20 text-muted'}`}>
                    <MapPin size={18} />
                  </div>
                  <span className="font-bold text-sm text-foreground">
                    A Domicilio
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Atención veterinaria presencial a domicilio.
                </p>
              </div>

              <div className="pt-1">
                <div className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${vetAvailableForHome ? 'bg-success justify-end' : 'bg-slate-300 justify-start'}`}>
                  <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                </div>
              </div>
            </button>
          </div>

          {/* RADIO DE ACCIÓN / COBERTURA GEOGRÁFICA PARA VISITAS A DOMICILIO */}
          {vetAvailableForHome && (
            <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-success/5 p-3.5 rounded-2xl border border-success/20 animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-success shrink-0" />
                <div>
                  <span className="font-bold text-foreground block">Radio de Cobertura a Domicilio</span>
                  <span className="text-[11px] text-muted">Distancia máxima de despacho por GPS</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {[5, 10, 15, 25, 50].map((rad) => (
                  <button
                    key={rad}
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        localStorage.setItem("vet_action_radius_km", String(rad));
                      }
                      showToast(`📍 Radio de cobertura actualizado a ${rad} km.`);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-success/30 hover:bg-success hover:text-white font-extrabold transition-all text-xs text-success"
                  >
                    {rad} km
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Botones rápidos para probar una alerta entrante de demostración */}
          <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <span className="text-muted font-medium">⚡ Simular solicitud entrante de prueba:</span>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => triggerDemoDispatch('video')}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Video size={14} />
                <span>Simular Video</span>
              </button>
              <button
                onClick={() => triggerDemoDispatch('domicilio')}
                className="px-3 py-1.5 bg-success/10 hover:bg-success/20 text-success font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <MapPin size={14} />
                <span>Simular Domicilio</span>
              </button>
            </div>
          </div>
        </div>

        {/* ALERTA / TARJETA DE URGENCIA ENTRANTE */}
        {currentDispatch && (currentDispatch.status === 'offered' || currentDispatch.status === 'pending') && (typeof window === "undefined" || (localStorage.getItem("avo_dispatch_completed_" + currentDispatch.id) !== "true" && localStorage.getItem("avo_dispatch_accepted_" + currentDispatch.id) !== "true")) ? (() => {
          const isVideoDispatch = currentDispatch.serviceType === 'video' || currentDispatch.modality === 'video' || currentDispatch.price === 18000;
          let symList: string[] = [];
          if (Array.isArray(currentDispatch.symptoms)) {
            symList = currentDispatch.symptoms;
          } else if (typeof currentDispatch.symptoms === 'string' && currentDispatch.symptoms.trim()) {
            symList = currentDispatch.symptoms.split('|').map((s: string) => s.trim()).filter(Boolean);
          } else if (tutorSymptoms && tutorSymptoms.length > 0) {
            symList = tutorSymptoms;
          }
          return (
          <div className="bg-surface rounded-3xl p-6 clinical-shadow border-2 border-primary animate-in fade-in slide-in-from-bottom-6 duration-300 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center animate-bounce">
                  {isVideoDispatch ? (
                    <Video size={26} className="text-primary" />
                  ) : (
                    <BellRing size={26} className="text-primary" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {isVideoDispatch ? "📹 Video Consulta AVO" : "🏠 Atención Domiciliaria - Oferta en curso"}
                  </span>
                  <h3 className="text-xl font-bold text-foreground">
                    ¡Nueva Solicitud Entrante!
                  </h3>
                </div>
              </div>

              <span className="text-2xl font-black text-foreground">
                ${currentDispatch.price?.toLocaleString("es-AR") || (isVideoDispatch ? "18.000" : "38.000")}
              </span>
            </div>

            {/* TEMPORIZADOR DE OFERTA DE 45 SEGUNDOS (ESTILO UBER) */}
            <div className="space-y-2">
              <div className="bg-primary/10 border border-primary/25 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="text-primary animate-pulse" size={18} />
                  <span className="text-xs font-bold text-foreground">
                    Tiempo para aceptar la consulta:
                  </span>
                </div>
                <span className={`text-sm font-black px-3 py-1 rounded-full shadow-sm ${offerCountdown <= 15 ? 'bg-red-600 text-white animate-pulse' : 'bg-primary text-white'}`}>
                  00:{offerCountdown < 10 ? `0${offerCountdown}` : offerCountdown}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ease-linear ${offerCountdown <= 15 ? 'bg-red-500' : 'bg-primary'}`}
                  style={{ width: `${(offerCountdown / 45) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-3 bg-background p-4 rounded-2xl border border-border text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Tutor:</span>
                <span className="font-bold text-foreground">{currentDispatch.tutorName || "Tutor AVO"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Mascota:</span>
                <span className="font-bold text-foreground">{currentDispatch.petName || "Mascota"} ({currentDispatch.petSpecies || "Perro"})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Distancia estimada:</span>
                <span className="font-bold text-success">{isVideoDispatch ? "Online (Video)" : "2.4 km (~8 min)"}</span>
              </div>
              {symList.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
                    Síntomas detectados en Triage:
                  </span>
                  <div className="flex flex-col gap-1.5 mt-1">
                    {symList.map((sym, idx) => (
                      <span key={idx} className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-md">
                        {sym}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => handleReject(false)}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
              >
                <X size={20} />
                <span>Rechazar</span>
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-success hover:bg-success/90 text-white font-bold rounded-xl shadow-lg shadow-success/30 transition-all active:scale-95"
              >
                <Check size={20} />
                <span>Aceptar Ahora</span>
              </button>
            </div>
          </div>
          );
        })() : (
          <div className="clinical-card p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <ClipboardPlus size={28} />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-lg">
                Sin urgencias asignadas
              </h3>
              <p className="text-sm text-muted">
                {isVetAvailable 
                  ? "Estás online. Te avisaremos cuando un tutor solicite atención en tus modalidades activas."
                  : "Activa al menos una modalidad (Video o Domicilio) para comenzar a recibir solicitudes en vivo."}
              </p>
            </div>
          </div>
        )}
          </div>
        )}

        {/* ENLACE DE AYUDA Y TERMINOS */}
        <div className="text-center text-xs text-muted">
          AVO Vet Platform v0.2 • Sistema Inteligente de Despacho Médico
        </div>
      </div>
    </main>
  );
}
