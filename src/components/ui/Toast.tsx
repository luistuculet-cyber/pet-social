'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          border: 'border-emerald-500/30',
          bg: 'bg-surface',
          text: 'text-foreground',
          iconColor: 'text-emerald-500',
          icon: <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />,
        };
      case 'error':
        return {
          border: 'border-red-500/30',
          bg: 'bg-surface',
          text: 'text-foreground',
          iconColor: 'text-red-500',
          icon: <AlertCircle size={20} className="text-red-500 flex-shrink-0" />,
        };
      case 'warning':
        return {
          border: 'border-amber-500/30',
          bg: 'bg-surface',
          text: 'text-foreground',
          iconColor: 'text-amber-500',
          icon: <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />,
        };
      default:
        return {
          border: 'border-sky-500/30',
          bg: 'bg-surface',
          text: 'text-foreground',
          iconColor: 'text-sky-500',
          icon: <Info size={20} className="text-sky-500 flex-shrink-0" />,
        };
    }
  };

  const style = getStyles();

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${style.border} ${style.bg} ${style.text} shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-right-5 max-w-sm w-full backdrop-blur-md`}
      role="alert"
    >
      {style.icon}
      <p className="text-sm font-medium flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        type="button"
        className="text-muted hover:text-foreground transition-colors p-1"
        aria-label="Cerrar notificación"
      >
        <X size={16} />
      </button>
    </div>
  );
}
