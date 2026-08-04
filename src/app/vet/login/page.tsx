"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, Lock, Mail, PawPrint, Eye, EyeOff } from "lucide-react";

export default function VetLogin() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "vet" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("vet_logged_in", "true");
        if (data.user) {
          localStorage.setItem("avo_active_vet_profile", JSON.stringify(data.user));
        }
      }
      window.location.href = "/vet/dashboard";
    } catch (err) {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center text-center space-y-5">
          {/* AVO Vet Emblem: PawPrint + Stethoscope */}
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center shadow-md border-2 border-primary/30 relative">
              <PawPrint size={40} className="text-primary" />
              <div className="absolute -bottom-2 -right-2 bg-primary text-white p-1.5 rounded-xl shadow-sm border-2 border-background">
                <Stethoscope size={18} />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tight text-primary drop-shadow-sm">
              AVO
            </h1>
            <p className="text-lg font-extrabold text-foreground tracking-wide">
              Asistencia Veterinaria Online
            </p>
            <p className="text-muted text-xs pt-1 font-semibold uppercase tracking-wider">
              Portal para Médicos Veterinarios • Gestión de Guardias
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="clinical-card p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted block">Email Institucional</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-muted" size={20} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej: dr.peralta@ejemplo.com"
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted block">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-muted" size={20} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted hover:text-foreground transition-colors"
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isProcessing}
            className="w-full flex items-center justify-center bg-primary text-white text-lg font-bold py-4 rounded-xl hover:bg-primary-dark transition-all disabled:opacity-70"
          >
            {isProcessing ? 'Verificando...' : 'Ingresar al Panel'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-muted text-sm">
            ¿No eres prestador aún?{' '}
            <a href="/vet/registro" className="text-primary font-bold hover:underline">
              Regístrate aquí
            </a>
          </p>
        </div>
      </div>

    </main>
  );
}
