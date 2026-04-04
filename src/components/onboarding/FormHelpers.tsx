import React from "react";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
}

export const SectionTitle = ({ title, subtitle }: SectionTitleProps) => (
  <div className="mb-6">
    <h2 className="text-xl font-bold text-foreground tracking-tight">{title}</h2>
    {subtitle && <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{subtitle}</p>}
  </div>
);

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

export const Field = ({ label, required, children }: FieldProps) => (
  <div className="space-y-2">
    <label className="text-sm font-semibold text-foreground flex items-center gap-1">
      {label}
      {required && <span className="text-destructive font-bold">*</span>}
    </label>
    {children}
  </div>
);
