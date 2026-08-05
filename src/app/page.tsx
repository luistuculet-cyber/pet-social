"use client";

import { useState } from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, 
  MapPin, 
  Stethoscope, 
  Video, 
  PawPrint, 
  User, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles,
  X,
  Lock,
  ArrowRight,
  Briefcase
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function LandingPage() {
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative overflow-hidden">
      
      {/* Abstract Medical Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-sky-500/10 via-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* HEADER / NAVBAR (ESTILO UBER / CABIFY) */}
      <header className="z-20 border-b border-slate-800 bg-slate-950 sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          
          {/* Logo AVO */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-tr from-sky-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <PawPrint size={22} className="text-white" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-foreground flex items-center gap-1">
                AVO <span className="text-xs bg-sky-500/20 text-sky-400 font-bold px-2 py-0.5 rounded-full">AVO-Beta-V1.0.0-deploy</span>
              </span>
              <p className="text-xs text-muted font-semibold uppercase tracking-widest hidden sm:block">
                Asistencia Veterinaria Online
              </p>
            </div>
          </Link>

          {/* Navegación y Acceso Discreto "Trabajá con nosotros" */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Enlace Discreto para Veterinarios (Estilo Uber Driver "Trabajá con nosotros") */}
            <Link
              href="/vet/registro"
              className="text-xs font-semibold text-muted hover:text-emerald-500 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-surface transition-colors border border-transparent hover:border-border"
            >
              <Briefcase size={14} className="text-emerald-400" />
              <span className="hidden sm:inline">Trabajá con nosotros</span>
              <span className="sm:hidden">Soy Vet</span>
            </Link>

            <ThemeToggle />

            {/* Botón Iniciar Sesión Unificado */}
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-2 bg-surface hover:bg-primary/10 text-foreground text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl border border-border shadow-md transition-all active:scale-95"
            >
              <User size={16} className="text-primary" />
              <span>Iniciar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* SECCIÓN PRINCIPAL (HERO ORIENTADO AL TUTOR) */}
      <main className="z-10 flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center text-center justify-center space-y-8">
        
        {/* Badge de Servicio */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-500 text-xs font-bold uppercase tracking-wider animate-in fade-in duration-500">
          <Sparkles size={14} />
          <span>Atención Veterinaria Inmediata 24/7</span>
        </div>

        {/* Título Principal */}
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-4xl sm:text-6xl font-black text-foreground tracking-tight leading-tight">
            Cuidado profesional para tu mascota, <span className="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">al instante.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted max-w-xl mx-auto">
            Elige entre consulta médica remota por videollamada o visita veterinaria a domicilio. Triage inteligente en segundos.
          </p>
        </div>

        {/* Botón Principal estilo Uber (Llamado a la Acción del Tutor) */}
        <div className="w-full max-w-md space-y-3">
          <Link
            href="/solicitar"
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-sky-500 via-sky-600 to-emerald-500 text-white text-lg sm:text-xl font-bold py-5 rounded-2xl shadow-xl shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <ShieldAlert size={26} />
            <span>Pedir Asistencia Veterinaria</span>
            <ChevronRight size={22} />
          </Link>
          <div className="flex items-center justify-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-emerald-500" /> Médicos Matriculados</span>
            <span>•</span>
            <span>Pagos MODO / Payway</span>
          </div>
        </div>

        {/* Tarjetas de Modalidad (Video vs Domicilio) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl pt-4">
          <div className="bg-surface/80 border border-border p-5 rounded-2xl text-left space-y-2 hover:border-sky-500/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-500">
              <Video size={22} />
            </div>
            <h3 className="font-bold text-foreground text-base">Video Consulta</h3>
            <p className="text-xs text-muted">
              Conexión directa por video para orientación rápida, síntomas leves y recetas.
            </p>
          </div>

          <div className="bg-surface/80 border border-border p-5 rounded-2xl text-left space-y-2 hover:border-emerald-500/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500">
              <MapPin size={22} />
            </div>
            <h3 className="font-bold text-foreground text-base">Consulta a Domicilio</h3>
            <p className="text-xs text-muted">
              Médico veterinario en camino a tu hogar con equipamiento clínico y atención en sitio.
            </p>
          </div>
        </div>
      </main>

      {/* FOOTER DISCRETO Y ENLACE VETERINARIOS */}
      <footer className="z-10 border-t border-border bg-background py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <p>© 2026 AVO - Asistencia Veterinaria Online. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6">
            <Link href="/tutor/perfil" className="hover:text-foreground transition-colors">Mi Perfil Tutor</Link>
            <Link href="/vet/registro" className="hover:text-emerald-500 transition-colors font-medium">¿Sos Veterinario? Registrate aquí</Link>
          </div>
        </div>
      </footer>

      {/* MODAL UNIFICADO DE SELECCIÓN DE LOGIN (TUTOR / VET / ADMIN) */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-md p-6 rounded-3xl shadow-2xl space-y-6 relative">
            
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-2 text-muted hover:text-foreground rounded-full hover:bg-primary/10 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-2 pt-2">
              <div className="w-14 h-14 bg-sky-500/10 rounded-2xl flex items-center justify-center mx-auto border border-sky-500/30 text-sky-500">
                <Lock size={28} />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Selecciona tu Portal</h2>
              <p className="text-xs text-muted">¿Cómo deseas ingresar a la plataforma AVO?</p>
            </div>

            <div className="space-y-3">
              {/* Opción 1: Tutor */}
              <Link
                href="/tutor/login"
                onClick={() => setShowLoginModal(false)}
                className="flex items-center justify-between p-4 bg-background border border-border hover:border-sky-500/60 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-500 flex items-center justify-center">
                    <User size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-foreground text-sm">Soy Tutor de Mascota</p>
                    <p className="text-xs text-muted">Mi perfil, solicitudes y mascotas</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-muted group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
              </Link>

              {/* Opción 2: Veterinario */}
              <Link
                href="/vet/login"
                onClick={() => setShowLoginModal(false)}
                className="flex items-center justify-between p-4 bg-background border border-border hover:border-emerald-500/60 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                    <Stethoscope size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-foreground text-sm">Soy Médico Veterinario</p>
                    <p className="text-xs text-muted">Portal médico y guardias en vivo</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-muted group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </Link>

              {/* Opción 3: Administrador / Manager */}
              <Link
                href="/admin/login"
                onClick={() => setShowLoginModal(false)}
                className="flex items-center justify-between p-4 bg-background border border-border hover:border-purple-500/60 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center">
                    <Lock size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-foreground text-sm">Consola de Administración (HQ)</p>
                    <p className="text-xs text-muted">Configuración, tarifas y roles</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-muted group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
