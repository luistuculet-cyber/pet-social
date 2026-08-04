"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  User, 
  Video, 
  FileText, 
  MapPin, 
  Heart, 
  LogOut,
  Sparkles
} from "lucide-react";

export function TutorNavbar() {
  const pathname = usePathname();

  // Ocultar barra de tutor cuando se está en sala inmersiva de video, espera o vistas de vet/admin
  if (
    pathname?.startsWith("/sala") ||
    pathname?.startsWith("/espera") ||
    pathname?.startsWith("/vet") ||
    pathname?.startsWith("/admin")
  ) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.warn("Error logout:", e);
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("avo_tutor_logged_in");
      window.location.href = "/";
    }
  };

  const navItems = [
    {
      label: "Mi Perfil",
      href: "/tutor/perfil",
      icon: User,
      active: pathname === "/tutor/perfil",
    },
    {
      label: "Solicitar Consulta",
      href: "/solicitar",
      icon: Video,
      active: pathname === "/solicitar",
      highlight: true,
    },
    {
      label: "Historial Médico",
      href: "/tutor/perfil#historial",
      icon: FileText,
      active: false,
    },
    {
      label: "Farmacias",
      href: "/tutor/perfil#farmacias",
      icon: MapPin,
      active: false,
    },
  ];

  return (
    <>
      {/* HEADER DESKTOP & TOPBAR */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo AVO */}
          <Link href="/tutor/perfil" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Heart size={20} className="fill-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-foreground">AVO</span>
              <span className="text-xs font-semibold px-2 py-0.5 ml-2 rounded-full bg-sky-500/10 text-sky-500">
                Tutor
              </span>
            </div>
          </Link>

          {/* NAV EN DESKTOP */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.highlight) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md shadow-sky-500/25 hover:opacity-95 transition-all transform hover:-translate-y-0.5"
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                    <Sparkles size={14} className="animate-pulse" />
                  </Link>
                );
              }
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    item.active
                      ? "bg-sky-500/15 text-sky-500"
                      : "text-muted hover:text-foreground hover:bg-slate-500/10"
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* ACCIONES DEL HEADER */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* BOTTOM BAR EN MÓVIL (VISIBLE SOLO EN MD:HIDDEN) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950 border-t border-slate-800 px-2 py-2 flex items-center justify-around shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                item.highlight
                  ? "text-sky-500 font-bold scale-105"
                  : item.active
                  ? "text-sky-500 font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl ${
                  item.highlight
                    ? "bg-sky-500/15 text-sky-500 shadow-sm"
                    : ""
                }`}
              >
                <Icon size={18} />
              </div>
              <span className="text-[10px] leading-none text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      {/* Spacer para reservar espacio de la bottom bar fija en móvil */}
      <div className="md:hidden h-20" />
    </>
  );
}
