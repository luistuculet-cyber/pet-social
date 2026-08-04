"use client";

import { useState } from "react";
import { 
  FileText, 
  Stethoscope, 
  Pill, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Loader2
} from "lucide-react";
import { saveClinicalRecord } from "@/lib/clinical-history";
import { useStore } from "@/store/useStore";

interface ClinicalClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  dispatchId: string;
  petName: string;
  petSpecies: string;
  petAge?: string;
  petWeight?: string;
  tutorName?: string;
  vetName?: string;
  vetLicense?: string;
}

export function ClinicalClosureModal({
  isOpen,
  onClose,
  onSuccess,
  dispatchId,
  petName,
  petSpecies,
  petAge = "2 años",
  petWeight = "5.0 kg",
  tutorName = "Tutor AVO",
  vetName = "Dr. Profesional AVO",
  vetLicense = "MP 14200"
}: ClinicalClosureModalProps) {
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [postCareInstructions, setPostCareInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim() || !treatment.trim()) {
      setError("Por favor completa el Diagnóstico y el Tratamiento indicado.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      // 1. Enviar a BD en MySQL (Prisma)
      const res = await fetch("/api/medical-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatchId,
          petName,
          petSpecies,
          petAge,
          petWeight,
          diagnosis,
          treatment,
          postCareInstructions: postCareInstructions || "Continuar cuidado estándar en domicilio.",
        }),
      });

      if (!res.ok) {
        console.warn("Fallo al guardar en MySQL / API (se conservará respaldo local):", res.status);
      }

      // 2. Respaldo en localStorage (y para actualización instantánea de interfaz en frontend)
      const newRecord = {
        id: `HC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        petId: `pet-${petName.toLowerCase().replace(/\s+/g, "-")}`,
        petName,
        petSpecies: (petSpecies as any) || "Perro",
        petSex: "Macho/Hembra",
        petAge,
        petWeight,
        tutorName,
        tutorEmail: "tutor@ejemplo.com",
        modality: "video" as const,
        date: new Date().toISOString(),
        vetName,
        vetLicense,
        symptoms: ["Consulta veterinaria online / domicilio"],
        diagnosis,
        treatment,
        observations: postCareInstructions,
        prescription: postCareInstructions ? {
          id: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          recordId: `HC-${Date.now()}`,
          petName,
          tutorName,
          medications: [
            {
              name: "Medicación recetada según indicaciones",
              dose: "Según prescripción",
              frequency: "Diario",
              duration: "Según indicación médica",
            }
          ],
          instructions: postCareInstructions,
          date: new Date().toISOString(),
          vetName,
          vetLicense,
        } : undefined
      };

      saveClinicalRecord(newRecord);

      // Actualizar estado en el backend a completed
      try {
        await fetch(`/api/dispatch/${dispatchId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        });
      } catch (e) {
        console.warn("No se pudo actualizar estado en backend:", e);
      }

      // Marcar completado en localStorage y remover alertas pendientes
      if (typeof window !== "undefined") {
        localStorage.setItem("avo_dispatch_completed_" + dispatchId, "true");
        localStorage.setItem("avo_dispatch_completed_global", "true");
        localStorage.removeItem("avo_pending_request");
        localStorage.removeItem("mock_realtime_dispatch");
      }

      // Limpiar despacho activo en store de Zustand para no repetir alerta
      useStore.getState().setCurrentDispatch(null);

      setIsSubmitting(false);
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (err) {
      console.error("Error al guardar cierre clínico:", err);
      setIsSubmitting(false);
      if (onSuccess) onSuccess();
      else onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border-0 sm:border sm:border-slate-700 w-full sm:max-w-lg rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh]">
        
        {/* HEADER MODAL */}
        <div className="bg-gradient-to-r from-sky-600 to-indigo-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Stethoscope size={22} />
            </div>
            <div>
              <h2 className="font-extrabold text-lg">Cierre Clínico y Receta Digital</h2>
              <p className="text-xs text-sky-100">
                Paciente: <strong className="text-white">{petName}</strong> ({petSpecies})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            title="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* CUERPO DEL FORMULARIO */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 flex flex-col justify-between">
          <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-300">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Diagnóstico Presuntivo / Motivo de Consulta <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={2}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Ej: Dermatitis alérgica leve, normohidratado, sin signos de fiebre..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition-colors"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Tratamiento e Indicaciones Médicas <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              placeholder="Ej: Dieta hipoalergénica por 7 días, limpieza de zona afectada y control preventivo."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition-colors"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block flex items-center gap-1.5">
              <Pill size={15} className="text-emerald-400" />
              <span>Receta Electrónica / Cuidados en el Hogar</span>
            </label>
            <textarea
              rows={3}
              value={postCareInstructions}
              onChange={(e) => setPostCareInstructions(e.target.value)}
              placeholder="Ej: Cefalexina 500mg 1 comp. cada 12 hs por 7 días. Reposo moderado y agua fresca."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400">
              Esta receta estará disponible en el historial médico digital del tutor de inmediato.
            </p>
          </div>

          </div>

          {/* FOOTER ACCIONES FIJO EN MÓVIL AL PIE */}
          <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-md pt-3 pb-2 -mx-5 px-5 border-t border-slate-800 flex items-center justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/25 hover:opacity-95 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Guardando HC...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Finalizar y Emitir Receta</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
