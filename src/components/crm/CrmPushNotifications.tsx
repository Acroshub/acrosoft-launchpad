import { useState } from "react";
import { Bell, Send, Loader2, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import {
  useSendPushNotification, usePushNotificationLog, usePushSubscriptionsCount, useAdminPushTenantCounts,
} from "@/hooks/useCrmData";
import type { PushTargetType } from "@/lib/supabase";

const TARGET_LABELS: Record<PushTargetType, string> = {
  all: "Todos los usuarios",
  tenant: "Un negocio específico",
  user: "Un usuario individual",
};

// Solo estos dos son seleccionables desde el panel — 'user' sigue soportado por la
// Edge Function (para automatizaciones futuras por evento), pero no desde esta UI.
const SELECTABLE_TARGETS: PushTargetType[] = ["all", "tenant"];

const CrmPushNotifications = () => {
  const { data: subsCount } = usePushSubscriptionsCount();
  const { data: log = [], isLoading: logLoading } = usePushNotificationLog();
  const { data: tenants = [], isLoading: tenantsLoading } = useAdminPushTenantCounts();
  const send = useSendPushNotification();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [targetType, setTargetType] = useState<PushTargetType>("all");
  const [tenantId, setTenantId] = useState("");

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Título y mensaje son requeridos");
      return;
    }
    if (targetType === "tenant" && !tenantId) {
      toast.error("Seleccioná un negocio");
      return;
    }

    try {
      const result = await send.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || undefined,
        target_type: targetType,
        target_id: targetType === "tenant" ? tenantId : undefined,
      });
      toast.success(`Enviado a ${result.successCount} de ${result.recipients} dispositivo(s)`);
      setTitle("");
      setBody("");
      setUrl("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar la notificación");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Notificaciones Push</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Enviá notificaciones a los dispositivos suscritos</p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold shrink-0">
          <Bell size={13} />
          {subsCount ?? "…"} dispositivo{subsCount !== 1 ? "s" : ""} suscrito{subsCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Formulario de envío ── */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Nueva función disponible" maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">URL (opcional)</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/crm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Mensaje</label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Contenido de la notificación" rows={3} maxLength={300} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Destino</label>
            <Select value={targetType} onValueChange={(v) => { setTargetType(v as PushTargetType); setTenantId(""); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SELECTABLE_TARGETS.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="flex items-center gap-2">
                      {t === "all" ? <Users size={13} /> : <Building2 size={13} />} {TARGET_LABELS[t]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {targetType === "tenant" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Negocio</label>
              <Select value={tenantId} onValueChange={setTenantId} disabled={tenantsLoading || tenants.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={tenantsLoading ? "Cargando…" : tenants.length === 0 ? "Ningún negocio activó notificaciones todavía" : "Seleccionar negocio"} />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.client_user_id} value={t.client_user_id}>
                      {t.client_email} · {t.subscriber_count} dispositivo{t.subscriber_count !== 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* ── Desglose de destinatarios ── */}
        {targetType === "all" && (
          <div className="rounded-xl bg-secondary/60 p-3.5 space-y-2">
            <p className="text-xs font-semibold">
              {subsCount ?? "…"} dispositivo{subsCount !== 1 ? "s" : ""} {subsCount === 1 ? "recibirá" : "recibirán"} esta notificación
              {tenants.length > 0 && ` — ${tenants.length} negocio${tenants.length !== 1 ? "s" : ""}`}
            </p>
            {tenants.length > 0 && (
              <ul className="space-y-1">
                {tenants.map((t) => (
                  <li key={t.client_user_id} className="text-xs text-muted-foreground flex items-center justify-between gap-2">
                    <span className="truncate">{t.client_email}</span>
                    <span className="shrink-0">{t.subscriber_count} disp.</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {targetType === "tenant" && tenantId && (
          <div className="rounded-xl bg-secondary/60 p-3.5">
            <p className="text-xs font-semibold">
              {tenants.find((t) => t.client_user_id === tenantId)?.subscriber_count ?? 0} dispositivo(s) de este negocio recibirán la notificación
            </p>
          </div>
        )}

        <Button onClick={handleSend} disabled={send.isPending} className="gap-1.5">
          {send.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Enviar notificación
        </Button>
      </div>

      {/* ── Historial ── */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b">
          <p className="text-sm font-semibold">Historial de envíos</p>
        </div>
        {logLoading ? (
          <div className="p-5 text-sm text-muted-foreground">Cargando…</div>
        ) : log.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">Todavía no enviaste ninguna notificación</div>
        ) : (
          <div className="divide-y">
            {log.map((entry) => (
              <div key={entry.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{entry.title}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.body}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {TARGET_LABELS[entry.target_type]} · {new Date(entry.created_at).toLocaleString("es-ES")}
                  </p>
                </div>
                <div className="text-right shrink-0 text-xs">
                  <p className="font-semibold text-emerald-600">{entry.success_count} ok</p>
                  {entry.failure_count > 0 && <p className="text-red-500">{entry.failure_count} fallidas</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CrmPushNotifications;
