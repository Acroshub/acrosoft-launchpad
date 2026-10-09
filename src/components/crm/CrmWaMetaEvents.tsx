import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Eventos que una etiqueta puede enviar a Meta (Conversions API para mensajería empresarial).
export const META_LABEL_EVENTS: { value: string; label: string }[] = [
  { value: "Purchase", label: "Compra" },
  { value: "LeadSubmitted", label: "Lead (mostró interés)" },
  { value: "QualifiedLead", label: "Lead calificado" },
  { value: "InitiateCheckout", label: "Inició el pago" },
  { value: "AddToCart", label: "Agregó al carrito" },
  { value: "ViewContent", label: "Vio un producto" },
  { value: "OrderCreated", label: "Pedido creado" },
  { value: "OrderShipped", label: "Pedido enviado" },
  { value: "OrderDelivered", label: "Pedido entregado" },
  { value: "OrderCanceled", label: "Pedido cancelado" },
  { value: "OrderReturned", label: "Pedido devuelto" },
  { value: "CartAbandoned", label: "Carrito abandonado" },
  { value: "RatingProvided", label: "Calificación enviada" },
  { value: "ReviewProvided", label: "Reseña enviada" },
];

export function metaEventLabel(value: string | null | undefined) {
  return META_LABEL_EVENTS.find(e => e.value === value)?.label ?? value ?? "";
}

/** Selector del evento de Meta que dispara una etiqueta. */
export function MetaEventSelect({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Evento para Meta (opcional)</label>
      <select
        value={value ?? ""}
        onChange={e => onChange(e.target.value || null)}
        className="w-full h-8 px-2 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none"
      >
        <option value="">Ninguno</option>
        {META_LABEL_EVENTS.map(e => <option key={e.value} value={e.value}>{e.label} ({e.value})</option>)}
      </select>
      <p className="text-[10px] text-muted-foreground/60 leading-snug">
        Al asignar esta etiqueta a un chat que llegó desde un anuncio, se envía ese evento a Meta para optimizar tus campañas.
      </p>
    </div>
  );
}

interface MetaEventRow {
  id: string;
  event_name: string;
  status: "pending" | "sent" | "failed" | "skipped";
  error: string | null;
  created_at: string;
  conversation: { contact_name: string | null; phone: string } | null;
  label: { name: string } | null;
}

const STATUS_STYLE: Record<MetaEventRow["status"], { text: string; cls: string }> = {
  pending: { text: "En cola", cls: "text-amber-600 dark:text-amber-400" },
  sent: { text: "Enviado", cls: "text-emerald-600 dark:text-emerald-400" },
  failed: { text: "Falló", cls: "text-destructive" },
  skipped: { text: "Omitido", cls: "text-muted-foreground" },
};

/** Código de prueba de Meta + bitácora de los últimos envíos. */
export default function CrmWaMetaEvents() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const userId = user?.id;
  const [testCode, setTestCode] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: savedCode } = useQuery({
    queryKey: ["wa-meta-test-code", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("crm_ai_agent_config").select("meta_test_event_code").eq("user_id", userId!).maybeSingle();
      return (data?.meta_test_event_code ?? "") as string;
    },
  });
  useEffect(() => { if (savedCode !== undefined) setTestCode(savedCode); }, [savedCode]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["wa-meta-events", userId],
    enabled: !!userId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_wa_meta_events")
        .select("id, event_name, status, error, created_at, conversation:crm_wa_conversations(contact_name, phone), label:crm_wa_labels(name)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(15);
      return (data ?? []) as unknown as MetaEventRow[];
    },
  });

  const saveCode = async () => {
    setSaving(true);
    const { error } = await supabase.from("crm_ai_agent_config")
      .update({ meta_test_event_code: testCode.trim() || null }).eq("user_id", userId!);
    setSaving(false);
    if (error) { toast.error("No se pudo guardar"); return; }
    toast.success(testCode.trim() ? "Código de prueba guardado" : "Código de prueba quitado");
    qc.invalidateQueries({ queryKey: ["wa-meta-test-code", userId] });
  };

  return (
    <div className="space-y-3 pt-2 border-t border-border/60">
      <div>
        <p className="text-xs font-medium">Eventos enviados a Meta</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-snug">
          Solo se pueden enviar chats que llegaron desde un anuncio. Requiere el permiso whatsapp_business_manage_events en tu token.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Código de prueba (opcional)</label>
        <div className="flex gap-2">
          <Input value={testCode} onChange={e => setTestCode(e.target.value)} placeholder="TEST12345 (Events Manager › Probar eventos)" maxLength={40} />
          <Button size="sm" variant="outline" onClick={saveCode} disabled={saving || testCode.trim() === (savedCode ?? "")}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : "Guardar"}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/60 leading-snug">
          Con un código, los eventos aparecen en "Probar eventos" y no cuentan para optimizar. Quítalo cuando todo funcione.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-muted-foreground" /></div>
      ) : events.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/60 italic">Aún no se ha enviado ningún evento.</p>
      ) : (
        <ul className="space-y-1.5">
          {events.map(ev => (
            <li key={ev.id} className="text-[11px] rounded-lg border border-border/60 px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate flex-1">
                  {metaEventLabel(ev.event_name)} · {ev.conversation?.contact_name || ev.conversation?.phone || "Chat"}
                </span>
                <span className={`shrink-0 font-medium ${STATUS_STYLE[ev.status].cls}`}>{STATUS_STYLE[ev.status].text}</span>
              </div>
              <p className="text-[10px] text-muted-foreground/70">
                {ev.label?.name ? `Etiqueta «${ev.label.name}» · ` : ""}{new Date(ev.created_at).toLocaleString()}
              </p>
              {ev.error && ev.status !== "sent" && <p className="text-[10px] text-muted-foreground mt-0.5">{ev.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
