"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import {
  generateClinicalRecordId,
  generatePrescriptionId,
  getClinicalHistory,
  saveClinicalRecord,
  ClinicalRecord,
  MedicationItem
} from "@/lib/clinical-history";
import {
  ChevronLeft,
  Save,
  FileText,
  Pill,
  Stethoscope,
  AlertTriangle,
  History,
  Plus,
  Trash2,
  CheckCircle2,
  User,
  Calendar,
  ShieldCheck,
  HeartPulse
} from "lucide-react";

export default function VetAtencionPage() {
  const router = useRouter();
  const currentDispatch = useStore((state) => state.currentDispatch);
  const setCurrentDispatch = useStore((state) => state.setCurrentDispatch);

  const [activeTab, setActiveTab] = useState<"new_evolution" | "history">("new_evolution");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordId, setRecordId] = useState("HC-2026-4891");
  const [prescriptionId, setPrescriptionId] = useState("REC-2026-4891");
  const [historyRecords, setHistoryRecords] = useState<ClinicalRecord[]>([]);

  // Formulario del Paciente
  const [petName, setPetName] = useState("Toby");
  const [petSpecies, setPetSpecies] = useState<"Perro" | "Gato" | "Ave" | "Exótico" | "Otro">("Perro");
  const [petBreed, setPetBreed] = useState("Caniche Toy");
  const [petWeight, setPetWeight] = useState("5.2");
  const [petAge, setPetAge] = useState("4 años");
  const [tutorName, setTutorName] = useState("Carlos Rossi");
  const [tutorEmail, setTutorEmail] = useState("carlos.rossi@ejemplo.com");

  // Evaluación y Tratamiento
  const [symptomsInput, setSymptomsInput] = useState("Decaimiento o letargo, Vómitos repetidos");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [observations, setObservations] = useState("");

  // Receta Médica Digital
  const [medications, setMedications] = useState<MedicationItem[]>([
    {
      name: "Cerenia (Maropitant) 16mg",
      dose: "1/2 comprimido",
      frequency: "Cada 24 horas",
      duration: "3 días",
    }
  ]);
  const [prescriptionInstructions, setPrescriptionInstructions] = useState(
    "Administrar en ayunas con un sorbo de agua limpia."
  );

  useEffect(() => {
    setRecordId(generateClinicalRecordId());
    setPrescriptionId(generatePrescriptionId());
    if (typeof window !== "undefined") {
      try {
        const str = localStorage.getItem("mock_realtime_dispatch") || localStorage.getItem("avo_pending_request");
        if (str) {
          const data = JSON.parse(str);
          if (data.petName) setPetName(data.petName);
          if (data.petSpecies) {
            const validSpecies = ["Perro", "Gato", "Ave", "Exótico", "Otro"].includes(data.petSpecies) ? data.petSpecies : "Perro";
            setPetSpecies(validSpecies);
          }
          if (data.petAge) setPetAge(data.petAge);
          if (data.petWeight) setPetWeight(data.petWeight);
          if (data.tutorName) setTutorName(data.tutorName);
          if (data.symptoms) {
            const symText = Array.isArray(data.symptoms) ? data.symptoms.join(" | ") : data.symptoms;
            setSymptomsInput(symText);
          }
          setHistoryRecords(getClinicalHistory(data.petName || "Toby"));
          return;
        }
      } catch (e) {}
    }
    setHistoryRecords(getClinicalHistory("Toby"));
  }, []);

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      { name: "", dose: "", frequency: "", duration: "" }
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedicationChange = (
    index: number,
    field: keyof MedicationItem,
    value: string
  ) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const activeVetStr = typeof window !== "undefined" ? localStorage.getItem("avo_active_vet_profile") : null;
    let vetName = "Dr. Roberto Martínez";
    let vetLicense = "MP 14290";
    if (activeVetStr) {
      try {
        const parsed = JSON.parse(activeVetStr);
        if (parsed.name) vetName = parsed.name;
        if (parsed.licenseNumber) vetLicense = parsed.licenseNumber;
      } catch (err) {
        console.error("Error parsing vet profile", err);
      }
    }

    const symptomsArray = symptomsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const newRecord: ClinicalRecord = {
      id: recordId,
      petId: "pet-toby-1",
      petName,
      petSpecies,
      petSex: "Macho (Castrado)",
      petAge,
      petWeight: `${petWeight} kg`,
      tutorName,
      tutorEmail,
      modality: currentDispatch?.modality === "video" ? "video" : "domicilio",
      date: new Date().toISOString(),
      vetName,
      vetLicense,
      symptoms: symptomsArray,
      diagnosis,
      treatment,
      observations,
      prescription: medications.length > 0 ? {
        id: prescriptionId,
        recordId: recordId,
        petName,
        tutorName,
        medications,
        instructions: prescriptionInstructions,
        date: new Date().toISOString(),
        vetName,
        vetLicense,
      } : undefined,
    };

    try {
      saveClinicalRecord(newRecord);
      // Sincronizar en MySQL con /api/medical-records
      fetch("/api/medical-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatchId: currentDispatch?.id || "demo-dispatch",
          petName,
          petSpecies,
          petAge,
          petWeight,
          diagnosis: diagnosis || "Consulta AVO",
          treatment: treatmentPlan || "Indicaciones en consulta",
          postCareInstructions: prescriptionInstructions || "Continuar tratamiento en domicilio",
        }),
      }).catch((e) => console.warn("Sincronización MySQL en segundo plano falló:", e));

      if (currentDispatch) {
        try {
          await fetch(`/api/dispatch/${currentDispatch.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "completed" }),
          });
        } catch (e) {}
        if (typeof window !== "undefined") {
          localStorage.setItem("avo_dispatch_completed_" + currentDispatch.id, "true");
          localStorage.setItem("avo_dispatch_completed_global", "true");
          localStorage.removeItem("avo_pending_request");
          localStorage.removeItem("mock_realtime_dispatch");
        }
        setCurrentDispatch(null);
      }
      setIsSubmitting(false);
      router.push("/vet/dashboard");
    } catch (error) {
      console.error("Error al guardar la historia clínica:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      {/* HEADER CLÍNICO AVANZADO */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 px-4 py-4 shadow-xl">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/vet/dashboard")}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">
                  Historia Clínica Unificada AVO
                </h1>
                <span className="text-xs font-mono bg-sky-500/10 text-sky-400 px-2.5 py-0.5 rounded-lg border border-sky-500/20 font-bold">
                  {recordId}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Registro Oficial CVPBA • Sincronizado en tiempo real con Tutor</span>
              </p>
            </div>
          </div>

          {/* SELECTOR DE PESTAÑAS: NUEVA EVOLUCIÓN VS HISTORIAL PREVIO */}
          <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("new_evolution")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === "new_evolution"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Stethoscope size={15} />
              <span>Nueva Evolución</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === "history"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <History size={15} />
              <span>Historial Previo ({historyRecords.length})</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-6">
        {activeTab === "new_evolution" ? (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* SECCIÓN 1: DATOS DEL PACIENTE Y TUTOR */}
            <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h2 className="text-base font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                  <FileText size={18} className="text-sky-400" />
                  <span>Identificación del Paciente y Tutor</span>
                </h2>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-bold border border-emerald-500/20">
                  Paciente Verificado en Triage
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Nombre Mascota</label>
                  <input
                    type="text"
                    required
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Especie</label>
                  <select
                    value={petSpecies}
                    onChange={(e) => setPetSpecies(e.target.value as "Perro" | "Gato" | "Ave" | "Exotico")}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-sky-500"
                  >
                    <option value="Perro">Perro</option>
                    <option value="Gato">Gato</option>
                    <option value="Ave">Ave</option>
                    <option value="Exótico">Exótico</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Raza</label>
                  <input
                    type="text"
                    value={petBreed}
                    onChange={(e) => setPetBreed(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={petWeight}
                    onChange={(e) => setPetWeight(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Tutor Responsable</label>
                  <input
                    type="text"
                    required
                    value={tutorName}
                    onChange={(e) => setTutorName(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Email del Tutor (Para Envío HCD)</label>
                  <input
                    type="email"
                    required
                    value={tutorEmail}
                    onChange={(e) => setTutorEmail(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: EXAMEN FÍSICO Y DIAGNÓSTICO */}
            <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h2 className="text-base font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                  <HeartPulse size={18} className="text-emerald-400" />
                  <span>Evaluación Clínica y Diagnóstico</span>
                </h2>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Síntomas Presentados (Separados por coma)
                </label>
                <input
                  type="text"
                  required
                  value={symptomsInput}
                  onChange={(e) => setSymptomsInput(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium text-sm focus:outline-none focus:border-sky-500"
                  placeholder="Ej: Decaimiento, Vómitos repetidos, Fiebre"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Diagnóstico Presuntivo / Definitivo *
                </label>
                <textarea
                  required
                  rows={3}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium text-sm focus:outline-none focus:border-sky-500 resize-none"
                  placeholder="Describa los hallazgos al examen físico y el diagnóstico clínico..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Abordaje Terapéutico en Consulta *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={treatment}
                    onChange={(e) => setTreatment(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium text-sm focus:outline-none focus:border-sky-500 resize-none"
                    placeholder="Medicación inyectada o administrada durante la consulta..."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Observaciones y Evolución
                  </label>
                  <textarea
                    rows={3}
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium text-sm focus:outline-none focus:border-sky-500 resize-none"
                    placeholder="Evolución esperada, dieta sugerida, próximos controles..."
                  />
                </div>
              </div>
            </section>

            {/* SECCIÓN 3: RECETA MÉDICA DIGITAL (REC-2026-XXXX) */}
            <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Pill size={20} className="text-amber-400" />
                  <h2 className="text-base font-extrabold text-white uppercase tracking-wider">
                    Receta Médica Digital
                  </h2>
                </div>
                <span className="text-xs font-mono bg-amber-500/10 text-amber-400 px-3 py-1 rounded-lg font-bold border border-amber-500/20">
                  {prescriptionId}
                </span>
              </div>

              <div className="space-y-4">
                {medications.map((med, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center relative"
                  >
                    <div className="sm:col-span-4">
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Medicamento / Droga
                      </label>
                      <input
                        type="text"
                        required
                        value={med.name}
                        onChange={(e) => handleMedicationChange(idx, "name", e.target.value)}
                        placeholder="Ej: Cerenia 16mg"
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Dosis
                      </label>
                      <input
                        type="text"
                        required
                        value={med.dose}
                        onChange={(e) => handleMedicationChange(idx, "dose", e.target.value)}
                        placeholder="Ej: 1/2 comp."
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Frecuencia
                      </label>
                      <input
                        type="text"
                        required
                        value={med.frequency}
                        onChange={(e) => handleMedicationChange(idx, "frequency", e.target.value)}
                        placeholder="Ej: Cada 24 hs"
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">
                          Duración
                        </label>
                        <input
                          type="text"
                          required
                          value={med.duration}
                          onChange={(e) => handleMedicationChange(idx, "duration", e.target.value)}
                          placeholder="3 días"
                          className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      {medications.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMedication(idx)}
                          className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/30 transition-colors mt-5"
                          title="Eliminar medicamento"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddMedication}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                >
                  <Plus size={16} />
                  <span>+ Agregar otro medicamento a la receta</span>
                </button>

                <div className="pt-2">
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Indicaciones Generales para el Tutor
                  </label>
                  <input
                    type="text"
                    value={prescriptionInstructions}
                    onChange={(e) => setPrescriptionInstructions(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-amber-400"
                    placeholder="Ej: Administrar con la comida, evitar lácteos..."
                  />
                </div>
              </div>
            </section>

            {/* ALERTA DE EMISIÓN LEGAL Y CIERRE */}
            <div className="bg-sky-500/10 border border-sky-500/30 p-4 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="text-sky-400 shrink-0 mt-0.5" size={20} />
              <p className="text-xs text-sky-200 leading-relaxed">
                <strong>Confirmación de Cierre Médico:</strong> Al emitir esta historia clínica (<code>{recordId}</code>) y receta (<code>{prescriptionId}</code>), se notificará automáticamente al tutor <strong>{tutorName}</strong> y se recomendarán las farmacias veterinarias con stock cercano a su domicilio.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-base py-5 rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/30 transition-all active:scale-[0.99] disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <CheckCircle2 size={22} className="animate-spin" />
                  <span>Sincronizando y emitiendo HCD...</span>
                </>
              ) : (
                <>
                  <Save size={22} />
                  <span>💾 Guardar Historia Clínica y Emitir Receta Electrónica</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* PESTAÑA HISTORIAL PREVIO DEL PACIENTE */
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <History className="text-sky-400" size={20} />
                    <span>Historial Clínico Cronológico • {petName}</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Registros previos en la red unificada AVO y veterinarias asociadas.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                  {historyRecords.length} evoluciones
                </span>
              </div>

              {historyRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No se encontraron registros previos para este paciente.
                </div>
              ) : (
                <div className="space-y-4">
                  {historyRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold bg-sky-500/10 text-sky-400 px-2.5 py-0.5 rounded-lg border border-sky-500/20">
                            {rec.id}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar size={13} />
                            <span>{new Date(rec.date).toLocaleDateString("es-AR")}</span>
                          </span>
                        </div>
                        <div className="text-xs font-bold text-emerald-400">
                          {rec.vetName} ({rec.vetLicense})
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] font-bold uppercase text-slate-400">
                          Diagnóstico
                        </span>
                        <p className="text-sm font-bold text-white">
                          {rec.diagnosis}
                        </p>
                      </div>

                      {rec.symptoms && rec.symptoms.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {rec.symptoms.map((s, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] bg-slate-900 text-slate-300 px-2.5 py-0.5 rounded-md border border-slate-800 font-semibold"
                            >
                              • {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {rec.prescription && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mt-2">
                          <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                            <Pill size={14} />
                            <span>Receta Emitida ({rec.prescription.id}):</span>
                          </div>
                          <p className="text-xs text-slate-300">
                            {rec.prescription.medications
                              .map((m) => `${m.name} (${m.dose}) - ${m.duration}`)
                              .join(" • ")}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
