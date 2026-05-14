import { useEffect, useState } from "react";
import { Bot, MessageSquare, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import CrmAgenteIAConfig from "./CrmAgenteIAConfig";
import CrmAgenteIAChats from "./CrmAgenteIAChats";

type Tab = "config" | "chats";
type WaState = "loading" | "disconnected" | "connecting" | "qr_pending" | "connected";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "config", label: "Configurar IA",    icon: Bot },
  { id: "chats",  label: "Conversaciones",   icon: MessageSquare },
];

const CrmAgenteIA = () => {
  const [tab, setTab] = useState<Tab>("config");
  const [waState, setWaState] = useState<WaState>("loading");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setWaState("disconnected"); return; }
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-session`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
              "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ action: "status" }),
          },
        );
        const data = await res.json();
        setWaState((data.status as WaState) ?? "disconnected");
      } catch {
        setWaState("disconnected");
      }
    })();
  }, []);

  if (waState === "loading") {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (waState !== "connected") {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-card border rounded-2xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mx-auto">
            <AlertCircle size={28} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold">Conecta WhatsApp primero</h1>
            <p className="text-sm text-muted-foreground">
              El Agente IA usa tu cuenta de WhatsApp para recibir y responder mensajes. Necesitas conectarla antes de configurarlo.
            </p>
          </div>
          <a
            href="#settings"
            onClick={(e) => {
              e.preventDefault();
              const trigger = document.querySelector<HTMLButtonElement>('button[data-view-trigger="settings"]');
              if (trigger) trigger.click();
              else window.location.reload();
            }}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Ir a Configuración → WhatsApp
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot size={16} className="text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Agente IA</h1>
            <p className="text-xs text-muted-foreground">
              Responde automáticamente los mensajes de WhatsApp con Claude Haiku y datos de tu CRM.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <nav className="lg:w-48 shrink-0 w-full">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap lg:w-full text-left shrink-0 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="flex-1 min-w-0 w-full">
          {tab === "config" && <CrmAgenteIAConfig />}
          {tab === "chats"  && <CrmAgenteIAChats />}
        </div>
      </div>
    </div>
  );
};

export default CrmAgenteIA;
