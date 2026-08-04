"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  User,
  ShieldCheck,
  Activity,
  Plus,
  Syringe,
  FileText,
  Settings,
  HeartPulse,
  Pill,
  MapPin,
  Phone,
  MessageCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Calendar
} from "lucide-react";
import Link from "next/link";
import {
  getClinicalHistory,
  ClinicalRecord,
  getNearbyPharmacies,
  VeterinaryPharmacy
} from "@/lib/clinical-history";
import { ForcePasswordChangeModal } from "@/components/ui/ForcePasswordChangeModal";
import { TutorNavbar } from "@/components/tutor/TutorNavbar";

interface TutorPet {
  id: string;
  name: string;
  species: string;
  sex: string;
  age: string;
  weight: string;
  breed?: string;
  active?: boolean;
}

function TutorProfileContent() {
  const searchParams = useSearchParams();
  const isPremium = false;

  const [pets, setPets] = useState<TutorPet[]>([
    { id: "pet-toby-1", name: "Toby", species: "Perro", sex: "Macho (Castrado)", age: "4 años", weight: "5.2 kg", breed: "Caniche Toy", active: true }
  ]);
  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [newPetName, setNewPetName] = useState("");
  const [newPetSpecies, setNewPetSpecies] = useState("Perro");
  const [newPetSex, setNewPetSex] = useState("Macho (Castrado)");
  const [newPetAge, setNewPetAge] = useState("");
  const [newPetWeight, setNewPetWeight] = useState("");
  const [newPetBreed, setNewPetBreed] = useState("");

  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [nearbyPharmacies, setNearbyPharmacies] = useState<VetPharmacy[]>([]);
  const [selectedPet, setSelectedPet] = useState("Toby");
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user && data.user.mustChangePassword) {
          setMustChangePassword(true);
        }
      })
      .catch((err) => console.error("Error loading tutor from /api/auth/me:", err));

    if (typeof window !== "undefined") {
      let currentPets: TutorPet[] = [];
      const stored = localStorage.getItem("avo_tutor_pets");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentPets = parsed;
          }
        } catch (e) {}
      }

      try {
        const hist = getClinicalHistory();
        hist.forEach((rec) => {
          if (rec.petName && !currentPets.some((p) => p.name.toLowerCase() === rec.petName.toLowerCase())) {
            currentPets.push({
              id: "pet-" + rec.petName.toLowerCase().replace(/[^a-z0-9]/g, "") + "-" + Date.now(),
              name: rec.petName,
              species: rec.petSpecies || "Perro",
              sex: rec.petSex || "Macho",
              age: rec.petAge || "Desconocida",
              weight: rec.petWeight || "N/A",
              breed: "Mestizo",
              active: true,
            });
          }
        });

        const pendingReq = localStorage.getItem("avo_pending_request") || localStorage.getItem("mock_realtime_dispatch");
        if (pendingReq) {
          const parsedReq = JSON.parse(pendingReq);
          if (parsedReq.petName && !currentPets.some((p) => p.name.toLowerCase() === parsedReq.petName.toLowerCase())) {
            currentPets.push({
              id: "pet-" + parsedReq.petName.toLowerCase().replace(/[^a-z0-9]/g, "") + "-" + Date.now(),
              name: parsedReq.petName,
              species: parsedReq.petSpecies || "Perro",
              sex: "Macho",
              age: "3 años",
              weight: "N/A",
              breed: "Mestizo",
              active: true,
            });
          }
        }
      } catch (e) {}

      if (currentPets.length === 0) {
        currentPets = [
          { id: "pet-toby-1", name: "Toby", species: "Perro", sex: "Macho (Castrado)", age: "4 años", weight: "5.2 kg", breed: "Caniche Toy", active: true }
        ];
      }

      setPets(currentPets);
      localStorage.setItem("avo_tutor_pets", JSON.stringify(currentPets));

      const allHist = getClinicalHistory();
      if (allHist.length > 0 && allHist[0].petName) {
        setSelectedPet(allHist[0].petName);
      } else {
        setSelectedPet(currentPets[0].name);
      }
    }
  }, []);

  const handleAddPet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPetName.trim()) return;
    const newPet: TutorPet = {
      id: "pet-" + newPetName.toLowerCase().replace(/[^a-z0-9]/g, "") + "-" + Date.now(),
      name: newPetName.trim(),
      species: newPetSpecies,
      sex: newPetSex,
      age: newPetAge.trim() || "Desconocida",
      weight: newPetWeight.trim() || "N/A",
      breed: newPetBreed.trim() || "Mestizo",
      active: true,
    };
    const updated = [...pets, newPet];
    setPets(updated);
    setSelectedPet(newPet.name);
    if (typeof window !== "undefined") {
      localStorage.setItem("avo_tutor_pets", JSON.stringify(updated));
    }
    setShowAddPetModal(false);
    setNewPetName("");
    setNewPetAge("");
    setNewPetWeight("");
    setNewPetBreed("");
  };

  useEffect(() => {
    // Carga historial local
    const localHist = getClinicalHistory(selectedPet);
    setRecords(localHist);

    // Carga también desde MySQL / API unificada
    fetch(`/api/medical-records?petName=${encodeURIComponent(selectedPet)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.records) && data.records.length > 0) {
          const apiRecords: ClinicalRecord[] = data.records.map((r: any) => ({
            id: `HC-DB-${String(r.id).slice(0, 8)}`,
            petId: `pet-${String(r.petName || "mascota").toLowerCase()}`,
            petName: r.petName || "Mascota",
            petSpecies: r.petSpecies || "Perro",
            petSex: "N/A",
            petAge: r.petAge || "Desconocida",
            petWeight: r.petWeight || "N/A",
            tutorName: r.dispatch?.tutor?.name || "Tutor AVO",
            tutorEmail: r.dispatch?.tutor?.email || "tutor@avo.com",
            modality: r.dispatch?.serviceType || "domicilio",
            date: r.createdAt || new Date().toISOString(),
            vetName: r.dispatch?.vet?.name || "Dr. Profesional AVO",
            vetLicense: r.dispatch?.vet?.licenseNumber || "MP 14200",
            symptoms: ["Consulta veterinaria"],
            diagnosis: r.diagnosis,
            treatment: r.treatment,
            observations: r.postCareInstructions,
            prescription: r.postCareInstructions ? {
              id: `REC-DB-${String(r.id).slice(0, 8)}`,
              recordId: `HC-DB-${String(r.id).slice(0, 8)}`,
              petName: r.petName || "Mascota",
              tutorName: r.dispatch?.tutor?.name || "Tutor AVO",
              medications: [
                {
                  name: "Tratamiento / Receta Prescripta",
                  dose: "Según indicación médica",
                  frequency: "Diario",
                  duration: "Indicado por profesional",
                }
              ],
              instructions: r.postCareInstructions,
              date: r.createdAt || new Date().toISOString(),
              vetName: r.dispatch?.vet?.name || "Dr. Profesional AVO",
              vetLicense: r.dispatch?.vet?.licenseNumber || "MP 14200",
            } : undefined
          }));

          setRecords((prev) => {
            const combined = [...apiRecords, ...prev];
            const seen = new Set();
            return combined.filter((item) => {
              const key = `${item.petName}-${item.diagnosis}-${item.date.slice(0, 10)}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          });
        }
      })
      .catch((e) => console.warn("No se pudo conectar a /api/medical-records:", e));

    // Carga farmacias cercanas (ej. coordenadas CABA Palermo -34.588, -58.412)
    setNearbyPharmacies(getNearbyPharmacies(-34.588, -58.412, 15));
  }, [selectedPet]);

  const handleOpenWhatsAppPharmacy = (pharmName: string, phone: string) => {
    const msg = encodeURIComponent(
      `Hola ${pharmName}, les escribo desde AVO. Necesito consultar stock y precio de una medicación para mi perro ${selectedPet}.`
    );
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${msg}`, "_blank");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <TutorNavbar />
      <ForcePasswordChangeModal
        isOpen={mustChangePassword}
        onSuccess={() => setMustChangePassword(false)}
      />
      {/* HEADER PRINCIPAL CON IDENTIFICACIÓN DEL TUTOR */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950 text-white p-6 pt-10 rounded-b-[40px] border-b border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <User size={120} />
        </div>
        <div className="relative z-10 flex justify-between items-start max-w-4xl mx-auto">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black">Carlos Rossi</h1>
              <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2.5 py-0.5 rounded-full font-bold uppercase border border-sky-500/30">
                Tutor AVO
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Av. Corrientes 1234, CABA • Miembro Verificado</p>

            <div className="mt-4 inline-flex items-center gap-2 bg-slate-800/80 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold border border-slate-700">
              {isPremium ? (
                <>
                  <ShieldCheck size={16} className="text-amber-400" /> Plan Premium Activo
                </>
              ) : (
                <>
                  <Sparkles size={16} className="text-sky-400" /> Acceso Completo HCD & Recetas
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm("¿Deseas volver a la pantalla inicial de consultas?")) {
                window.location.href = "/";
              }
            }}
            className="bg-slate-800/80 hover:bg-slate-800 p-3 rounded-2xl border border-slate-700 backdrop-blur-md transition-colors"
            title="Ajustes de cuenta"
          >
            <Settings size={22} className="text-slate-300" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-6 relative z-20 space-y-8">
        {/* BANNER DE NUEVA CONSULTA (ACCESO RÁPIDO) */}
        <Link
          href="/solicitar"
          className="block bg-gradient-to-r from-red-600/20 via-slate-900 to-red-600/10 border border-red-500/40 rounded-3xl p-5 shadow-xl hover:border-red-500 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-500/30">
                <HeartPulse size={24} className="text-red-400 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">¿Necesitas Atención Médica Hoy?</h3>
                <p className="text-xs text-slate-400">
                  Solicita una videoconsulta al instante o una visita presencial a domicilio
                </p>
              </div>
            </div>
            <div className="text-red-400 font-bold text-xl group-hover:translate-x-1.5 transition-transform">
              &rarr;
            </div>
          </div>
        </Link>

        {/* SECCIÓN 1: MIS MASCOTAS (TARJETAS DINÁMICAS) */}
        <section className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>🐾 Mis Mascotas</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedPet("Todos")}
                className={`font-bold text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                  selectedPet === "Todos"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                }`}
              >
                Ver Todas (HC)
              </button>
              <button
                onClick={() => setShowAddPetModal(true)}
                className="text-sky-400 font-bold text-xs flex items-center gap-1 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-xl border border-sky-500/20 transition-colors"
              >
                <Plus size={15} /> Añadir Mascota
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pets.map((p) => {
              const petEmoji = p.species === "Gato" ? "🐱" : p.species === "Ave" ? "🦜" : p.species === "Exotico" ? "🐰" : "🐶";
              const petRecordsCount = getClinicalHistory(p.name).length;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPet(p.name)}
                  className={`bg-slate-900/90 border-2 rounded-3xl p-5 cursor-pointer transition-all ${
                    selectedPet === p.name
                      ? "border-sky-500 shadow-xl shadow-sky-500/10"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-3xl shrink-0">
                        {petEmoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-lg text-white">{p.name}</h3>
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                            Activo
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{p.breed || "Mestizo"} • {p.age}</p>
                      </div>
                    </div>
                    <div className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-1 rounded-lg">
                      ID: {p.name.toUpperCase()}-01
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 text-xs">
                    <span className="bg-slate-950 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800 font-semibold">
                      {p.sex}
                    </span>
                    <span className="bg-slate-950 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800 font-semibold">
                      {p.weight}
                    </span>
                    <span className="bg-slate-950 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-semibold ml-auto">
                      {petRecordsCount} Evoluciones HCD
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {showAddPetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <form onSubmit={handleAddPet} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                    <span>🐾 Registrar Nueva Mascota</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddPetModal(false)}
                    className="text-slate-400 hover:text-white font-bold"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre</label>
                    <input
                      type="text"
                      required
                      value={newPetName}
                      onChange={(e) => setNewPetName(e.target.value)}
                      placeholder="Ej: Luna, Simón, Coco..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Especie</label>
                      <select
                        value={newPetSpecies}
                        onChange={(e) => setNewPetSpecies(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                      >
                        <option value="Perro">Perro 🐶</option>
                        <option value="Gato">Gato 🐱</option>
                        <option value="Ave">Ave 🦜</option>
                        <option value="Exotico">Exótico 🐰</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Sexo</label>
                      <select
                        value={newPetSex}
                        onChange={(e) => setNewPetSex(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                      >
                        <option value="Macho (Castrado)">Macho (Castrado)</option>
                        <option value="Macho (Entero)">Macho (Entero)</option>
                        <option value="Hembra (Castrada)">Hembra (Castrada)</option>
                        <option value="Hembra (Entera)">Hembra (Entera)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Edad</label>
                      <input
                        type="text"
                        value={newPetAge}
                        onChange={(e) => setNewPetAge(e.target.value)}
                        placeholder="2 años"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Peso</label>
                      <input
                        type="text"
                        value={newPetWeight}
                        onChange={(e) => setNewPetWeight(e.target.value)}
                        placeholder="6.5 kg"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Raza</label>
                      <input
                        type="text"
                        value={newPetBreed}
                        onChange={(e) => setNewPetBreed(e.target.value)}
                        placeholder="Mestizo"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPetModal(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-black py-2.5 rounded-xl text-sm shadow-lg shadow-sky-500/25"
                  >
                    Guardar Mascota
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>

        {/* SECCIÓN 2: HISTORIA CLÍNICA UNIFICADA (HC-2026-XXXX) & RECETAS DIGITALES */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <FileText className="text-sky-400" size={20} />
                <span>Historia Clínica Digital • {selectedPet}</span>
              </h2>
              <p className="text-xs text-slate-400">
                Informes médicos oficiales y recetas electrónicas emitidas en la red AVO.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
              Formato Oficial: HC-2026-XXXX
            </span>
          </div>

          <div className="space-y-4">
            {records.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center text-slate-400 text-sm">
                No hay evoluciones médicas registradas para este paciente.
              </div>
            ) : (
              records.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-gradient-to-r from-slate-900 to-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4"
                >
                  {/* Cabecera del Registro */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-black bg-sky-500/15 text-sky-400 px-3 py-1 rounded-xl border border-sky-500/30">
                        {rec.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                        <Calendar size={13} />
                        <span>{new Date(rec.date).toLocaleDateString("es-AR")}</span>
                      </span>
                      <span className="text-[10px] font-bold uppercase bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                        {rec.modality === "video" ? "Video Consulta" : "Atención Presencial"}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                      👨‍⚕️ {rec.vetName} ({rec.vetLicense})
                    </div>
                  </div>

                  {/* Diagnóstico Principal */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                      Diagnóstico y Evaluación
                    </span>
                    <p className="text-base font-extrabold text-white">
                      {rec.diagnosis}
                    </p>
                  </div>

                  {/* Síntomas / Motivos */}
                  {rec.symptoms && rec.symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {rec.symptoms.map((sym, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-slate-950 text-slate-300 px-3 py-1 rounded-lg border border-slate-800 font-semibold"
                        >
                          • {sym}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Observaciones médicas */}
                  {rec.observations && (
                    <div className="bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-2xl text-xs text-slate-300 leading-relaxed">
                      <strong className="text-white">Indicaciones / Evolución:</strong> {rec.observations}
                    </div>
                  )}

                  {/* TARJETA DE RECETA ELECTRÓNICA (REC-2026-XXXX) */}
                  {rec.prescription && (
                    <div className="bg-gradient-to-r from-amber-500/10 via-slate-950 to-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                        <div className="flex items-center gap-2">
                          <Pill size={18} className="text-amber-400" />
                          <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                            Receta Electrónica Digital
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                          {rec.prescription.id}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {rec.prescription.medications.map((med, i) => (
                          <div
                            key={i}
                            className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1"
                          >
                            <p className="text-xs font-black text-white">{med.name}</p>
                            <p className="text-xs text-amber-400 font-bold">
                              Dosis: {med.dose}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {med.frequency} • Durante {med.duration}
                            </p>
                          </div>
                        ))}
                      </div>

                      {rec.prescription.instructions && (
                        <p className="text-xs text-slate-300 italic pt-1">
                          📌 <strong>Indicación:</strong> {rec.prescription.instructions}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* SECCIÓN 3: FARMACIAS VETERINARIAS CERCANAS (RECOMENDACIÓN POR DOMICILIO) */}
        <section className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <MapPin className="text-emerald-400" size={20} />
                <span>Farmacias Veterinarias Recomendadas cerca de tu Domicilio</span>
              </h2>
              <p className="text-xs text-slate-400">
                Seleccionadas automáticamente por proximidad según tu dirección en CABA ({nearbyPharmacies.length} farmacias cercanas).
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 self-start sm:self-auto">
              Geolocalización AVO GPS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {nearbyPharmacies.map((pharm) => (
              <div
                key={pharm.id}
                className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 hover:border-slate-700 transition-all space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-white text-sm leading-snug">
                      {pharm.name}
                    </h3>
                    {pharm.isOpen24h && (
                      <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full shrink-0">
                        24 HS
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <MapPin size={13} className="text-sky-400 shrink-0" />
                    <span>{pharm.address}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                  <span className="font-extrabold text-emerald-400">
                    A aprox. {pharm.distanceKm} km
                  </span>
                  <span className="text-amber-400 font-bold">
                    ★ {pharm.rating} / 5.0
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsAppPharmacy(pharm.name, pharm.phone)}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-600/20"
                  >
                    <MessageCircle size={15} />
                    <span>WhatsApp Stock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(`tel:${pharm.phone}`)}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <Phone size={15} />
                    <span>Llamar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function TutorPerfilPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white p-12 text-center">Cargando perfil y registros...</div>}>
      <TutorProfileContent />
    </Suspense>
  );
}
