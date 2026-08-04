'use client';

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, Circle, ShieldCheck } from 'lucide-react';

export interface PasswordInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  showRequirements?: boolean;
  error?: string;
  className?: string;
}

export function PasswordInput({
  label = 'Contraseña',
  value,
  onChange,
  placeholder = 'Crea una contraseña segura',
  required = false,
  showRequirements = false,
  error,
  className = '',
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const rules = [
    {
      label: 'Mínimo 8 caracteres',
      valid: value.length >= 8,
    },
    {
      label: '1 letra mayúscula',
      valid: /[A-Z]/.test(value),
    },
    {
      label: '1 número',
      valid: /[0-9]/.test(value),
    },
    {
      label: '1 carácter especial (!@#$... )',
      valid: /[!@#$%^&*(),.?":{}|<>_+=~`'/\\[\];\-]/.test(value),
    },
  ];

  const allValid = rules.every((r) => r.valid);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label}
          {required && <span className="text-emerald-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Lock className="w-5 h-5" />
        </div>
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-12 py-2.5 bg-slate-800/80 border ${
            error
              ? 'border-red-500/80 focus:border-red-400 focus:ring-red-500/20'
              : 'border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'
          } rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
          title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}

      {showRequirements && (
        <div className="mt-2 p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-300">
            <span>Requisitos de contraseña:</span>
            {allValid ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" /> Contraseña Segura
              </span>
            ) : (
              <span className="text-slate-500">Obligatorio</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {rules.map((rule, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  rule.valid ? 'text-emerald-400 font-medium' : 'text-slate-400'
                }`}
              >
                {rule.valid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                )}
                <span>{rule.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
