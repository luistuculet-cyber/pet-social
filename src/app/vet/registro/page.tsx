'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Lock,
  FileBadge,
  UploadCloud,
  MapPin,
  CheckCircle,
  Navigation,
  DollarSign,
  AlertCircle,
  GraduationCap,
  Building,
  Compass,
  Home,
  Search,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import InteractiveMap from '@/components/InteractiveMap';
import { FormInput } from '@/components/ui/FormInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { FileUploadSlot } from '@/components/ui/FileUploadSlot';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useGeocoding } from '@/hooks/useGeocoding';

interface UploadedDocument {
  name: string;
  sizeFormatted: string;
  type: string;
  file: File;
}

export default function RegistroVetPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Paso 1: Identidad y Matrícula
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [university, setUniversity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Paso 2: Documentación Obligatoria (4 Archivos, hasta 50 MB cada uno)
  const [dniFile, setDniFile] = useState<UploadedDocument | null>(null);
  const [titleFile, setTitleFile] = useState<UploadedDocument | null>(null);
  const [licenseFile, setLicenseFile] = useState<UploadedDocument | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<UploadedDocument | null>(null);

  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Paso 3: Operativa y Geolocalización
  const [addressInput, setAddressInput] = useState('Segurola 1149, Sourdeaux, Buenos Aires');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: -34.5098,
    lng: -58.7012,
  });
  const [radius, setRadius] = useState(10);
  const [cbu, setCbu] = useState('');
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);

  const { geocode } = useGeocoding();

  const handleFileSlotSelect = (
    file: File,
    setDoc: (doc: UploadedDocument | null) => void
  ) => {
    setFileError(null);
    const maxSizeBytes = 50 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setFileError(`El archivo "${file.name}" supera el límite de 50 MB.`);
      return;
    }

    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    setDoc({
      name: file.name,
      sizeFormatted: `${sizeInMb} MB`,
      type: file.type || 'Documento PDF/Imagen',
      file,
    });
  };

  const handleGeocodeAddress = async () => {
    if (!addressInput || addressInput.trim().length < 3) return;
    setIsSearchingAddress(true);
    setSearchStatus('Buscando dirección en el mapa...');

    const result = await geocode(addressInput);
    if (result) {
      setCoords({ lat: result.lat, lng: result.lng });
      setAddressInput(result.displayName);
      setSearchStatus('📍 Mapa centrado. Puedes ajustar la posición del pin.');
    } else {
      setSearchStatus('⚠️ No pudimos ubicar la dirección. Selecciona en el mapa.');
    }
    setIsSearchingAddress(false);
    setTimeout(() => setSearchStatus(null), 4000);
  };

  const handleGetRealGPSLocation = () => {
    setSearchStatus('Consultando GPS de alta precisión...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoords({ lat, lng });
          setAddressInput(`Mi Ubicación GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          setSearchStatus('✅ GPS detectado.');
          setTimeout(() => setSearchStatus(null), 3000);
        },
        (error) => {
          console.warn('GPS Error', error);
          setSearchStatus('⚠️ No se accedió al GPS. Ingresa la dirección.');
          setTimeout(() => setSearchStatus(null), 4000);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step < 3) {
      if (step === 1) {
        if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>_+=~`'/\\[\];\-]/.test(password)) {
          setSubmitError('La contraseña no cumple con los requisitos mínimos de seguridad (8 caracteres, 1 mayúscula, 1 número y 1 carácter especial).');
          return;
        }
        setSubmitError(null);
      }
      setStep(step + 1);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        name,
        email,
        password,
        role: 'vet',
        licenseNumber,
        university,
        address: addressInput,
        lat: coords.lat,
        lng: coords.lng,
        actionRadiusKm: radius,
        cbu,
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar profesional');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('vet_logged_in', 'true');
        localStorage.setItem('avo_active_vet_profile', JSON.stringify({
          name: name || 'Dr. Roberto Martínez',
          licenseNumber: licenseNumber || 'MP 14290',
          specialty: 'Clínico & Urgencias a Domicilio'
        }));
      }

      setStep(4);
    } catch (err: unknown) {
      console.error('Error registrando veterinario:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo completar el registro';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-8 flex flex-col justify-center relative">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <div className="max-w-2xl w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Alta Profesional <span className="text-emerald-500">AVO</span>
          </h1>
          <p className="text-xs text-muted">
            Registro oficial para la red de asistencia veterinaria y urgencias en domicilio.
          </p>
        </div>

        {step < 4 && (
          <StepIndicator
            currentStep={step}
            totalSteps={3}
            labels={[
              'Identidad y Matrícula Profesional',
              'Documentación Obligatoria',
              'Operativa y Geolocalización',
            ]}
          />
        )}

        <form
          onSubmit={handleSubmitRegistration}
          className="bg-surface/90 border border-border p-6 rounded-3xl shadow-2xl space-y-6 backdrop-blur-xl"
        >
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <FormInput
                icon={User}
                label="Nombre Completo (como figura en el DNI)"
                value={name}
                onChange={setName}
                placeholder="Ej: Dr. Santiago Morales"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInput
                  icon={FileBadge}
                  label="Matrícula Profesional"
                  value={licenseNumber}
                  onChange={setLicenseNumber}
                  placeholder="Ej: MP 15482"
                  required
                  mono
                />
                <FormInput
                  icon={GraduationCap}
                  label="Universidad / Institución Otorgante"
                  value={university}
                  onChange={setUniversity}
                  placeholder="Ej: Universidad de Buenos Aires"
                  required
                />
              </div>

              <FormInput
                icon={Mail}
                label="Correo Electrónico Profesional"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="doctor@ejemplo.com"
                required
              />

              <PasswordInput
                label="Contraseña de Acceso"
                value={password}
                onChange={setPassword}
                placeholder="Crea una contraseña segura"
                showRequirements={true}
                required
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                  <UploadCloud className="text-primary" size={20} />
                  <span>Carga de Documentación Profesional</span>
                </h3>
                <p className="text-xs text-muted">
                  Formato aceptado: PDF, JPG o PNG. Tamaño máximo de archivo 50MB. Los documentos se
                  guardan con cifrado de grado militar.
                </p>
              </div>

              {fileError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              <div className="space-y-3">
                <FileUploadSlot
                  label="1. DNI (Frente y Dorso)"
                  icon={CreditCard}
                  iconColor="text-primary"
                  file={dniFile}
                  onSelect={(file) => handleFileSlotSelect(file, setDniFile)}
                  onRemove={() => setDniFile(null)}
                  required
                />

                <FileUploadSlot
                  label="2. Título Universitario"
                  icon={GraduationCap}
                  iconColor="text-emerald-400"
                  file={titleFile}
                  onSelect={(file) => handleFileSlotSelect(file, setTitleFile)}
                  onRemove={() => setTitleFile(null)}
                  required
                />

                <FileUploadSlot
                  label="3. Constancia de Matrícula Profesional"
                  icon={FileBadge}
                  iconColor="text-amber-400"
                  file={licenseFile}
                  onSelect={(file) => handleFileSlotSelect(file, setLicenseFile)}
                  onRemove={() => setLicenseFile(null)}
                  required
                />

                <FileUploadSlot
                  label="4. Póliza de Seguro Profesional / Mala Praxis"
                  icon={ShieldCheck}
                  iconColor="text-purple-400"
                  file={insuranceFile}
                  onSelect={(file) => handleFileSlotSelect(file, setInsuranceFile)}
                  onRemove={() => setInsuranceFile(null)}
                  required
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="space-y-4">
                <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                  <MapPin size={20} className="text-emerald-400" />
                  <span>Domicilio Base y Ubicación del Pin 📍</span>
                </h3>
                <p className="text-xs text-muted">
                  El sistema cruzará estos datos con tu geolocalización de dispositivo.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                      Dirección Base Exacta
                    </label>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <FormInput
                          icon={Building}
                          label=""
                          value={addressInput}
                          onChange={setAddressInput}
                          placeholder="Ej: Segurola 1149, Sourdeaux"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleGeocodeAddress}
                        disabled={isSearchingAddress}
                        className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50 shadow-lg"
                      >
                        <Search size={16} />
                        <span>{isSearchingAddress ? 'Buscando...' : 'Buscar'}</span>
                      </button>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleGetRealGPSLocation}
                    className="text-xs text-primary hover:text-primary-light font-bold flex items-center gap-1 bg-primary/10 px-2.5 py-1.5 rounded-lg border border-primary/20 transition-colors"
                  >
                    <Compass size={14} /> Usar mi GPS
                  </button>
                </div>

                {searchStatus && (
                  <div className="p-2.5 bg-background border border-primary/40 rounded-xl text-xs text-primary flex items-center gap-2">
                    <Navigation size={14} className="animate-spin text-primary shrink-0" />
                    <span>{searchStatus}</span>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <InteractiveMap
                    initialLat={coords.lat}
                    initialLng={coords.lng}
                    initialAddress={addressInput}
                    showSearch={true}
                    height="340px"
                    onLocationSelect={(lat, lng, address) => {
                      setCoords({ lat, lng });
                      if (address) {
                        setAddressInput(address);
                      }
                      setSearchStatus(`✅ Domicilio fijado en: ${address}`);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2 bg-background/60 border border-border p-4 rounded-2xl">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-foreground">
                    Radio de Cobertura Domiciliaria:
                  </span>
                  <span className="text-primary font-extrabold">{radius} km</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted/30 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <FormInput
                icon={DollarSign}
                label="CBU / Alias para Honorarios"
                value={cbu}
                onChange={setCbu}
                placeholder="Ej: vet.atencion.avo o CBU 0170..."
                required
                mono
              />
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center text-center space-y-6 py-6 animate-in fade-in duration-300">
              <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 rounded-3xl flex items-center justify-center shadow-lg">
                <CheckCircle size={44} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">¡Solicitud Registrada!</h2>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  Al enviar la solicitud, tu cuenta pasará a validación por el equipo de AVO. Te
                  notificaremos por email tan pronto se active tu usuario.
                </p>
              </div>

              <div className="w-full pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => router.push('/vet/dashboard')}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-lg text-sm transition-all"
                >
                  Ir a mi Dashboard
                </button>
              </div>
            </div>
          )}

          {submitError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle size={18} className="shrink-0 text-red-500" />
              <span>{submitError}</span>
            </div>
          )}

          {step < 4 && (
            <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-3 bg-surface hover:bg-primary/10 text-foreground border border-border rounded-xl text-xs font-bold transition-colors"
                >
                  Atrás
                </button>
              )}

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  (step === 2 && (!dniFile || !titleFile || !licenseFile || !insuranceFile))
                }
                className="flex-1 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-sky-500/20 text-sm transition-all disabled:opacity-50"
              >
                {isSubmitting
                  ? 'Enviando solicitud...'
                  : step === 3
                  ? 'Finalizar y Enviar Solicitud'
                  : 'Continuar'}
              </button>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
