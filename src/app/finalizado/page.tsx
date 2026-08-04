"use client";

import { CheckCircle, FileText, Star, HeartPulse, ChevronRight, ShieldCheck, PawPrint, Stethoscope } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { useEffect } from "react";

export default function FinalizadoPage() {
  const router = useRouter();
  const setCurrentDispatch = useStore((state) => state.setCurrentDispatch);

  // Limpiamos el dispatch global al entrar aquí para que la app se reinicie limpia si vuelven a home
  useEffect(() => {
    setCurrentDispatch(null);
  }, [setCurrentDispatch]);

  return (
    <main className="min-h-screen bg-background flex flex-col items-center py-12 px-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="w-full max-w-md space-y-6">
        
        {/* Encabezado de Alivio */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-success/10 rounded-3xl flex items-center justify-center mx-auto shadow-md border-2 border-success/30 relative">
            <PawPrint size={40} className="text-success" />
            <div className="absolute -bottom-2 -right-2 bg-success text-white p-1.5 rounded-xl shadow-sm border-2 border-background">
              <Stethoscope size={18} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">¡Consulta Finalizada!</h1>
          <p className="text-muted text-lg">
            Esperamos que tu mascota ya se encuentre mucho mejor. El pago ha sido procesado exitosamente.
          </p>
        </div>

        <div className="py-2 border-b border-border"></div>

        <div className="space-y-4">
          <h2 className="font-bold text-foreground text-center">¿Qué sigue ahora?</h2>

          {/* Opción Destacada: Registro Gratuito para guardar HC y compartir con veterinario */}
          <div className="relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-sky-500 to-emerald-500 text-white text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider shadow-md z-10 animate-pulse">
              100% Gratuito • Recomendado
            </div>
            <button 
              onClick={() => router.push('/registro-tutor?tipo=gratis')}
              className="w-full bg-gradient-to-br from-sky-950 via-slate-900 to-emerald-950 p-5 pt-6 rounded-2xl shadow-2xl border-2 border-sky-400/40 hover:border-sky-400 text-left transition-all group flex items-start gap-4"
            >
              <div className="bg-sky-500/20 p-3 rounded-full text-sky-400 shrink-0">
                <FileText size={24} />
              </div>
              <div className="flex-1 text-white">
                <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                  Terminar de Registrarme Gratis
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 mt-1 leading-relaxed">
                  Crea tu usuario para acceder siempre a la Historia Clínica de tu mascota. En próximas consultas, el veterinario verá automáticamente todos los datos y su ficha médica.
                </p>
              </div>
              <div className="mt-2 text-sky-400 group-hover:translate-x-1.5 transition-transform font-black text-lg">
                &rarr;
              </div>
            </button>
          </div>

          {/* Botón Principal: Ver Historia Clínica Temporal */}
          <button
            onClick={() => { window.location.href = "/tutor/perfil"; }}
            className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white p-4 rounded-2xl shadow-md text-left transition-all flex items-center gap-4 group"
          >
            <div className="bg-white/10 p-2.5 rounded-full text-white">
              <PawPrint size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm">
                📂 Entrar al Perfil como Invitado
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ver reporte médico actual y consultar farmacias.
              </p>
            </div>
            <div className="text-slate-400 font-bold group-hover:translate-x-1 transition-transform">
              &rarr;
            </div>
          </button>

          {/* Upsell 2: Plan Premium */}
          <div className="relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm z-10">
              Recomendado
            </div>
            <button 
              onClick={() => router.push('/registro-tutor?tipo=premium')}
              className="w-full bg-gradient-to-br from-slate-900 to-slate-800 p-5 pt-6 rounded-2xl shadow-xl text-left hover:scale-[1.02] transition-transform group flex items-start gap-4"
            >
              <div className="bg-amber-400/20 p-3 rounded-full text-amber-400">
                <Star size={24} className="fill-amber-400" />
              </div>
              <div className="flex-1 text-white">
                <h3 className="font-bold text-lg">Hazte Premium</h3>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                  Ahorra hasta 40% en tu próxima consulta, vacunas y en petshops asociados.
                </p>
                <div className="flex items-center gap-2 mt-3 text-amber-400 text-sm font-semibold">
                  <ShieldCheck size={16} /> Ver Planes Premium
                </div>
              </div>
            </button>
          </div>

        </div>

        <div className="text-center pt-8">
          <button 
            onClick={() => router.push('/')}
            className="text-muted text-sm font-medium hover:text-foreground transition-colors"
          >
            No, gracias. Volver al inicio
          </button>
        </div>

      </div>
    </main>
  );
}
