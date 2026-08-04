'use client';

import React from 'react';

export interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export function StepIndicator({
  currentStep,
  totalSteps,
  labels,
}: StepIndicatorProps) {
  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
        <span className="text-emerald-400">
          Paso {currentStep} de {totalSteps}:{' '}
          <span className="text-white ml-1">
            {labels[currentStep - 1] || ''}
          </span>
        </span>
        <span className="text-slate-400">
          {Math.round((currentStep / totalSteps) * 100)}% Completado
        </span>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}>
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const stepNumber = idx + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                isCompleted
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30'
                  : isCurrent
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-slate-800'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
