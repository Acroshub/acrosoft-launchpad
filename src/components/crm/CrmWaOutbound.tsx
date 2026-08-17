import { useState } from "react";
import { Bot, Send, FileText, ChevronRight } from "lucide-react";
import { useWaTemplates } from "@/hooks/useCrmData";
import CrmWaAutomations from "@/components/crm/CrmWaAutomations";
import CrmWaCampaigns from "@/components/crm/CrmWaCampaigns";

// ─────────────────────────────────────────────────────────────────────────────
// Seguimiento y Envíos — todo lo que sale del negocio hacia el contacto.
//
// Dos modos, según quién dispara el envío:
//   · Automático → lo dispara la inactividad del contacto (1 a 1, continuo)
//   · Envíos     → lo disparas tú eligiendo audiencia (masivo, puntual)
//
// Las plantillas NO son un tab: las consumen los dos modos (el seguimiento
// fuera de 24h y la campaña fuera de 24h), así que viven al nivel de la
// sección y se abren como sub-página.
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "automatico" as const, icon: Bot,  label: "Seguimiento Automático", sub: "Después de X horas" },
  { id: "envios" as const,     icon: Send, label: "Envíos Masivos",         sub: "Retoma iniciando una conversación" },
];

export default function CrmWaOutbound({ onOpenTemplates }: { onOpenTemplates: () => void }) {
  const [tab, setTab] = useState<"automatico" | "envios">("automatico");

  const { data: templates = [] } = useWaTemplates("remarketing");
  const approved = templates.filter(t => t.local_status === "APPROVED").length;

  return (
    <div className="space-y-4">
      {/* Plantillas — recurso compartido por ambos modos */}
      <button
        type="button"
        onClick={onOpenTemplates}
        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-muted/30 transition-all text-left"
      >
        <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0">
          <FileText size={15} className="text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">Plantillas</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {templates.length === 0
              ? "Necesarias para escribir fuera de 24h"
              : `${templates.length} plantilla${templates.length !== 1 ? "s" : ""} · ${approved} aprobada${approved !== 1 ? "s" : ""}`}
          </p>
        </div>
        <ChevronRight size={14} className="shrink-0 text-muted-foreground/30" />
      </button>

      {/* Tabs */}
      <div className="grid grid-cols-2 bg-muted/50 rounded-2xl border border-border p-1 gap-1">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="text-[11px] font-semibold leading-tight text-center text-balance">{t.label}</span>
              <span className={`text-[9px] leading-tight text-center text-balance ${isActive ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                {t.sub}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "automatico" && <CrmWaAutomations />}

      {tab === "envios" && <CrmWaCampaigns />}
    </div>
  );
}
