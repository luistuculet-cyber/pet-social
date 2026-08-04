"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";

export default function TutorLogin() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "tutor" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("avo_tutor_logged_in", "true");
      }
      window.location.href = "/tutor/perfil";
    } catch (err) {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-sky-500/10 border-2 border-sky-500/30 rounded-3xl flex items-center justify-center text-sky-500 shadow-md">
            <User size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">
              Acceso para Tutores
            </h1>
            <p className="text-sm text-muted mt-1">
              Ingresa a tu cuenta para ver tus mascotas e historias clínicas
            </p>
          </div>
        </div>

        <form
          onSubmit={handleLogin}
          className="clinical-card p-8 space-y-6 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 block">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-3 text-slate-500"
                  size={20}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tutor@ejemplo.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 block">
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-3 text-slate-500"
                  size={20}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-400 text-center bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? "Iniciando sesión..." : "Ingresar a mi Perfil"}
            <ArrowRight size={18} />
          </button>

          <div className="pt-4 border-t border-slate-800/80 text-center">
            <Link
              href="/registro-tutor"
              className="text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
            >
              ¿No tienes cuenta? Regístrate aquí &rarr;
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
