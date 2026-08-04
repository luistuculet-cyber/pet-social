"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, CheckCircle, CreditCard, ShieldCheck } from "lucide-react";
import { PasswordInput } from "@/components/ui/PasswordInput";

function RegistroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPremium = searchParams.get('tipo') === 'premium';
  
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>_+=~`'/\\[\];\-]/.test(password)) {
        setError("La contraseña no cumple con los requisitos mínimos de seguridad (8 caracteres, 1 mayúscula, 1 número y 1 carácter especial).");
        return;
      }
      setError("");
    }
    if (isPremium && step === 1) {
      setStep(2); // Pasar a pantalla de pago premium
    } else {
      setIsProcessing(true);
      try {
        await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim() || "Tutor AVO",
            email: email.trim() || `tutor_${Date.now()}@avo.com`,
            password,
            role: "tutor",
          }),
        });
      } catch (err) {
        console.warn("Error al registrar sesión del tutor en servidor:", err);
      }
      setTimeout(() => {
        setIsProcessing(false);
        if (typeof window !== "undefined") {
          localStorage.setItem("avo_tutor_logged_in", "true");
          const existingPets = localStorage.getItem("avo_tutor_pets");
          if (!existingPets) {
            let initialPetName = "Toby";
            let initialSpecies = "Perro";
            try {
              const pendingReq = localStorage.getItem("avo_pending_request") || localStorage.getItem("mock_realtime_dispatch");
              if (pendingReq) {
                const parsed = JSON.parse(pendingReq);
                if (parsed.petName) initialPetName = parsed.petName;
                if (parsed.petSpecies) initialSpecies = parsed.petSpecies;
              } else {
                const hist = localStorage.getItem("avo_clinical_history");
                if (hist) {
                  const parsedHist = JSON.parse(hist);
                  if (Array.isArray(parsedHist) && parsedHist.length > 0 && parsedHist[0].petName) {
                    initialPetName = parsedHist[0].petName;
                    if (parsedHist[0].petSpecies) initialSpecies = parsedHist[0].petSpecies;
                  }
                }
              }
            } catch (e) {}

            const initialPets = [
              {
                id: "pet-" + initialPetName.toLowerCase().replace(/[^a-z0-9]/g, "") + "-1",
                name: initialPetName,
                species: initialSpecies,
                sex: "Macho",
                age: "3 años",
                weight: "12 kg",
                breed: "Mestizo",
                active: true,
              }
            ];
            localStorage.setItem("avo_tutor_pets", JSON.stringify(initialPets));
          }
        }
        setStep(3); // Pantalla de éxito final
      }, 1500);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md">
        
        {step < 3 && (
          <div className="mb-8 space-y-2 text-center">
            <h1 className="text-2xl font-bold text-foreground">
              {isPremium ? 'Suscripción Premium' : 'Crear tu Cuenta'}
            </h1>
            <p className="text-muted">
              {isPremium 
                ? 'Obtén descuentos exclusivos y cobertura total.' 
                : 'Guarda la historia clínica de tu mascota para siempre.'}
            </p>
            <div className="pt-2">
              <Link href="/tutor/login" className="text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors">
                ¿Ya tienes una cuenta de Tutor? Inicia Sesión aquí &rarr;
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleNext} className="clinical-card p-6 min-h-[400px] flex flex-col justify-between animate-in fade-in slide-in-from-bottom-4">
          
          {/* STEP 1: Datos Personales */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted block">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-muted" size={20} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-muted" size={20} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <PasswordInput
                label="Contraseña"
                value={password}
                onChange={setPassword}
                placeholder="Crea una contraseña segura"
                showRequirements={true}
                required
              />
              {error && (
                <p className="text-xs font-semibold text-red-500 mt-2">{error}</p>
              )}
            </div>
          )}

          {/* STEP 2: Pago (Solo Premium) */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-amber-400/10 border border-amber-400/20 p-4 rounded-xl flex items-start gap-3">
                <ShieldCheck className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-amber-700">Plan Premium Anual</h3>
                  <p className="text-sm text-amber-600/80 mt-1">Facturación mensual de $15.000. Cancele en cualquier momento.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted block">Número de Tarjeta</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 text-muted" size={20} />
                    <input type="text" required placeholder="XXXX XXXX XXXX XXXX" className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" required placeholder="MM/AA" className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                  <input type="text" required placeholder="CVC" className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            </div>
          )}

          {/* Pantalla de Éxito */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center space-y-6 py-8">
              <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center">
                <CheckCircle size={48} className="text-success" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  {isPremium ? '¡Bienvenido a Premium!' : '¡Cuenta Creada!'}
                </h2>
                <p className="text-muted">
                  {isPremium 
                    ? 'Tu suscripción está activa. Ya puedes disfrutar de todos los beneficios y descuentos.' 
                    : 'Tu cuenta ha sido creada. Ahora puedes añadir perfiles de tus mascotas y guardar su historia clínica.'}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => { window.location.href = '/tutor/perfil'; }}
                className="w-full bg-slate-100 text-slate-700 font-bold py-4 rounded-xl mt-4 hover:bg-slate-200"
              >
                Ir a mi Perfil
              </button>
            </div>
          )}

          {/* Botones de navegación */}
          {step < 3 && (
            <div className="pt-6 mt-4 border-t border-border flex flex-col gap-3">
              <button 
                type="submit"
                disabled={isProcessing}
                className={`w-full flex items-center justify-center text-white font-bold py-4 rounded-xl transition-all disabled:opacity-70 ${
                  isPremium && step === 2 
                    ? 'bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700' 
                    : 'bg-primary hover:bg-primary-dark'
                }`}
              >
                {isProcessing 
                  ? 'Procesando...' 
                  : (isPremium && step === 1) 
                    ? 'Continuar al Pago' 
                    : (isPremium && step === 2)
                      ? 'Suscribirme'
                      : 'Crear Cuenta'
                }
              </button>
              
              {step === 1 && (
                <button 
                  type="button"
                  onClick={() => router.back()}
                  className="w-full text-muted font-medium py-2 hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          )}
        </form>

      </div>
    </main>
  );
}

export default function RegistroTutorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <RegistroForm />
    </Suspense>
  );
}
