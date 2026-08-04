'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="p-2.5 rounded-full bg-surface border border-border text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200 flex items-center justify-center clinical-shadow focus:outline-none"
      title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
      aria-label="Cambiar tema visual"
    >
      {theme === 'dark' ? (
        <Sun
          size={18}
          className="text-warning transition-transform duration-200 rotate-0 hover:rotate-45"
        />
      ) : (
        <Moon
          size={18}
          className="text-primary transition-transform duration-200 rotate-0 hover:-rotate-12"
        />
      )}
    </button>
  );
}
