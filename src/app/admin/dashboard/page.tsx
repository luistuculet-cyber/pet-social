"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  DollarSign,
  Activity,
  Search,
  LogOut,
  UserCheck,
  Stethoscope,
  BadgeCheck,
  TrendingUp,
  Clock,
  MapPin,
  Download,
  Eye,
  RefreshCw,
  Award,
  AlertCircle,
  Settings,
  Sliders,
  CreditCard,
  Percent,
  Save,
  Check,
  Zap,
  Globe,
  Shield,
  PawPrint,
  SlidersHorizontal,
  Layers,
  Radio,
  Trash2,
  KeyRound
} from "lucide-react";

// Helper para UI de Switches / Toggles en tiempo real
const renderToggle = (
  checked: boolean,
  onChange: (val: boolean) => void,
  label: string,
  subtitle?: string
) => (
  <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors">
    <div>
      <p className="text-sm font-bold text-white">{label}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
        checked ? "bg-emerald-500" : "bg-slate-700"
      }`}
    >
      <div
        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
          checked ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

// Tipos de datos para el dashboard de administración
interface Professional {
  id: string;
  name: string;
  email: string;
  licenseNumber: string;
  university: string;
  specialty: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  docs: {
    titleUrl: string;
    dniUrl: string;
    licenseUrl: string;
    insuranceUrl: string;
  };
}

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: "tutor" | "vet" | "admin";
  isPremium: boolean;
  status: "active" | "suspended";
  actionRadiusKm?: number;
  createdAt: string;
}

interface BillingItem {
  id: string;
  invoiceNumber: string;
  date: string;
  clientName: string;
  concept: string;
  method: "MODO" | "Prisma / Tarjeta" | "Transferencia";
  amount: number;
  status: "Cobrado" | "Pendiente";
}

interface ServiceDispatch {
  id: string;
  dispatchId: string;
  tutorName: string;
  petName: string;
  petSpecies: string;
  vetName: string;
  lat: number;
  lng: number;
  status: "En Camino" | "Atendiendo" | "Finalizado" | "Pendiente";
  price: number;
  timeAgo: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"configuracion" | "validaciones" | "usuarios" | "facturacion" | "servicios">("configuracion");
  const [searchTerm, setSearchTerm] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"ALL" | "tutor" | "vet">("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estados del Panel de Configuración AVO (Atención, Triage, Tarifas y Pasarelas de Pago)
  const [cfgRadioKm, setCfgRadioKm] = useState(15);
  const [cfgTimeoutSec, setCfgTimeoutSec] = useState(60);
  const [cfgMaxQueue, setCfgMaxQueue] = useState(5);
  const [cfgAutoDispatch, setCfgAutoDispatch] = useState(true);

  const [cfgTriageAutoVideo, setCfgTriageAutoVideo] = useState(true);
  const [cfgTriageRedAlert, setCfgTriageRedAlert] = useState(true);
  const [cfgTriageRequireMedia, setCfgTriageRequireMedia] = useState(false);
  const [cfgTriageModel, setCfgTriageModel] = useState("AVO-AI-v2.4");

  const [cfgPriceVideo, setCfgPriceVideo] = useState(18000);
  const [cfgPriceHome, setCfgPriceHome] = useState(38000);
  const [cfgNightSurcharge, setCfgNightSurcharge] = useState(25);
  const [cfgPlatformFee, setCfgPlatformFee] = useState(15);

  const [cfgPaywayActive, setCfgPaywayActive] = useState(true);
  const [cfgPaywayMode, setCfgPaywayMode] = useState("PROD");
  const [cfgModoActive, setCfgModoActive] = useState(true);
  const [cfgMercadoPagoActive, setCfgMercadoPagoActive] = useState(true);

  // Auth Guard para Admin Dashboard
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean | null>(null);

  // Cargar veterinarios y usuarios en vivo desde MySQL (/api/users)
  const loadUsersFromDB = () => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const vetList: Professional[] = data
            .filter((u: any) => u.role === "vet")
            .map((u: any) => ({
              id: u.id,
              name: u.name || "Veterinario Sin Nombre",
              email: u.email || "",
              licenseNumber: u.licenseNumber || "MP en trámite",
              university: u.university || "UBA - Facultad de Ciencias Veterinarias",
              specialty: "Clínico & Urgencias a Domicilio",
              status: u.status === "active" ? "approved" : u.status === "rejected" ? "rejected" : "pending",
              submittedAt: u.createdAt || "Reciente",
              docs: {
                titleUrl: "#",
                dniUrl: "#",
                licenseUrl: "#",
                insuranceUrl: "#",
              },
            }));
          setProfessionals(vetList);
          const hasAdmin = data.some((u: any) => u.name?.includes("G3r3nt3") || u.role === "admin");
          setUsers(hasAdmin ? data : [ADMIN_USER, ...data]);
        }
      })
      .catch((err) => console.error("Error fetching /api/users in admin dashboard", err));
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLogged = localStorage.getItem("admin_logged_in") === "true";
      if (!isLogged) {
        fetch("/api/auth/me")
          .then((res) => res.json())
          .then((data) => {
            if (data.user && data.user.role === "admin") {
              localStorage.setItem("admin_logged_in", "true");
              setIsAdminAuthenticated(true);
            } else {
              router.push("/admin/login");
            }
          })
          .catch(() => {
            router.push("/admin/login");
          });
        return;
      }
      setIsAdminAuthenticated(true);

      // Cargar configuración guardada en localStorage
      const saved = localStorage.getItem("avo_config");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.cfgRadioKm !== undefined) setCfgRadioKm(parsed.cfgRadioKm);
          if (parsed.cfgPriceVideo !== undefined) setCfgPriceVideo(parsed.cfgPriceVideo);
          if (parsed.cfgPriceHome !== undefined) setCfgPriceHome(parsed.cfgPriceHome);
          if (parsed.cfgNightSurcharge !== undefined) setCfgNightSurcharge(parsed.cfgNightSurcharge);
          if (parsed.cfgPlatformFee !== undefined) setCfgPlatformFee(parsed.cfgPlatformFee);
          if (parsed.cfgPaywayActive !== undefined) setCfgPaywayActive(parsed.cfgPaywayActive);
          if (parsed.cfgModoActive !== undefined) setCfgModoActive(parsed.cfgModoActive);
          if (parsed.cfgMercadoPagoActive !== undefined) setCfgMercadoPagoActive(parsed.cfgMercadoPagoActive);
        } catch (e) {
          console.error("Error parsing localStorage config", e);
        }
      }

      // Cargar desde base de datos de verdad y como respaldo desde localStorage
      loadUsersFromDB();

      // Sincronizar desde API config
      fetch("/api/config")
        .then((res) => res.json())
        .then((data) => {
          const videoPrice = Number(data.cfgPriceVideo ?? data.videoConsultationPrice);
          const homePrice = Number(data.cfgPriceHome ?? data.homeEmergencyPrice);
          if (!isNaN(videoPrice) && videoPrice > 0) setCfgPriceVideo(videoPrice);
          if (!isNaN(homePrice) && homePrice > 0) setCfgPriceHome(homePrice);
          if (data.coverageRadiusKm) setCfgRadioKm(data.coverageRadiusKm);
        })
        .catch((err) => console.error("Error fetching /api/config", err));
    }
  }, [router]);

  const handleSaveConfig = async () => {
    const configData = {
      cfgRadioKm, cfgTimeoutSec, cfgMaxQueue, cfgAutoDispatch,
      cfgTriageAutoVideo, cfgTriageRedAlert, cfgTriageRequireMedia, cfgTriageModel,
      cfgPriceVideo, cfgPriceHome, cfgNightSurcharge, cfgPlatformFee,
      videoConsultationPrice: cfgPriceVideo,
      homeEmergencyPrice: cfgPriceHome,
      cfgPaywayActive, cfgPaywayMode, cfgModoActive, cfgMercadoPagoActive
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("avo_config", JSON.stringify(configData));
    }
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configData)
      });
    } catch (err) {
      console.error("Error saving config via API", err);
    }
    showToast("✅ Configuración AVO de Atención, Triage, Tarifas y Pasarelas guardada en vivo.");
  };

  // Estado para el visor de documentos adjuntos
  const [activeDocumentModal, setActiveDocumentModal] = useState<{
    docType: string;
    fileName: string;
    fileUrl?: string;
    profName: string;
  } | null>(null);

  // Usuario Administrador Principal por Defecto
  const ADMIN_USER: UserAccount = {
    id: "usr-admin-1",
    name: "G3r3nt3 (Gerencia)",
    email: "gerencia@petsocial.com.ar",
    role: "admin",
    isPremium: true,
    status: "active",
    createdAt: "2026-01-01",
  };

  // Estado de Profesionales que suben documentación (vacío por defecto para casos reales)
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  // Estado de Usuarios (Solo G3r3nt3 por defecto para trabajar con datos reales)
  const [users, setUsers] = useState<UserAccount[]>([ADMIN_USER]);

  // Estado de Facturación y Finanzas
  const [invoices] = useState<BillingItem[]>([
    {
      id: "inv-901",
      invoiceNumber: "FC-A-0001-00004921",
      date: "27/07/2026 - 09:45",
      clientName: "Carlos Rossi",
      concept: "Urgencia a Domicilio - Caniche 'Toby'",
      method: "MODO",
      amount: 35000,
      status: "Cobrado",
    },
    {
      id: "inv-902",
      invoiceNumber: "FC-B-0001-00004920",
      date: "26/07/2026 - 18:20",
      clientName: "Sofía Benítez",
      concept: "Membresía PetSocial Premium (Anual)",
      method: "Prisma / Tarjeta",
      amount: 48000,
      status: "Cobrado",
    },
    {
      id: "inv-903",
      invoiceNumber: "FC-A-0001-00004919",
      date: "26/07/2026 - 14:10",
      clientName: "Lucas Almagro",
      concept: "Urgencia a Domicilio + Kit Inyectable",
      method: "Prisma / Tarjeta",
      amount: 42500,
      status: "Cobrado",
    },
    {
      id: "inv-904",
      invoiceNumber: "FC-A-0001-00004918",
      date: "25/07/2026 - 22:15",
      clientName: "Mariana Silva",
      concept: "Urgencia Nocturna - Golden Retriever",
      method: "MODO",
      amount: 51000,
      status: "Cobrado",
    },
  ]);

  // Estado de Servicios y Despachos
  const [dispatches] = useState<ServiceDispatch[]>([
    {
      id: "srv-1",
      dispatchId: "DS-9020",
      tutorName: "Carlos Rossi",
      petName: "Toby",
      petSpecies: "Perro (Caniche)",
      vetName: "Dra. Elena Martínez",
      lat: -34.598,
      lng: -58.421,
      status: "En Camino",
      price: 35000,
      timeAgo: "Hace 8 min",
    },
    {
      id: "srv-2",
      dispatchId: "DS-9019",
      tutorName: "Agustina López",
      petName: "Mishi",
      petSpecies: "Gato (Siamés)",
      vetName: "Dr. Ricardo Pérez",
      lat: -34.615,
      lng: -58.384,
      status: "Atendiendo",
      price: 38000,
      timeAgo: "Hace 22 min",
    },
    {
      id: "srv-3",
      dispatchId: "DS-9018",
      tutorName: "Lucas Almagro",
      petName: "Rocky",
      petSpecies: "Perro (Bulldog)",
      vetName: "Dra. Elena Martínez",
      lat: -34.588,
      lng: -58.41,
      status: "Finalizado",
      price: 42500,
      timeAgo: "Ayer",
    },
  ]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Acciones en la pestaña de Validación
  const handleApproveProfessional = async (id: string, name: string) => {
    setProfessionals((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, status: "approved" as const } : p));
      if (typeof window !== "undefined") {
        localStorage.setItem("avo_pending_professionals", JSON.stringify(updated));
      }
      return updated;
    });
    showToast(`✅ ${name} ha sido VALIDADO y habilitado para operar como profesional.`);
    try {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", userId: id, status: "active" }),
      });
      loadUsersFromDB();
    } catch (e) {
      console.error("Error update_status in DB:", e);
    }
  };

  const handleRejectProfessional = async (id: string, name: string) => {
    setProfessionals((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, status: "rejected" as const } : p));
      if (typeof window !== "undefined") {
        localStorage.setItem("avo_pending_professionals", JSON.stringify(updated));
      }
      return updated;
    });
    showToast(`❌ Solicitud de ${name} rechazada/observada.`);
    try {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", userId: id, status: "rejected" }),
      });
      loadUsersFromDB();
    } catch (e) {
      console.error("Error update_status in DB:", e);
    }
  };

  const handleDeleteProfessional = async (id: string, name: string) => {
    setProfessionals((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      if (typeof window !== "undefined") {
        localStorage.setItem("avo_pending_professionals", JSON.stringify(updated));
      }
      return updated;
    });
    showToast(`🗑️ Registro de ${name} ELIMINADO del sistema.`);
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_user', userId: id, id })
      });
      loadUsersFromDB();
    } catch (e) {
      console.error('Error delete professional via API', e);
    }
  };

  // Cambiar rol de usuario
  const handleChangeRole = async (id: string, newRole: "tutor" | "vet" | "admin") => {
    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === id ? { ...u, role: newRole } : u));
      if (typeof window !== "undefined") {
        localStorage.setItem("avo_users", JSON.stringify(updated));
      }
      return updated;
    });
    showToast(`Rol de usuario actualizado a ${newRole.toUpperCase()}.`);
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_role', userId: id, newRole })
      });
    } catch (e) {
      console.error('Error updating role via API', e);
    }
  };

  // Eliminar Usuario
  const handleDeleteUser = async (id: string, name: string) => {
    if (name.includes("G3r3nt3") || id === "usr-admin-1") {
      showToast("⚠️ El usuario Administrador G3r3nt3 no puede ser eliminado.");
      return;
    }

    setUsers((prev) => {
      const updated = prev.filter((u) => u.id !== id);
      if (typeof window !== "undefined") {
        localStorage.setItem("avo_users", JSON.stringify(updated));
      }
      return updated;
    });
    showToast(`🗑️ Usuario ${name} ELIMINADO del sistema.`);

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_user', userId: id, id })
      });
      loadUsersFromDB();
    } catch (e) {
      console.error('Error deleting user via API', e);
    }
  };

  // Crear nuevo usuario Manager / Admin
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "vet" | "tutor">("admin");
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    const created: UserAccount = {
      id: `usr-${Date.now()}`,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      isPremium: true,
      status: "active",
      createdAt: new Date().toISOString().substring(0, 10),
    };

    setUsers((prev) => {
      const updated = [created, ...prev];
      if (typeof window !== "undefined") {
        localStorage.setItem("avo_users", JSON.stringify(updated));
      }
      return updated;
    });
    showToast(`✅ Nuevo usuario ${newUserName} creado como ${newUserRole.toUpperCase()}.`);
    setNewUserName("");
    setNewUserEmail("");
    setShowAddUserModal(false);

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: newUserName,
          email: newUserEmail,
          role: newUserRole
        })
      });
    } catch (e) {
      console.error('Error creating user via API', e);
    }
  };

  // Acciones en usuarios (Suspender / Reactivar)
  const handleToggleUserStatus = (id: string) => {
    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === id) {
          const nextStatus = u.status === "active" ? "suspended" : "active";
          showToast(`Usuario ${u.name} cambiado a estado ${nextStatus.toUpperCase()}.`);
          return { ...u, status: nextStatus as "active" | "suspended" };
        }
        return u;
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("avo_users", JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleForcePasswordChange = async (id: string, name: string) => {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "force_password_change", userId: id, id, mustChangePassword: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, mustChangePassword: true } : u)));
        showToast(`✅ Cambio de clave forzado para ${name}. En su próximo login deberá cambiar la contraseña.`);
        loadUsersFromDB();
      } else {
        showToast(`⚠️ Error: ${data.error || "No se pudo forzar el cambio de clave"}`);
      }
    } catch (error) {
      console.error("Error forzando cambio de clave:", error);
      showToast("⚠️ Error al comunicarse con el servidor");
    }
  };

  const pendingCount = professionals.filter((p) => p.status === "pending").length;

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = userRoleFilter === "ALL" ? true : u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Toast Notificación */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-sky-500 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <BadgeCheck className="text-sky-400 shrink-0" size={20} />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* HEADER PRINCIPAL / BARRA GERENCIAL */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-sky-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-md shadow-sky-500/20">
              <ShieldAlert className="text-white" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  AVO HQ • Asistencia Veterinaria Online
                </h1>
                <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full font-bold uppercase">
                  Consola G3r3nt3
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gestión Integral, Facturación y Validación Médica
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-medium">
                Sesión Segura: <strong className="text-white font-mono">G3r3nt3</strong>
              </span>
            </div>

            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("admin_logged_in");
                }
                router.push("/admin/login");
              }}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors border border-slate-700"
            >
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* MÉTRICAS DE RESUMEN EJECUTIVO (KPI CARDS) */}
      <div className="bg-slate-900/40 border-b border-slate-800/80 py-6">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Ingresos del Mes
              </p>
              <p className="text-2xl font-extrabold text-white mt-1">
                $4.850.000 <span className="text-xs font-normal text-slate-400">ARS</span>
              </p>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold mt-2">
                <TrendingUp size={14} />
                +18.4% vs mes anterior
              </span>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <DollarSign size={24} className="text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Urgencias Atendidas
              </p>
              <p className="text-2xl font-extrabold text-white mt-1">156</p>
              <span className="inline-flex items-center gap-1 text-xs text-sky-400 font-semibold mt-2">
                <Activity size={14} />
                12 activas hoy
              </span>
            </div>
            <div className="w-12 h-12 bg-sky-500/10 rounded-xl flex items-center justify-center">
              <Stethoscope size={24} className="text-sky-400" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Pendientes Validación
              </p>
              <p className="text-2xl font-extrabold text-white mt-1">
                {pendingCount}
              </p>
              <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-semibold mt-2">
                <UserCheck size={14} />
                Requieren revisión
              </span>
            </div>
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <Award size={24} className="text-amber-400" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Usuarios Registrados
              </p>
              <p className="text-2xl font-extrabold text-white mt-1">1.342</p>
              <span className="inline-flex items-center gap-1 text-xs text-purple-400 font-semibold mt-2">
                <Users size={14} />
                Tutores y Vets activos
              </span>
            </div>
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Users size={24} className="text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="max-w-7xl mx-auto px-6 pt-6 w-full">
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
          <button
            onClick={() => setActiveTab("configuracion")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === "configuracion"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
                : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Settings size={18} />
            <span>Configuración AVO (Triage, Tarifas & Pagos)</span>
          </button>

          <button
            onClick={() => setActiveTab("validaciones")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === "validaciones"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
                : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <UserCheck size={18} />
            <span>Validar Profesionales</span>
            {pendingCount > 0 && (
              <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-xs font-extrabold">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("usuarios")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === "usuarios"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
                : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Users size={18} />
            <span>Administrar Usuarios</span>
          </button>

          <button
            onClick={() => setActiveTab("facturacion")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === "facturacion"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
                : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <DollarSign size={18} />
            <span>Facturación y Finanzas</span>
          </button>

          <button
            onClick={() => setActiveTab("servicios")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === "servicios"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
                : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Activity size={18} />
            <span>Servicios / Urgencias</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO DEL PANEL */}
      <main className="max-w-7xl mx-auto px-6 py-8 w-full flex-1">
        {/* PESTAÑA 0: CONFIGURACIÓN GERENCIAL AVO */}
        {activeTab === "configuracion" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header de Configuración */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl">
              <div>
                <span className="inline-block px-3 py-1 bg-sky-500/20 text-sky-400 text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
                  Consola G3r3nt3 • Configuración en Tiempo Real
                </span>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <Settings className="text-sky-400" />
                  Parámetros del Sistema AVO: Atención, Triage, Tarifas & Pagos
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Ajusta la lógica operativa de asignación de guardias, algoritmos clínicos, precios de consulta e integraciones fintech.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveConfig}
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <Save size={18} />
                  <span>Guardar Configuración</span>
                </button>
              </div>
            </div>

            {/* Grid 2x2 de Módulos de Configuración */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* CARD 1: VARIABLES DE ATENCIÓN Y LOGÍSTICA DE GUARDIA */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center">
                    <Sliders size={20} className="text-sky-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Variables de Atención & Logística</h3>
                    <p className="text-xs text-slate-400">Radio de ambulancia, cola de espera y tiempos</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-sm font-semibold text-slate-300">
                        Radio Máximo de Cobertura por Veterinario
                      </label>
                      <span className="text-sky-400 font-extrabold text-sm">{cfgRadioKm} km</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={50}
                      value={cfgRadioKm}
                      onChange={(e) => setCfgRadioKm(Number(e.target.value))}
                      className="w-full accent-sky-500 bg-slate-800 rounded-lg h-2 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>5 km (Urbano)</span>
                      <span>25 km (Metropolitano)</span>
                      <span>50 km (Ampliado)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">
                        Tiempo Límite Aceptación
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={cfgTimeoutSec}
                          onChange={(e) => setCfgTimeoutSec(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold text-sm"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-500">seg</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">
                        Máx. Urgencias en Cola
                      </label>
                      <input
                        type="number"
                        value={cfgMaxQueue}
                        onChange={(e) => setCfgMaxQueue(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold text-sm"
                      />
                    </div>
                  </div>

                  {renderToggle(
                    cfgAutoDispatch,
                    setCfgAutoDispatch,
                    "Asignación Automática Inteligente (GPS)",
                    "Derivar ambulancia al veterinario online más cercano en radio"
                  )}
                </div>
              </div>

              {/* CARD 2: PROTOCOLOS DE TRIAGE & REGLAS CLÍNICAS */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                    <Stethoscope size={20} className="text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Parámetros de Triage & Clínica</h3>
                    <p className="text-xs text-slate-400">Algoritmo de orientación, alertas y filtros</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                      Motor de Triage Inteligente
                    </label>
                    <select
                      value={cfgTriageModel}
                      onChange={(e) => setCfgTriageModel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold text-sm focus:border-purple-500 outline-none"
                    >
                      <option value="AVO-AI-v2.4">AVO-AI-v2.4 (Recomendación IA + Protocolo de Urgencia Estandarizado)</option>
                      <option value="ESTANDAR-MANUAL">Triage Estándar Clínico Manual</option>
                      <option value="STRICT-URGENCY">Priorizar Urgencia Presencial en Casos Moderados</option>
                    </select>
                  </div>

                  {renderToggle(
                    cfgTriageAutoVideo,
                    setCfgTriageAutoVideo,
                    "Derivación Rápida a Video en Síntomas Leves",
                    "Redirigir automáticamente a telemedicina sin requerir ambulancia"
                  )}

                  {renderToggle(
                    cfgTriageRedAlert,
                    setCfgTriageRedAlert,
                    "Alerta Roja Automática para Traumatismos",
                    "Despacho prioritario <10 min en accidentes, caídas y convulsiones"
                  )}

                  {renderToggle(
                    cfgTriageRequireMedia,
                    setCfgTriageRequireMedia,
                    "Exigir Foto / Video antes del Despacho",
                    "Solicitar archivo al tutor durante la carga de síntomas"
                  )}
                </div>
              </div>

              {/* CARD 3: TARIFAS DE SERVICIO, RECARGOS Y COMISIONES */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <DollarSign size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Tarifas, Precios & Comisiones</h3>
                    <p className="text-xs text-slate-400">Aranceles base, feriados y comisión AVO</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">
                        Tarifa Video Consulta ($)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-500 text-sm">$</span>
                        <input
                          type="number"
                          value={cfgPriceVideo}
                          onChange={(e) => setCfgPriceVideo(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2.5 text-white font-extrabold text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">
                        Tarifa Urgencia a Domicilio ($)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-500 text-sm">$</span>
                        <input
                          type="number"
                          value={cfgPriceHome}
                          onChange={(e) => setCfgPriceHome(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2.5 text-white font-extrabold text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">
                        Recargo Nocturno / Feriado (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={cfgNightSurcharge}
                          onChange={(e) => setCfgNightSurcharge(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-extrabold text-sm"
                        />
                        <span className="absolute right-3 top-2.5 text-slate-500 text-sm">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">
                        Comisión Plataforma AVO (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={cfgPlatformFee}
                          onChange={(e) => setCfgPlatformFee(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-extrabold text-sm"
                        />
                        <span className="absolute right-3 top-2.5 text-slate-500 text-sm">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-bold">Liquidación estimada profesional (Domicilio):</span>
                    <span className="text-white font-extrabold">
                      ${Math.round(cfgPriceHome * (1 - cfgPlatformFee / 100)).toLocaleString("es-AR")} ARS
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD 4: PASARELAS DE PAGO (INTEGRACIONES FINTECH) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                    <CreditCard size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Pasarelas de Pago & Fintech</h3>
                    <p className="text-xs text-slate-400">Tarjetas, QR Interbancario, Prisma & MODO</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {/* Prisma / Payway */}
                  <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${cfgPaywayActive ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                        <p className="text-sm font-bold text-white">Prisma / Payway (Crédito y Débito)</p>
                      </div>
                      <select
                        value={cfgPaywayMode}
                        onChange={(e) => setCfgPaywayMode(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 font-bold"
                      >
                        <option value="PROD">PROD</option>
                        <option value="SANDBOX">TEST</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Comercio ID: <strong className="text-slate-300">PRISMA-AVO-9941</strong></span>
                      <button
                        onClick={() => setCfgPaywayActive(!cfgPaywayActive)}
                        className={`font-extrabold ${cfgPaywayActive ? "text-emerald-400" : "text-slate-500"}`}
                      >
                        {cfgPaywayActive ? "CONECTADO" : "DESACTIVADO"}
                      </button>
                    </div>
                  </div>

                  {/* MODO (QR Interbancario) */}
                  <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${cfgModoActive ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                        <p className="text-sm font-bold text-white">MODO / QR Interbancario (3.0)</p>
                      </div>
                      <span className="bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded text-[10px] font-extrabold">INSTANT</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Webhook URL: <strong className="text-slate-300">api.avo-vet.com/v1/modo</strong></span>
                      <button
                        onClick={() => setCfgModoActive(!cfgModoActive)}
                        className={`font-extrabold ${cfgModoActive ? "text-emerald-400" : "text-slate-500"}`}
                      >
                        {cfgModoActive ? "CONECTADO" : "DESACTIVADO"}
                      </button>
                    </div>
                  </div>

                  {/* Mercado Pago */}
                  <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${cfgMercadoPagoActive ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                        <p className="text-sm font-bold text-white">Mercado Pago (Checkout PRO & QR)</p>
                      </div>
                      <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-extrabold">ACTIVO</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Public Key: <strong className="text-slate-300">APP_USR-88192-AVO</strong></span>
                      <button
                        onClick={() => setCfgMercadoPagoActive(!cfgMercadoPagoActive)}
                        className={`font-extrabold ${cfgMercadoPagoActive ? "text-emerald-400" : "text-slate-500"}`}
                      >
                        {cfgMercadoPagoActive ? "CONECTADO" : "DESACTIVADO"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* PESTAÑA 1: VALIDACIÓN DE PROFESIONALES */}
        {activeTab === "validaciones" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Validación de Documentación Profesional
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Revisa y aprueba el título universitario, matrícula CVPBA y seguro para habilitarlos en la red de urgencias.
                </p>
              </div>
              <button
                onClick={() => {
                  showToast("Buscando nuevas solicitudes de veterinarios en la base de datos...");
                  loadUsersFromDB();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 text-sm font-semibold transition-colors"
              >
                <RefreshCw size={16} />
                <span>Actualizar Lista</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {professionals.map((prof) => (
                <div
                  key={prof.id}
                  className={`bg-slate-900/90 border rounded-2xl p-6 transition-all ${
                    prof.status === "approved"
                      ? "border-emerald-500/50 bg-emerald-950/10"
                      : prof.status === "rejected"
                      ? "border-red-500/50 bg-red-950/10 opacity-75"
                      : "border-slate-800"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-bold text-lg text-white">
                          {prof.name}
                        </span>
                        <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-mono">
                          {prof.licenseNumber}
                        </span>
                        {prof.status === "pending" && (
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                            <Clock size={12} />
                            Pendiente Validación
                          </span>
                        )}
                        {prof.status === "approved" && (
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            Habilitado / Validado
                          </span>
                        )}
                        {prof.status === "rejected" && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                            <XCircle size={12} />
                            Rechazado / Observado
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-300">
                        <p>
                          <strong className="text-slate-400">Universidad:</strong>{" "}
                          {prof.university}
                        </p>
                        <p>
                          <strong className="text-slate-400">Especialidad:</strong>{" "}
                          {prof.specialty}
                        </p>
                        <p>
                          <strong className="text-slate-400">Email:</strong>{" "}
                          {prof.email}
                        </p>
                        <p>
                          <strong className="text-slate-400">Enviado:</strong>{" "}
                          {prof.submittedAt}
                        </p>
                      </div>

                      {/* Botones de Inspección de Documentos Reales con Descarga */}
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <button
                          onClick={() => setActiveDocumentModal({
                            docType: "🪪 DNI (Frente y Dorso)",
                            fileName: (prof.docs as Record<string, string | undefined>)?.dniName || prof.docs?.dniUrl || "DNI_Adjunto.pdf",
                            fileUrl: prof.docs?.dniUrl,
                            profName: prof.name
                          })}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                        >
                          <Eye size={14} className="text-sky-400" />
                          <span>DNI / Identidad</span>
                        </button>
                        <button
                          onClick={() => setActiveDocumentModal({
                            docType: "🎓 Título Universitario",
                            fileName: (prof.docs as Record<string, string | undefined>)?.titleName || prof.docs?.titleUrl || "Titulo_Universitario.pdf",
                            fileUrl: prof.docs?.titleUrl,
                            profName: prof.name
                          })}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                        >
                          <FileText size={14} className="text-emerald-400" />
                          <span>Título Universitario</span>
                        </button>
                        <button
                          onClick={() => setActiveDocumentModal({
                            docType: "📜 Constancia de Matrícula Profesional",
                            fileName: (prof.docs as Record<string, string | undefined>)?.licenseName || prof.docs?.licenseUrl || "Matricula_Profesional.pdf",
                            fileUrl: prof.docs?.licenseUrl,
                            profName: prof.name
                          })}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                        >
                          <Award size={14} className="text-amber-400" />
                          <span>Matrícula Profesional</span>
                        </button>
                        <button
                          onClick={() => setActiveDocumentModal({
                            docType: "🛡️ Póliza de Seguro Profesional / Mala Praxis",
                            fileName: (prof.docs as Record<string, string | undefined>)?.insuranceName || prof.docs?.insuranceUrl || "Seguro_Mala_Praxis.pdf",
                            fileUrl: prof.docs?.insuranceUrl,
                            profName: prof.name
                          })}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                        >
                          <ShieldAlert size={14} className="text-purple-400" />
                          <span>Seguro Profesional</span>
                        </button>
                      </div>
                    </div>

                    {/* Botones de acción del gerente */}
                    <div className="flex sm:flex-row lg:flex-col gap-2 shrink-0">
                      {prof.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApproveProfessional(prof.id, prof.name)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                          >
                            <CheckCircle2 size={16} />
                            <span>Aprobar y Habilitar</span>
                          </button>
                          <button
                            onClick={() => handleRejectProfessional(prof.id, prof.name)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 font-semibold text-xs rounded-xl border border-slate-700 transition-all"
                          >
                            <XCircle size={16} />
                            <span>Rechazar / Observar</span>
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => handleDeleteProfessional(prof.id, prof.name)}
                        title="Borrar Registro"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-xs rounded-xl border border-red-500/30 transition-all"
                      >
                        <Trash2 size={16} />
                        <span>Borrar Registro</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PESTAÑA 2: GESTIÓN DE USUARIOS */}
        {activeTab === "usuarios" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Administración de Usuarios del Sistema
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Gestiona tutores, profesionales veterinarios y cuentas gerenciales. Asigna roles en tiempo real.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAddUserModal(!showAddUserModal)}
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white rounded-xl text-sm font-bold shadow-md shadow-sky-500/20 transition-all"
                >
                  + Crear Manager / Usuario
                </button>

                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3.5 top-3 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre o email..."
                    className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-64"
                  />
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) =>
                    setUserRoleFilter(e.target.value as "ALL" | "tutor" | "vet")
                  }
                  className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-sky-500 font-semibold"
                >
                  <option value="ALL">Todos los Roles</option>
                  <option value="tutor">Tutores</option>
                  <option value="vet">Veterinarios</option>
                  <option value="admin">Administradores / Managers</option>
                </select>
              </div>
            </div>

            {/* FORMULARIO CREAR USUARIO / MANAGER */}
            {showAddUserModal && (
              <form onSubmit={handleCreateNewUser} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 animate-in fade-in duration-300">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="text-sky-400" size={18} />
                  <span>Crear Nuevo Usuario Gerencial o Profesional</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Lic. Martín Rossi"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      placeholder="ejemplo@avo.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Rol Asignado</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as "admin" | "vet" | "tutor")}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 font-bold"
                    >
                      <option value="admin">Administrador / Manager HQ</option>
                      <option value="vet">Médico Veterinario</option>
                      <option value="tutor">Tutor de Mascota</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/20"
                  >
                    Guardar Usuario
                  </button>
                </div>
              </form>
            )}

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900 text-xs font-semibold uppercase text-slate-400">
                      <th className="p-4">Usuario</th>
                      <th className="p-4">Rol</th>
                      <th className="p-4">Plan</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4">Radio Acción</th>
                      <th className="p-4">Fecha Registro</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm">
                    {filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-4 font-medium text-white">
                          <div>
                            <div>{u.name}</div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.id, e.target.value as "tutor" | "vet" | "admin")}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase bg-slate-950 border border-slate-800 cursor-pointer focus:outline-none focus:border-sky-500 ${
                              u.role === "admin"
                                ? "text-purple-400"
                                : u.role === "vet"
                                ? "text-sky-400"
                                : "text-slate-300"
                            }`}
                          >
                            <option value="tutor">Tutor</option>
                            <option value="vet">Veterinario</option>
                            <option value="admin">Admin / Manager</option>
                          </select>
                        </td>
                        <td className="p-4">
                          {u.isPremium ? (
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full font-bold">
                              ★ Premium
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">Básico</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              u.status === "active"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {u.status === "active" ? "Activo" : "Suspendido"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300">
                          {u.actionRadiusKm ? `${u.actionRadiusKm} km` : "—"}
                        </td>
                        <td className="p-4 text-slate-400 text-xs">
                          {u.createdAt}
                        </td>
                        <td className="p-4 text-right">
                          {u.role !== "admin" && !u.name.includes("G3r3nt3") ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleUserStatus(u.id)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                  u.status === "active"
                                    ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                    : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                }`}
                              >
                                {u.status === "active" ? "Suspender" : "Reactivar"}
                              </button>

                              <button
                                onClick={() => handleForcePasswordChange(u.id, u.name)}
                                title="Forzar cambio de clave en el próximo inicio de sesión"
                                className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-xs font-semibold border border-amber-500/30 transition-colors flex items-center gap-1"
                              >
                                <KeyRound size={12} />
                                <span>Forzar Clave</span>
                              </button>

                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                title="Eliminar usuario permanentemente"
                                className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold border border-red-500/30 transition-colors flex items-center gap-1"
                              >
                                <Trash2 size={12} />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-purple-400 font-bold bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20">👑 Admin HQ</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: FACTURACIÓN Y FINANZAS */}
        {activeTab === "facturacion" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Facturación, Cobranzas y AFIP
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Revisa los cobros de urgencias a domicilio y membresías con MODO / Prisma.
                </p>
              </div>

              <button
                onClick={() => showToast("Exportando reporte contable a Excel/PDF...")}
                className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-sky-500/20 transition-all"
              >
                <Download size={16} />
                <span>Exportar Reporte Contable</span>
              </button>
            </div>

            {/* TABLA DE FACTURAS RECIENTES */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900 text-xs font-semibold uppercase text-slate-400">
                      <th className="p-4">Factura N°</th>
                      <th className="p-4">Fecha y Hora</th>
                      <th className="p-4">Cliente / Tutor</th>
                      <th className="p-4">Concepto</th>
                      <th className="p-4">Medio de Pago</th>
                      <th className="p-4">Importe</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm">
                    {invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-4 font-mono font-bold text-sky-400 text-xs">
                          {inv.invoiceNumber}
                        </td>
                        <td className="p-4 text-slate-400 text-xs">{inv.date}</td>
                        <td className="p-4 font-semibold text-white">
                          {inv.clientName}
                        </td>
                        <td className="p-4 text-slate-300">{inv.concept}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold">
                            {inv.method}
                          </span>
                        </td>
                        <td className="p-4 font-extrabold text-white">
                          ${inv.amount.toLocaleString("es-AR")}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">
                            ✓ {inv.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() =>
                              showToast(`Descargando ${inv.invoiceNumber}...`)
                            }
                            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                            title="Descargar PDF AFIP"
                          >
                            <Download size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: SERVICIOS Y DESPACHOS */}
        {activeTab === "servicios" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-sky-900/60 via-slate-900 to-emerald-950/60 border border-sky-500/40 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-black text-sky-400 uppercase tracking-widest">
                    Hito 3 • Torre de Control Satelital 24/7
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white">
                  Torre de Control de Operaciones y Radar en Vivo
                </h2>
                <p className="text-sm text-slate-300 max-w-2xl">
                  Accede al mapa geoespacial en tiempo real con posiciones de veterinarios online, cronómetro de despacho de 45 segundos e intervención manual de emergencias (override).
                </p>
              </div>
              <button
                onClick={() => router.push("/admin/operations")}
                className="px-6 py-4 bg-sky-500 hover:bg-sky-400 text-white font-extrabold rounded-2xl shadow-xl shadow-sky-500/30 transition-all flex items-center gap-3 text-sm shrink-0"
              >
                <Radio className="animate-pulse" size={20} />
                <span>ABRIR TORRE DE CONTROL (MAPA VIVO)</span>
              </button>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                Monitoreo de Urgencias y Despachos (24/7)
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Visualiza el estado de las ambulancias y veterinarios en curso en toda la red.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dispatches.map((dsp) => (
                <div
                  key={dsp.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs bg-slate-800 text-sky-400 px-3 py-1 rounded-full font-bold">
                      #{dsp.dispatchId}
                    </span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        dsp.status === "En Camino"
                          ? "bg-sky-500/20 text-sky-400 animate-pulse"
                          : dsp.status === "Atendiendo"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {dsp.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm">
                    <p className="text-xs text-slate-400">{dsp.timeAgo}</p>
                    <h3 className="text-lg font-bold text-white">
                      {dsp.petName}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        ({dsp.petSpecies})
                      </span>
                    </h3>
                    <p className="text-slate-300">
                      <strong className="text-slate-400">Tutor:</strong>{" "}
                      {dsp.tutorName}
                    </p>
                    <p className="text-slate-300">
                      <strong className="text-slate-400">Prestador:</strong>{" "}
                      {dsp.vetName}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-base font-extrabold text-white">
                      ${dsp.price.toLocaleString("es-AR")} ARS
                    </span>
                    <button
                      onClick={() =>
                        showToast(`Coordenadas: ${dsp.lat}, ${dsp.lng}`)
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <MapPin size={14} className="text-sky-400" />
                      <span>Ver en Mapa</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE INSPECCIÓN DE DOCUMENTOS ADJUNTOS POR EL PROFESIONAL */}
      {activeDocumentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg p-6 rounded-3xl shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-500/20 text-sky-400 rounded-xl flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{activeDocumentModal.docType}</h3>
                  <p className="text-xs text-slate-400">Profesional: <strong className="text-white">{activeDocumentModal.profName}</strong></p>
                </div>
              </div>
              <button
                onClick={() => setActiveDocumentModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Archivo Adjunto:</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">Verificado HQ</span>
              </div>
              
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
                <FileText className="text-sky-400 shrink-0" size={24} />
                <div className="overflow-hidden">
                  <p className="font-bold text-white text-sm truncate">{activeDocumentModal.fileName}</p>
                  <p className="text-[11px] text-slate-400 font-mono">Formato: PDF / Imagen • Adjuntado por el profesional</p>
                </div>
              </div>

              {/* Previsualización en vivo si es una imagen o Data URL de imagen */}
              {activeDocumentModal.fileUrl && activeDocumentModal.fileUrl.startsWith("data:image/") && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-slate-400 mb-1.5">Previsualización de Documento:</p>
                  <div className="w-full max-h-56 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center p-2">
                    <img 
                      src={activeDocumentModal.fileUrl} 
                      alt={activeDocumentModal.fileName}
                      className="max-h-52 object-contain rounded-lg shadow-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveDocumentModal(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cerrar Visor
              </button>
              
              {activeDocumentModal.fileUrl && activeDocumentModal.fileUrl.startsWith("data:") ? (
                <a
                  href={activeDocumentModal.fileUrl}
                  download={activeDocumentModal.fileName}
                  onClick={() => showToast(`Descargando ${activeDocumentModal.fileName}...`)}
                  className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition-colors"
                >
                  <Download size={14} />
                  <span>Descargar Archivo Adjunto</span>
                </a>
              ) : (
                <button
                  onClick={() => showToast(`Generando copia de respaldo de ${activeDocumentModal.fileName}...`)}
                  className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition-colors"
                >
                  <Download size={14} />
                  <span>Descargar Documento</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-4 bg-slate-950 text-center text-xs text-slate-500">
        AVO HQ v0.3 • Asistencia Veterinaria Online • Consola Gerencial • Auditoría Médica Activa
      </footer>
    </div>
  );
}
