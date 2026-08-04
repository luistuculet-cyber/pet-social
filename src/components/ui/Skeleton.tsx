'use client';

import React from 'react';

export interface SkeletonProps {
  variant?: 'text' | 'card' | 'input' | 'map';
  className?: string;
}

export function Skeleton({ variant = 'text', className = '' }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-muted/30 rounded-xl';

  const variantClasses = {
    text: 'h-4 w-3/4',
    card: 'h-32 w-full',
    input: 'h-11 w-full',
    map: 'h-64 w-full rounded-2xl',
  };

  return <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />;
}
