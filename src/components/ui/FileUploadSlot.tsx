'use client';

import React, { useState, useRef } from 'react';
import { LucideIcon, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export interface FileUploadSlotProps {
  label: string;
  icon: LucideIcon;
  iconColor?: string;
  accept?: string;
  maxSizeMB?: number;
  file: { name: string; sizeFormatted: string } | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
  required?: boolean;
}

export function FileUploadSlot({
  label,
  icon: Icon,
  iconColor = 'text-emerald-400',
  accept = '.pdf,.jpg,.jpeg,.png,.webp',
  maxSizeMB = 50,
  file,
  onSelect,
  onRemove,
  required = false,
}: FileUploadSlotProps) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    const sizeInMB = selected.size / (1024 * 1024);
    if (sizeInMB > maxSizeMB) {
      setError(`El archivo supera el tamaño máximo permitido de ${maxSizeMB}MB.`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    onSelect(selected);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label}
          {required && <span className="text-emerald-400 ml-1">*</span>}
        </label>
        <span className="text-[11px] text-slate-500">Máx {maxSizeMB}MB</span>
      </div>

      {!file ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="group relative cursor-pointer border-2 border-dashed border-slate-700 hover:border-emerald-500/70 bg-slate-800/40 hover:bg-slate-800/80 rounded-2xl p-5 transition-all flex flex-col items-center justify-center text-center"
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-slate-700/60">
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <p className="text-sm font-medium text-slate-300 group-hover:text-white">
            Haz clic para seleccionar archivo
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Formatos compatibles: PDF, JPG, PNG, WEBP
          </p>
        </div>
      ) : (
        <div className="border border-emerald-500/30 bg-emerald-950/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3.5 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/40">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{file.name}</p>
              <p className="text-xs text-emerald-400 font-mono">{file.sizeFormatted}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors shrink-0"
            title="Eliminar archivo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-2 text-red-400 text-xs bg-red-950/30 border border-red-500/20 rounded-xl p-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
