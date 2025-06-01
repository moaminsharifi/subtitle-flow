
"use client";

import type React from 'react';

interface PageHeaderProps {
  appTitle: string;
  stepTitle: string;
}

export function PageHeader({ appTitle, stepTitle }: PageHeaderProps) {
  return (
    <header className="mb-6">
      <h1 className="text-4xl font-bold text-primary tracking-tight">{appTitle}</h1>
      <p className="text-muted-foreground">{stepTitle}</p>
    </header>
  );
}
