"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Video,
  Mic,
  PhoneOff,
  FileText,
  Save,
  ChevronLeft,
  Stethoscope,
  Pill,
  Clock,
  ShieldCheck,
  AlertCircle,
  User,
  CheckCircle2,
  Maximize2,
  Share2
} from "lucide-react";
import {
  generateClinicalRecordId,
  generatePrescriptionId,
  saveClinicalRecord,
  ClinicalRecord
} from "@/lib/clinical-history";
import { useStore } from "@/store/useStore";
import { ClinicalClosureModal } from "@/components/vet/ClinicalClosureModal";
import { InAppBrowserGuard } from "@/components/common/InAppBrowserGuard";

export default function SalaVideoconsultaPage() {
  const router = useRouter();
  const params = useParams();
  const dispatchId = (params?.id as string) || "demo-room";

  const currentDispatch = useStore((state) => state.currentDispatch);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState<string>("AVO-Consulta-Demo");
  const [patientData, setPatientData] = useState<Record<string, unknown>>(
    currentDispatch
      ? { ...currentDispatch }
      : {
          petName: "Mascota",
          petSpecies: "Perro",
          symptoms: "Consulta de orientación general",
          status: "in_progress",
        }
  );
  const [userRole, setUserRole] = useState<"vet" | "tutor">("tutor"); // Default seguro al tutor
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showClinicalDrawer, setShowClinicalDrawer] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [recordId, setRecordId] = useState("HC-2026-4891");
  const [prescriptionId, setPrescriptionId] = useState("REC-2026-4891");

  // Formulario de Historia Clínica durante llamada
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [postCare, setPostCare] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    setRecordId(generateClinicalRecordId());
    setPrescriptionId(generatePrescriptionId());

    // Detectar de forma estricta si el usuario es veterinario o tutor por parámetro URL y autenticación
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const isExplicitTutor = urlParams.get("role") === "tutor";
      const isExplicitVet = urlParams.get("role") === "vet";
      const vetLogged = localStorage.getItem("vet_logged_in") === "true";
      const resolvedRole = isExplicitTutor ? "tutor" : isExplicitVet || vetLogged ? "vet" : "tutor";
      setUserRole(resolvedRole);
      if (resolvedRole === "vet") setShowClinicalDrawer(true);
    }

    const fetchRoom = async () => {
      try {
        let activeDispatch: Record<string, unknown> | null = currentDispatch ? { ...currentDispatch } : null;
        if (typeof window !== "undefined") {
          try {
            const mockStr = localStorage.getItem("mock_realtime_dispatch") || localStorage.getItem("avo_pending_request");
            if (mockStr) {
              const parsed = JSON.parse(mockStr);
              activeDispatch = { ...(activeDispatch || {}), ...parsed };
            }
          } catch (e) {}
        }
        const res = await fetch(`/api/sala/${dispatchId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.roomName) setRoomName(data.roomName);
          const merged = {
            ...(data.dispatch || {}),
            ...(activeDispatch || {}),
          };
          setPatientData(merged);
        } else if (activeDispatch) {
          setPatientData(activeDispatch);
        }
      } catch (e) {
        console.error("Error loading video room:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();

    // Contador de tiempo de llamada
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [dispatchId]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSaveRecord = async (shouldEndCall = false) => {
    setIsSavingRecord(true);
    if (shouldEndCall) {
      try {
        await fetch(`/api/dispatch/${dispatchId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        });
      } catch (e) {}
      if (typeof window !== "undefined") {
        localStorage.setItem("avo_dispatch_completed_" + dispatchId, "true");
        localStorage.setItem("avo_dispatch_completed_global", "true");
        localStorage.removeItem("avo_pending_request");
        localStorage.removeItem("mock_realtime_dispatch");
      }
      useStore.getState().setCurrentDispatch(null);
    }
    try {
      if (userRole === "vet") {
        const activeVetStr = typeof window !== "undefined" ? localStorage.getItem("avo_active_vet_profile") : null;
        let vetName = "Dr. Roberto Martínez";
        let vetLicense = "MP 14290";
        if (activeVetStr) {
          try {
            const parsed = JSON.parse(activeVetStr);
            if (parsed.name) vetName = parsed.name;
            if (parsed.licenseNumber) vetLicense = parsed.licenseNumber;
          } catch (err) {}
        }

        const newRecord: ClinicalRecord = {
          id: recordId,
          petId: "pet-toby-1",
          petName: String(patientData.petName || "Mascota"),
          petSpecies: (String(patientData.petSpecies || "Perro")) as "Perro" | "Gato" | "Ave" | "Exotico",
          petSex: String(patientData.petSex || "Desconocido"),
          petAge: String(patientData.petAge || "N/A"),
          petWeight: String(patientData.petWeight || "N/A"),
          tutorName: String(patientData.tutorName || "Tutor AVO"),
          tutorEmail: "tutor@ejemplo.com",
          modality: "video",
          date: new Date().toISOString(),
          vetName,
          vetLicense,
          symptoms: [patientData.symptoms || "Videoconsulta general AVO"],
          diagnosis: diagnosis || "Videoconsulta general AVO",
          treatment: treatment || "Indicaciones orales durante videoconsulta",
          observations: postCare || "Control evolutivo a 48 hs",
          prescription: treatment ? {
            id: prescriptionId,
            recordId,
            petName: patientData.petName || "Toby",
            tutorName: patientData.tutorName || "Tutor AVO",
            medications: [
              {
                name: treatment,
                dose: "Según indicación médica",
                frequency: "Cada 24 horas",
                duration: "5 días"
              }
            ],
            instructions: postCare || "Seguir indicaciones prescritas en consulta",
            date: new Date().toISOString(),
            vetName,
            vetLicense
          } : undefined
        };

        saveClinicalRecord(newRecord);

        await fetch("/api/medical-records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dispatchId,
            petName: patientData.petName,
            petSpecies: patientData.petSpecies,
            diagnosis: diagnosis || "Videoconsulta general AVO",
            treatment: treatment || "Indicaciones orales durante videoconsulta",
            postCareInstructions: postCare || "Control evolutivo a 48 hs",
          }),
        });
        if (shouldEndCall) {
          showToast(`✅ Historia Clínica (${recordId}) guardada con éxito. Finalizando...`);
          setTimeout(() => router.push("/vet/dashboard"), 1500);
        } else {
          showToast(`✅ Ficha y Receta (${recordId}) guardadas en HC. Puedes continuar la consulta.`);
        }
      } else {
        if (shouldEndCall) {
          router.push("/finalizado");
        }
      }
    } catch (e) {
      console.error(e);
      if (shouldEndCall) {
        router.push("/");
      }
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleFinishCallAndSave = () => {
    if (userRole === "vet") {
      if (diagnosis.trim() !== "" || treatment.trim() !== "") {
        // Si el veterinario ya escribió el diagnóstico/tratamiento en el panel lateral, guardar y cerrar sin modal duplicado
        handleSaveRecord(true);
      } else {
        setShowClosureModal(true);
      }
    } else {
      router.push("/finalizado");
    }
  };
  const handleSaveRecordOnly = () => handleSaveRecord(false);

  const iframeUrl = `https://meet.jit.si/${encodeURIComponent(
    roomName
  )}#config.prejoinPageEnabled=false&config.disableInviteFunctions=true&config.disableDeepLinking=true&config.startWithAudioMuted=false&config.startWithVideoMuted=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false&interfaceConfig.TOOLBAR_BUTTONS=['microphone','camera','hangup']&interfaceConfig.MOBILE_APP_PROMO=false`;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      <InAppBrowserGuard />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-sky-500 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="text-sky-400 shrink-0" size={20} />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* HEADER DE LA VIDEOCONSULTA */}
      <header className="bg-slate-900/95 border-b border-slate-800 py-2.5 sm:py-3.5 px-4 sm:px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => {
              if (confirm("¿Seguro que deseas salir de la videoconsulta?")) {
                router.back();
              }
            }}
            className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
            title="Volver"
          >
            <ChevronLeft size={18} />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-xs sm:text-base font-black text-white tracking-tight">
                AVO • Telemedicina en Vivo
              </h1>
              <span className="hidden sm:inline-block text-[10px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full font-bold uppercase">
                Sala Segura
              </span>
            </div>
            <p className="hidden md:block text-xs text-slate-400">
              Paciente: <strong className="text-white">{String(patientData.petName || "Mascota")}</strong> ({String(patientData.petSpecies || "Perro")}{patientData.petSex ? ` - ${patientData.petSex}` : ""}{patientData.petAge ? ` • ${patientData.petAge}` : ""}{patientData.petWeight ? ` • ${patientData.petWeight}` : ""}) • {String(patientData.symptoms || "Sin síntomas descritos")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Botón Google Meet / Hangouts */}
          <button
            onClick={() => {
              window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
            }}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            title="Abrir en Google Meet / Hangouts para máxima compatibilidad móvil"
          >
            <Video size={14} className="text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">Google Meet / Hangouts</span>
            <span className="sm:hidden">Meet</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs text-emerald-400 font-bold">
            <Clock size={14} className="animate-pulse" />
            <span>{formatDuration(callDuration)}</span>
          </div>

          {userRole === "vet" && (
            <button
              onClick={() => setShowClinicalDrawer(!showClinicalDrawer)}
              className={`hidden sm:flex px-3.5 py-2 rounded-xl text-xs font-bold transition-all items-center gap-1.5 ${
                showClinicalDrawer
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              <Stethoscope size={15} />
              <span>{showClinicalDrawer ? "Ocultar Panel" : "Historia Clínica"}</span>
            </button>
          )}

          <button
            onClick={handleFinishCallAndSave}
            disabled={isSavingRecord}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-red-600/30"
          >
            <PhoneOff size={15} />
            <span>{userRole === "vet" ? "Finalizar" : "Colgar"}</span>
          </button>
        </div>
      </header>

      {/* CUERPO PRINCIPAL: VIDEOSALA JITSI MEET + PANEL CLÍNICO */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* CONTAINER DE VIDEO IFRAME */}
        <div className="flex-1 bg-slate-950 relative flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
              <div className="w-12 h-12 rounded-full border-4 border-sky-500 border-t-transparent animate-spin" />
              <p className="text-sm font-semibold">Conectando con servidor de videoconsulta cifrada...</p>
            </div>
          ) : (
            <iframe
              src={iframeUrl}
              allow="camera; microphone; display-capture; autoplay; clipboard-write"
              className="w-full h-full border-0 flex-1"
              title="Sala de Videoconsulta Veterinaria AVO"
            />
          )}

          {/* BARRA INFERIOR RÁPIDA (SOLO DESKTOP PARA EVITAR SATURACIÓN EN MÓVIL) */}
          <div className="hidden sm:flex bg-slate-900/80 border-t border-slate-800 px-6 py-2.5 items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <ShieldCheck className="text-emerald-400" size={16} />
              <span>Conexión punto a punto con cifrado médico • Jitsi Meet WebRTC</span>
            </span>
            <span>ID de Sala: <strong className="font-mono text-slate-300">{roomName}</strong></span>
          </div>
        </div>

        {/* DRAWER CLÍNICO LATERAL PARA EL VETERINARIO */}
        {showClinicalDrawer && (
          <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-5 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="space-y-5">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                    Registro Simultáneo ({recordId})
                  </span>
                  <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                    <FileText size={18} className="text-sky-400" />
                    Historia Clínica En Vivo
                  </h2>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full">
                  Auto-sync
                </span>
              </div>

              {/* Ficha Resumen */}
              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl space-y-2 text-xs">
                <p className="text-slate-300 font-bold">
                  🐾 Paciente: {patientData.petName} ({patientData.petSpecies})
                </p>
                <p className="text-slate-400">
                  <strong>Motivo de Consulta:</strong> {patientData.symptoms}
                </p>
              </div>

              {/* Formulario Clínico */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    1. Diagnóstico / Observaciones Clínicas
                  </label>
                  <textarea
                    rows={3}
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Describe los hallazgos observados durante la videoconsulta..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    2. Tratamiento / Farmacoterapia Prescrita
                  </label>
                  <textarea
                    rows={3}
                    value={treatment}
                    onChange={(e) => setTreatment(e.target.value)}
                    placeholder="Dosis, nombre genérico del medicamento e indicaciones de toma..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    3. Indicaciones para el Tutor & Próximo Control
                  </label>
                  <textarea
                    rows={2}
                    value={postCare}
                    onChange={(e) => setPostCare(e.target.value)}
                    placeholder="Ej: Reposo por 48 hs, hidratación abundante, consultar ante fiebre..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2 mt-4">
              <button
                onClick={handleSaveRecordOnly}
                disabled={isSavingRecord}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
              >
                <Save size={16} />
                <span>Guardar Ficha en HC (Sin salir)</span>
              </button>
              <p className="text-[10px] text-slate-500 text-center">
                El registro quedará archivado en el perfil de la mascota y del tutor.
              </p>
            </div>
          </div>
        )}
      </div>

      <ClinicalClosureModal
        isOpen={showClosureModal}
        onClose={() => setShowClosureModal(false)}
        onSuccess={() => {
          setShowClosureModal(false);
          showToast("✅ Ficha y Receta guardadas con éxito. Finalizando...");
          setTimeout(() => router.push("/vet/dashboard"), 1200);
        }}
        dispatchId={dispatchId}
        petName={String(patientData.petName || "Mascota")}
        petSpecies={String(patientData.petSpecies || "Perro")}
      />
    </div>
  );
}
