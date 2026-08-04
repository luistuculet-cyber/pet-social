"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  MapPin, 
  Navigation, 
  ArrowRight, 
  Activity, 
  Video, 
  AlertTriangle, 
  CheckCircle2, 
  Stethoscope, 
  ShieldAlert,
  HeartPulse,
  Info
} from "lucide-react";
import { useStore } from "@/store/useStore";
import InteractiveMap from "@/components/InteractiveMap";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { TutorNavbar } from "@/components/tutor/TutorNavbar";

interface SymptomOption {
  id: string;
  label: string;
  severity: "critical" | "moderate" | "mild";
  category: string;
}

const SYMPTOM_OPTIONS: SymptomOption[] = [
  { id: "trauma", label: "Traumatismo grave, accidente o caída de altura", severity: "critical", category: "Traumatología" },
  { id: "resp", label: "Dificultad respiratoria, desmayo o convulsiones", severity: "critical", category: "Emergencia" },
  { id: "pain", label: "Dolor agudo incontrolable o inmovilidad completa", severity: "critical", category: "Emergencia" },
  { id: "gastro", label: "Vómitos repetidos, diarrea intensa o ingestión sospechosa", severity: "moderate", category: "Gastroenterología" },
  { id: "meds", label: "Dudas de medicación, dosis o seguimiento de tratamiento", severity: "mild", category: "Telemedicina" },
  { id: "derma", label: "Problemas en piel, oídos, ojos, rascado o alergia leve", severity: "mild", category: "Dermatología" },
  { id: "general", label: "Consulta de rutina, nutrición o comportamiento", severity: "mild", category: "General" },
];

export default function SolicitarPage() {
  const router = useRouter();
  const setTutorLocation = useStore((state) => state.setTutorLocation);
  const setTutorServiceType = useStore((state) => state.setTutorServiceType);
  const setTutorSymptoms = useStore((state) => state.setTutorSymptoms);
  const setCurrentDispatch = useStore((state) => state.setCurrentDispatch);
  
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedModality, setSelectedModality] = useState<"video" | "domicilio">("domicilio");
  const [userManuallySelectedModality, setUserManuallySelectedModality] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Precios dinámicos sincronizados con la consola de administración
  const [priceVideo, setPriceVideo] = useState(18000);
  const [priceHome, setPriceHome] = useState(38000);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("avo_config");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const vPrice = Number(parsed.cfgPriceVideo ?? parsed.videoConsultationPrice);
          const hPrice = Number(parsed.cfgPriceHome ?? parsed.homeEmergencyPrice);
          if (!isNaN(vPrice) && vPrice > 0) setPriceVideo(vPrice);
          if (!isNaN(hPrice) && hPrice > 0) setPriceHome(hPrice);
        } catch (e) {}
      }
    }
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        const videoPrice = Number(data.cfgPriceVideo ?? data.videoConsultationPrice);
        const homePrice = Number(data.cfgPriceHome ?? data.homeEmergencyPrice);
        if (!isNaN(videoPrice) && videoPrice > 0) setPriceVideo(videoPrice);
        if (!isNaN(homePrice) && homePrice > 0) setPriceHome(homePrice);
      })
      .catch(() => {})
      .finally(() => setIsLoadingPrices(false));
  }, []);

  // Calcular recomendación automática del Triage
  const hasCritical = selectedSymptoms.some((id) => {
    const sym = SYMPTOM_OPTIONS.find((s) => s.id === id);
    return sym?.severity === "critical";
  });

  const hasModerate = selectedSymptoms.some((id) => {
    const sym = SYMPTOM_OPTIONS.find((s) => s.id === id);
    return sym?.severity === "moderate";
  });

  const triageRecommendation: "video" | "domicilio" = hasCritical || hasModerate ? "domicilio" : "video";

  // Auto-seleccionar modalidad recomendada si el usuario no la eligió a mano
  useEffect(() => {
    if (!userManuallySelectedModality && selectedSymptoms.length > 0) {
      setSelectedModality(triageRecommendation);
    }
  }, [selectedSymptoms, userManuallySelectedModality, triageRecommendation]);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectModality = (modality: "video" | "domicilio") => {
    setSelectedModality(modality);
    setUserManuallySelectedModality(true);
  };

  const [userAddressInput, setUserAddressInput] = useState("Av. Corrientes 1234, CABA");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: -34.6037, lng: -58.3816 });
  const [isSearchingUserAddress, setIsSearchingUserAddress] = useState(false);
  const [customSymptomNotes, setCustomSymptomNotes] = useState("");

  // Estado de Datos de la Mascota
  const [petSpecies, setPetSpecies] = useState<string>("Perro");
  const [petName, setPetName] = useState<string>("");
  const [petSex, setPetSex] = useState<string>("Macho (Castrado)");
  const [petAge, setPetAge] = useState<string>("3 años");
  const [petWeight, setPetWeight] = useState<string>("10 kg");

  const handleSearchUserAddress = async () => {
    if (!userAddressInput.trim()) return;
    setIsSearchingUserAddress(true);
    try {
      const query = encodeURIComponent(`${userAddressInput}, Argentina`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setUserCoords({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        });
      }
    } catch (e) {
      console.error("Geocoding user address error", e);
    } finally {
      setIsSearchingUserAddress(false);
    }
  };

  const handleProceedToLocation = () => {
    setIsLocating(true);
    setTimeout(() => {
      setTutorLocation(userCoords);
      setIsLocating(false);
      setLocationConfirmed(true);
    }, 800);
  };

  const handleConfirmOrder = async () => {
    setTutorServiceType(selectedModality);
    const symptomLabels: string[] = [];
    symptomLabels.push(`🐾 PACIENTE: ${petName ? petName : 'Sin nombre'} (${petSpecies}) - Sexo: ${petSex} - Edad: ${petAge} - Peso: ${petWeight}`);
    
    selectedSymptoms.forEach((id) => {
      const label = SYMPTOM_OPTIONS.find((s) => s.id === id)?.label;
      if (label) symptomLabels.push(label);
    });

    if (customSymptomNotes.trim()) {
      symptomLabels.push(`Nota de Síntomas: ${customSymptomNotes.trim()}`);
    }

    const pendingRequestData = {
      serviceType: selectedModality,
      modality: selectedModality,
      petName: petName || "Sin nombre",
      petSpecies: petSpecies || "Perro",
      petSex: petSex || "N/A",
      petAge: petAge || "N/A",
      petWeight: petWeight || "N/A",
      symptoms: symptomLabels.join(". "),
      customNotes: customSymptomNotes.trim(),
      lat: userCoords.lat,
      lng: userCoords.lng,
      address: userAddressInput || "Dirección GPS Confirmada",
      price: price,
      createdAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingRequestData),
      });
      const data = await res.json();
      if (data.success || res.ok) {
        const dispatchObj = {
          ...(data.dispatch || data),
          ...pendingRequestData,
          id: (data.dispatch && data.dispatch.id) || (data.id) || `srv-${Date.now()}`
        };
        setCurrentDispatch(dispatchObj);
        setTutorSymptoms(symptomLabels);
        setTutorLocation(userCoords);
        if (typeof window !== "undefined") {
          localStorage.setItem("avo_pending_request", JSON.stringify(dispatchObj));
          localStorage.setItem("mock_realtime_dispatch", JSON.stringify(dispatchObj));
        }
        router.push("/pago");
      } else {
        setSubmitError(data.error || "Error al crear la solicitud");
      }
    } catch (err) {
      setSubmitError("Error de conexión al crear la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  const price = selectedModality === "video" ? priceVideo : priceHome;

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 py-10 pb-24 relative">
      <TutorNavbar />
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header AVO Triage */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
            <Stethoscope size={14} />
            <span>AVO • Triage Veterinario</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground">
            Evaluación de Síntomas & Modalidad
          </h1>
          <p className="text-sm text-muted max-w-md mx-auto">
            Completa los datos de tu mascota y sus síntomas para asignar la modalidad idónea.
          </p>
        </div>

        {!locationConfirmed ? (
          <div className="clinical-card p-6 sm:p-8 space-y-6">
            
            {/* SECCIÓN 1: DATOS DE LA MASCOTA 🐾 */}
            <div className="space-y-4 bg-primary/5 border border-primary/20 p-4 sm:p-5 rounded-2xl">
              <label className="text-xs font-black uppercase tracking-wider text-primary block flex items-center gap-1.5">
                <span>🐾 1. Datos de tu Mascota</span>
              </label>

              {/* TIPO DE MASCOTA / ESPECIE */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground block">Tipo de Mascota / Especie</span>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { id: "Perro", label: "🐶 Perro" },
                    { id: "Gato", label: "🐱 Gato" },
                    { id: "Ave", label: "🦜 Ave" },
                    { id: "Exótico", label: "🐹 Exótico" },
                    { id: "Otro", label: "🐾 Otro" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPetSpecies(item.id)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all truncate ${
                        petSpecies === item.id
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-background text-foreground border-border hover:border-muted"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* NOMBRE DE LA MASCOTA */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Nombre (Opcional)</label>
                  <input
                    type="text"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    placeholder="Ej: Toby, Mishi, Luna..."
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary"
                  />
                </div>

                {/* SEXO */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Sexo y Estado</label>
                  <select
                    value={petSex}
                    onChange={(e) => setPetSex(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground font-medium focus:outline-none focus:border-primary"
                  >
                    <option value="Macho (Castrado)">Macho (Castrado)</option>
                    <option value="Macho (Entero)">Macho (Sin castrar)</option>
                    <option value="Hembra (Castrada)">Hembra (Castrada)</option>
                    <option value="Hembra (Entera)">Hembra (Sin castrar)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* EDAD */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Edad Aproximada</label>
                  <input
                    type="text"
                    value={petAge}
                    onChange={(e) => setPetAge(e.target.value)}
                    placeholder="Ej: 3 años, 6 meses"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary"
                  />
                </div>

                {/* PESO APROXIMADO */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Peso Aprox. (kg)</label>
                  <input
                    type="text"
                    value={petWeight}
                    onChange={(e) => setPetWeight(e.target.value)}
                    placeholder="Ej: 5 kg, 15 kg, 30 kg"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: SÍNTOMAS (TRIAGE) */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted block">
                2. ¿Qué síntomas presenta hoy tu mascota? (Puedes elegir varios)
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {SYMPTOM_OPTIONS.map((sym) => {
                  const isSelected = selectedSymptoms.includes(sym.id);
                  return (
                    <button
                      key={sym.id}
                      type="button"
                      onClick={() => toggleSymptom(sym.id)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-background hover:border-muted"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            isSelected
                              ? "bg-primary border-primary text-white"
                              : "border-border bg-background"
                          }`}
                        >
                          {isSelected && <CheckCircle2 size={14} />}
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          {sym.label}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          sym.severity === "critical"
                            ? "bg-red-500/15 text-red-600"
                            : sym.severity === "moderate"
                            ? "bg-amber-500/15 text-amber-600"
                            : "bg-emerald-500/15 text-emerald-600"
                        }`}
                      >
                        {sym.severity === "critical"
                          ? "Urgente"
                          : sym.severity === "moderate"
                          ? "Atención"
                          : "Consulta"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ALERTA DE RECOMENDACIÓN DEL TRIAGE */}
            {selectedSymptoms.length > 0 && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                  triageRecommendation === "domicilio"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                }`}
              >
                {triageRecommendation === "domicilio" ? (
                  <AlertTriangle size={22} className="text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <Info size={22} className="text-emerald-500 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-1">
                  <p className="font-bold">
                    {triageRecommendation === "domicilio"
                      ? "⚠️ Triage AVO: Recomendamos CONSULTA A DOMICILIO"
                      : "✅ Triage AVO: Recomendamos VIDEO CONSULTA INMEDIATA"}
                  </p>
                  <p className="opacity-90">
                    {triageRecommendation === "domicilio"
                      ? "Los síntomas seleccionados sugieren la necesidad de revisión clínica presencial y posible medicación inyectable en domicilio."
                      : "Los síntomas indicados pueden resolverse de manera ágil y segura por videollamada con un profesional matriculado."}
                  </p>
                </div>
              </div>
            )}

            {/* 2. SELECCIÓN DE MODALIDAD */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted block">
                2. Selecciona la Modalidad de Atención
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* OPCIÓN 1: VIDEO CONSULTA */}
                <button
                  type="button"
                  onClick={() => handleSelectModality("video")}
                  className={`relative p-5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                    selectedModality === "video"
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-background hover:border-muted"
                  }`}
                >
                  {triageRecommendation === "video" && selectedSymptoms.length > 0 && (
                    <span className="absolute -top-2.5 right-4 bg-emerald-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full uppercase shadow-sm">
                      ★ Recomendado por Triage
                    </span>
                  )}
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                      <Video size={22} className="text-primary" />
                    </div>
                    <h3 className="font-bold text-base text-foreground">
                      Video Consulta 24/7
                    </h3>
                    <p className="text-xs text-muted">
                      Conexión por videollamada HD con un veterinario en ~2 minutos.
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                    <span className="text-lg font-extrabold text-foreground">
                      {isLoadingPrices ? (
                        <Skeleton variant="text" className="w-24 h-7" />
                      ) : (
                        `$${priceVideo.toLocaleString("es-AR")}`
                      )}
                    </span>
                    <span className="text-xs font-semibold text-primary">
                      {selectedModality === "video" ? "● Seleccionado" : "Elegir"}
                    </span>
                  </div>
                </button>

                {/* OPCIÓN 2: ATENCIÓN DOMICILIARIA */}
                <button
                  type="button"
                  onClick={() => handleSelectModality("domicilio")}
                  className={`relative p-5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                    selectedModality === "domicilio"
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-background hover:border-muted"
                  }`}
                >
                  {triageRecommendation === "domicilio" && selectedSymptoms.length > 0 && (
                    <span className="absolute -top-2.5 right-4 bg-amber-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full uppercase shadow-sm">
                      ★ Recomendado por Triage
                    </span>
                  )}
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center">
                      <MapPin size={22} className="text-success" />
                    </div>
                    <h3 className="font-bold text-base text-foreground">
                      Atención Domiciliaria
                    </h3>
                    <p className="text-xs text-muted">
                      Médico veterinario en tu domicilio con kit clínico en ~12 min.
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                    <span className="text-lg font-extrabold text-foreground">
                      {isLoadingPrices ? (
                        <Skeleton variant="text" className="w-24 h-7" />
                      ) : (
                        `$${priceHome.toLocaleString("es-AR")}`
                      )}
                    </span>
                    <span className="text-xs font-semibold text-primary">
                      {selectedModality === "domicilio" ? "● Seleccionado" : "Elegir"}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* BOTÓN CONTINUAR */}
            <button
              type="button"
              disabled={isLocating}
              onClick={handleProceedToLocation}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white text-lg font-bold py-4 rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.99] disabled:opacity-70"
            >
              {isLocating ? (
                <>
                  <Navigation className="animate-spin" size={20} />
                  <span>Obteniendo ubicación del domicilio...</span>
                </>
              ) : (
                <>
                  <span>Confirmar y Verificar Dirección</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        ) : (
          /* PANTALLA DE CONFIRMACIÓN FINAL Y VERIFICACIÓN DE DIRECCIÓN / SÍNTOMAS */
          <div className="clinical-card p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 border-b border-border pb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                {selectedModality === "video" ? (
                  <Video size={26} className="text-primary" />
                ) : (
                  <MapPin size={26} className="text-success" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  {selectedModality === "video" ? "Telemedicina HD 24/7" : "Atención Domiciliaria 24/7"}
                </span>
                <h2 className="text-xl font-bold text-foreground">
                  {selectedModality === "video"
                    ? "Confirmar Video Consulta Veterinaria"
                    : "Confirmar Atención Domiciliaria"}
                </h2>
              </div>
            </div>

            {/* EDICIÓN Y VERIFICACIÓN DE DATOS DEL PACIENTE (OBLIGATORIOS) */}
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-3">
              <p className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                <span>🐾 Ficha del Paciente (Verificar Especie, Sexo, Edad y Peso)</span>
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="font-bold text-muted block mb-1">Especie</label>
                  <select
                    value={petSpecies}
                    onChange={(e) => setPetSpecies(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 font-bold text-foreground focus:border-primary"
                  >
                    <option value="Perro">🐶 Perro</option>
                    <option value="Gato">🐱 Gato</option>
                    <option value="Ave">🦜 Ave</option>
                    <option value="Exótico">🐹 Exótico</option>
                    <option value="Otro">🐾 Otro</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-muted block mb-1">Sexo y Estado</label>
                  <select
                    value={petSex}
                    onChange={(e) => setPetSex(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 font-bold text-foreground focus:border-primary"
                  >
                    <option value="Macho (Castrado)">Macho (Castrado)</option>
                    <option value="Macho (Entero)">Macho (Entero)</option>
                    <option value="Hembra (Castrada)">Hembra (Castrada)</option>
                    <option value="Hembra (Entera)">Hembra (Entera)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-muted block mb-1">Edad Aprox.</label>
                  <input
                    type="text"
                    required
                    value={petAge}
                    onChange={(e) => setPetAge(e.target.value)}
                    placeholder="Ej: 3 años"
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 font-bold text-foreground focus:border-primary"
                  >
                  </input>
                </div>

                <div>
                  <label className="font-bold text-muted block mb-1">Peso Aprox.</label>
                  <input
                    type="text"
                    required
                    value={petWeight}
                    onChange={(e) => setPetWeight(e.target.value)}
                    placeholder="Ej: 10 kg"
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 font-bold text-foreground focus:border-primary"
                  >
                  </input>
                </div>
              </div>
            </div>

            {/* DIRECCIÓN EXACTA Y MAPA DE UBICACIÓN PARA REMITIR AL VETERINARIO */}
            <div className="bg-background p-4 rounded-xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-muted uppercase tracking-wider">
                  Dirección del Domicilio para Atención / Remisión
                </p>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-500/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  <span>Pin GPS Verificado</span>
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={userAddressInput}
                  onChange={(e) => setUserAddressInput(e.target.value)}
                  placeholder="Ej: Av. Corrientes 1234, CABA"
                  className="flex-1 px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-sm"
                />
                <button
                  type="button"
                  onClick={handleSearchUserAddress}
                  disabled={isSearchingUserAddress}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold shrink-0 transition-colors disabled:opacity-50"
                >
                  {isSearchingUserAddress ? "Buscando..." : "Buscar en Mapa"}
                </button>
              </div>

              {/* MAPA INTERACTIVO LEAFLET PARA UBICAR PUERTA DEL DOMICILIO */}
              <InteractiveMap
                initialLat={userCoords.lat}
                initialLng={userCoords.lng}
                initialAddress={userAddressInput}
                showSearch={false}
                height="240px"
                onLocationSelect={(lat, lng, address) => {
                  setUserCoords({ lat, lng });
                  if (address) {
                    setUserAddressInput(address);
                  }
                }}
              />

              {/* BOTÓN DE CONFIRMAR DIRECCIÓN EXACTA */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                  <MapPin size={16} className="text-emerald-500 shrink-0" />
                  <span>Pin posicionado en: {userAddressInput}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleSearchUserAddress();
                    toast("Dirección exacta confirmada para remitir al veterinario", "success");
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  <CheckCircle2 size={14} />
                  <span>Confirmar Dirección Exacta</span>
                </button>
              </div>
            </div>

            {/* SÍNTOMAS OBLIGATORIOS SI NO SE SELECCIONÓ TRIAGE (O CAMPO ADICIONAL) */}
            {selectedSymptoms.length === 0 ? (
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl space-y-2">
                <label className="text-xs font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <AlertTriangle size={16} />
                  <span>Descripción Obligatoria de Síntomas / Motivo</span>
                </label>
                <p className="text-xs text-muted">
                  No seleccionaste opciones en el triage previo. Por favor, describe qué le ocurre a tu mascota para remitírselo al veterinario:
                </p>
                <textarea
                  rows={3}
                  required
                  value={customSymptomNotes}
                  onChange={(e) => setCustomSymptomNotes(e.target.value)}
                  placeholder="Ej: Mi mascota está decaída desde hoy, no quiere comer y tiene picazón intensa en oídos..."
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted uppercase tracking-wider">
                  Síntomas declarados en Triage ({selectedSymptoms.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSymptoms.map((id) => {
                    const sym = SYMPTOM_OPTIONS.find((s) => s.id === id);
                    return (
                      <span
                        key={id}
                        className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-lg"
                      >
                        {sym?.label}
                      </span>
                    );
                  })}
                </div>
                <div>
                  <input
                    type="text"
                    value={customSymptomNotes}
                    onChange={(e) => setCustomSymptomNotes(e.target.value)}
                    placeholder="Agregar observaciones adicionales (opcional)..."
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted focus:outline-none focus:border-primary mt-1"
                  />
                </div>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-semibold text-muted">
                  Tarifa {selectedModality === "video" ? "Video Consulta" : "Atención Domiciliaria"}
                </span>
                <span className="text-3xl font-extrabold text-foreground">
                  ${price.toLocaleString("es-AR")}
                </span>
              </div>

              {submitError && (
                <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-semibold">
                  {submitError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setLocationConfirmed(false)}
                  className="w-1/3 py-4 border border-border rounded-xl font-bold text-sm text-muted hover:text-foreground hover:bg-background transition-colors"
                >
                  Volver
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmOrder}
                  className="w-2/3 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white text-lg font-bold py-4 rounded-xl shadow-lg shadow-primary/25 transition-all disabled:opacity-50"
                >
                  <span>{isSubmitting ? "Procesando..." : "Continuar al Pago"}</span>
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
