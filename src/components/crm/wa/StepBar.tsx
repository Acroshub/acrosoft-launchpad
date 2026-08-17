import { CheckCircle2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Barra de progreso de un wizard.
//
// El nombre va DEBAJO de cada número y siempre visible: así en cualquier momento
// se ve qué pasos están hechos y cuáles faltan. Antes iba al lado y se ocultaba
// en móvil, que es justo donde más falta hace.
// ─────────────────────────────────────────────────────────────────────────────

export function StepBar({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <div className="grid mb-5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((label, idx) => {
        const done   = idx < current;
        const active = idx === current;
        return (
          <div key={idx} className="flex flex-col items-center gap-1.5 min-w-0">
            <div className="relative w-full flex items-center justify-center h-6">
              {idx > 0 && (
                <div className={`absolute left-0 right-1/2 mr-3.5 h-px ${idx <= current ? "bg-primary" : "bg-border"}`} />
              )}
              {idx < steps.length - 1 && (
                <div className={`absolute left-1/2 right-0 ml-3.5 h-px ${done ? "bg-primary" : "bg-border"}`} />
              )}
              <div className={`relative w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors
                ${done   ? "bg-primary text-primary-foreground"
                : active ? "border-2 border-primary text-primary bg-background"
                :          "border border-muted-foreground/30 text-muted-foreground/40 bg-background"}`}>
                {done ? <CheckCircle2 size={13} /> : idx + 1}
              </div>
            </div>
            <span className={`text-[10px] leading-tight text-center px-0.5 transition-colors
              ${active ? "text-foreground font-semibold"
              : done   ? "text-primary font-medium"
              :          "text-muted-foreground/50"}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
