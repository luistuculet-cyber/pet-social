'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { CheckCircle2, Loader2, Phone, Video, AlertCircle, RefreshCw, MessageSquare, XCircle } from 'lucide-react';
import { InAppBrowserGuard } from '@/components/common/InAppBrowserGuard';

export default function EsperaPage() {
  const router = useRouter();
  const currentDispatch = useStore((state) => state.currentDispatch);
  const setCurrentDispatch = useStore((state) => state.setCurrentDispatch);
  const [status, setStatus] = useState<'pending' | 'accepted' | 'in_progress'>('pending');
  const [vetName, setVetName] = useState<string>('Dr. Roberto Martínez');
  const [waitTimeSeconds, setWaitTimeSeconds] = useState(0);
  const [isRebroadcasting, setIsRebroadcasting] = useState(false);

  useEffect(() => {
    if (currentDispatch?.vet?.name) {
      const name = currentDispatch.vet.name;
      const id = setTimeout(() => setVetName(name), 0);
      return () => clearTimeout(id);
    }
    if (typeof window !== 'undefined') {
      try {
        const profsStr = localStorage.getItem('avo_registered_professionals');
        if (profsStr) {
          const profs = JSON.parse(profsStr);
          if (profs && profs.length > 0) {
            const name = `Dr. ${profs[0].fullName || profs[0].name}`;
            const id = setTimeout(() => setVetName(name), 0);
            return () => clearTimeout(id);
          }
        }
      } catch (e) {
        console.error('Error reading registered professionals:', e);
      }
    }
  }, [currentDispatch]);

  useEffect(() => {
    if (!currentDispatch) {
      if (typeof window !== "undefined") {
        const mockStr = localStorage.getItem("mock_realtime_dispatch") || localStorage.getItem("avo_pending_request");
        if (mockStr) {
          try {
            const p = JSON.parse(mockStr);
            if (p && p.id) {
              setCurrentDispatch(p);
              return;
            }
          } catch (e) {}
        }
      }
      router.replace('/');
      return;
    }

    const interval = setInterval(async () => {
      try {
        // 1. FUENTE PRINCIPAL: Consultar al backend oficial (funciona entre dispositivos distintos)
        try {
          const res = await fetch(`/api/dispatch/${currentDispatch.id}?t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
          });
          if (res.ok) {
            const updatedDispatch = await res.json();

            if (updatedDispatch.status === 'completed') {
              clearInterval(interval);
              router.replace('/finalizado');
              return;
            }

            if (updatedDispatch.status === 'accepted' || updatedDispatch.status === 'in_progress') {
              setCurrentDispatch(updatedDispatch);
              if (status !== 'accepted') {
                setStatus('accepted');
              }
              return; // Ya resuelto, no seguir verificando localStorage
            }

            if (updatedDispatch.status === 'cancelled') {
              clearInterval(interval);
              setCurrentDispatch(null);
              router.replace('/');
              return;
            }
          }

          // Verificación complementaria robusta en BD: si hay un despacho recientemente aceptado, enlazarlo automáticamente
          if (status !== 'accepted') {
            const resAcc = await fetch(`/api/dispatch?status=accepted&t=${Date.now()}`, {
              cache: 'no-store',
              headers: { 'Cache-Control': 'no-cache' },
            });
            if (resAcc.ok) {
              const acceptedList = await resAcc.json();
              if (Array.isArray(acceptedList) && acceptedList.length > 0) {
                const latestAcc = acceptedList[0];
                setCurrentDispatch(latestAcc);
                setStatus('accepted');
                return;
              }
            }
          }
        } catch (apiError) {
          console.error('API polling error (will retry):', apiError);
        }

        // 2. FUENTE COMPLEMENTARIA: localStorage (para demos en misma máquina)
        if (typeof window !== "undefined") {
          const isCompletedFlag = localStorage.getItem(`avo_dispatch_completed_${currentDispatch.id}`) === "true";
          const isCompletedGlobal = localStorage.getItem("avo_dispatch_completed_global") === "true";
          const isAcceptedFlag = localStorage.getItem(`avo_dispatch_accepted_${currentDispatch.id}`) === "true";
          const isAcceptedGlobal = localStorage.getItem("avo_dispatch_accepted_global") === "true";

          const mockStr = localStorage.getItem("mock_realtime_dispatch");
          const pendStr = localStorage.getItem("avo_pending_request");
          let mockStatus = "";
          if (mockStr) {
            try { mockStatus = JSON.parse(mockStr).status; } catch (e) {}
          }
          if (!mockStatus && pendStr) {
            try { mockStatus = JSON.parse(pendStr).status; } catch (e) {}
          }

          if (isCompletedFlag || isCompletedGlobal || mockStatus === "completed") {
            clearInterval(interval);
            router.replace('/finalizado');
            return;
          }

          if (isAcceptedFlag || isAcceptedGlobal || mockStatus === "accepted" || mockStatus === "in_progress") {
            if (status !== 'accepted') {
              setStatus('accepted');
            }
          }
        }
      } catch (error) {
        console.error('Polling error', error);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [currentDispatch, status, setCurrentDispatch, router]);

  const isVideoOrder =
    currentDispatch?.serviceType === 'video' ||
    currentDispatch?.modality === 'video' ||
    currentDispatch?.price === 18000;

  useEffect(() => {
    if (status !== 'pending') return;
    const timer = setInterval(() => {
      setWaitTimeSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if ((status === 'accepted' || status === 'in_progress') && isVideoOrder && currentDispatch?.id) {
      const t = setTimeout(() => {
        router.push(`/sala/${currentDispatch.id}`);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [status, isVideoOrder, currentDispatch, router]);

  const handleRebroadcast = async () => {
    setIsRebroadcasting(true);
    try {
      if (currentDispatch?.id) {
        await fetch(`/api/dispatch/reassign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dispatchId: currentDispatch.id, expandRadius: true }),
        });
      }
    } catch (e) {
      console.warn("Rebroadcast info:", e);
    } finally {
      setTimeout(() => setIsRebroadcasting(false), 2000);
    }
  };

  const handleWhatsAppSupport = () => {
    const msg = encodeURIComponent(`Hola Soporte AVO, estoy esperando asignación para mi consulta (Orden #${currentDispatch?.id || "AVO-001"}). ¿Me podrán ayudar?`);
    window.open(`https://wa.me/5491155550000?text=${msg}`, "_blank");
  };

  const handleCancelRequest = async () => {
    if (!confirm("¿Deseas cancelar tu solicitud de consulta? Te asistiremos con la devolución o reagendamiento.")) return;
    try {
      if (currentDispatch?.id) {
        await fetch(`/api/dispatch/${currentDispatch.id}/reject`, { method: "POST" });
      }
    } catch (e) {}
    localStorage.removeItem("avo_pending_request");
    router.push("/registro-tutor");
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-50">
        <InAppBrowserGuard />
      </div>

      {status === 'pending' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-[300px] h-[300px] border border-primary/20 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
          <div className="absolute w-[450px] h-[450px] border border-primary/10 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_1s]"></div>
        </div>
      )}

      <div className="z-10 w-full max-w-md clinical-card p-8 flex flex-col items-center text-center space-y-6">
        {status === 'pending' ? (
          <>
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center relative">
              <Loader2 size={40} className="text-primary animate-spin" />
              <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Buscando Veterinario...</h2>
              <p className="text-muted">
                Estamos enviando la alerta a los profesionales disponibles en tu zona. El pago ha
                sido pre-autorizado con éxito.
              </p>
            </div>

            {waitTimeSeconds >= 60 && (
              <div className="mt-4 w-full bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-xl animate-fade-in space-y-3 text-left">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-bold">¿La búsqueda está tardando más de lo habitual?</p>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tu posición en la fila está asegurada. Puedes ampliar el radio de aviso a todos los veterinarios activos o contactar con nuestro equipo en vivo.
                </p>
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRebroadcast}
                    disabled={isRebroadcasting}
                    className="w-full py-2.5 px-3 bg-primary hover:bg-primary/90 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRebroadcasting ? "animate-spin" : ""}`} />
                    {isRebroadcasting ? "Notificando a los veterinarios..." : "🚀 Reenviar Alerta a Veterinarios"}
                  </button>
                  <button
                    type="button"
                    onClick={handleWhatsAppSupport}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <MessageSquare className="w-4 h-4" />
                    💬 Asistencia Directa por WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    className="w-full py-2 px-3 bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancelar Consulta y Solicitar Reintegro
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle2 size={48} className="text-success" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">¡Consulta Aceptada!</h2>
              <p className="text-muted">{vetName} ha tomado tu consulta.</p>
            </div>

            <div className="w-full bg-background border border-border p-4 rounded-xl text-left flex items-center gap-4 mt-4">
              <div className="w-12 h-12 bg-slate-200 rounded-full overflow-hidden flex-shrink-0">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                  alt="Vet"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">{vetName}</p>
                <p className="text-xs text-muted">Matrícula AVO Verificada</p>
              </div>
              <button className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Phone size={20} />
              </button>
            </div>

            <div className="w-full pt-4 border-t border-border mt-4 space-y-3">
              {isVideoOrder ? (
                <button
                  onClick={() => router.push(`/sala/${currentDispatch?.id || 'demo-dispatch-1'}`)}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-xl shadow-lg transition-colors animate-pulse"
                >
                  <Video size={20} />
                  <span>ENTRAR A VIDEOCONSULTA EN VIVO</span>
                </button>
              ) : (
                <button
                  onClick={() => router.push('/tracking')}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-extrabold py-3.5 rounded-xl shadow-lg transition-colors"
                >
                  <span>SEGUIR EN EL MAPA EN TIEMPO REAL</span>
                </button>
              )}

              <button
                onClick={() => router.push('/')}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs transition-colors"
              >
                Volver al Inicio
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
