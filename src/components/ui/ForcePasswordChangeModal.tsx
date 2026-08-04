'use client';

import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, KeyRound } from 'lucide-react';
import { PasswordInput } from './PasswordInput';

export interface ForcePasswordChangeModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export function ForcePasswordChangeModal({ isOpen, onSuccess }: ForcePasswordChangeModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 8) {
      setError('La nueva contraseña debe tener mínimo 8 caracteres.');
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[!@#$%^&*(),.?":{}|<>_+=~`'/\\[\];\-]/.test(newPassword)) {
      setError('La contraseña debe incluir 1 mayúscula, 1 número y 1 carácter especial.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar contraseña');
      }

      setSuccessMsg('¡Contraseña actualizada con éxito!');
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Hubo un error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Cambio de Contraseña Requerido</h3>
            <p className="text-xs text-slate-400">
              Por motivos de seguridad, el administrador ha solicitado que actualices tu clave para continuar.
            </p>
          </div>
        </div>

        {successMsg ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordInput
              label="Nueva Contraseña"
              value={newPassword}
              onChange={setNewPassword}
              showRequirements={true}
              required
            />

            <PasswordInput
              label="Confirmar Nueva Contraseña"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repite tu nueva contraseña"
              required
            />

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              {loading ? 'Actualizando contraseña...' : 'Actualizar y Continuar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
