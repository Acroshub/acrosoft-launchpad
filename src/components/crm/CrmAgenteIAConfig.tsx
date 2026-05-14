import { useEffect, useState } from "react";
import { Sparkles, Loader2, Save, Eye, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { AiAgentConfig } from "@/lib/supabase";

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
  </div>
);

const CrmAgenteIAConfig = () => {
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const [enabled, setEnabled]                   = useState(true);
  const [businessName, setBusinessName]         = useState("");
  const [businessDescription, setBusinessDesc]  = useState("");
  const [tone, setTone]                         = useState("amable y profesional");
  const [escalationPhrase, setEscalationPhrase] = useState("un humano te responderá pronto");
  const [customInstructions, setCustom]         = useState("");
  const [systemPrompt, setSystemPrompt]         = useState("");
  const [configId, setConfigId]                 = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("ai_agent_config")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      const cfg = data as AiAgentConfig | null;
      if (cfg) {
        setConfigId(cfg.id);
        setEnabled(cfg.enabled);
        setBusinessName(cfg.business_name ?? "");
        setBusinessDesc(cfg.business_description ?? "");
        setTone(cfg.tone ?? "amable y profesional");
        setEscalationPhrase(cfg.escalation_phrase ?? "un humano te responderá pronto");
        setCustom(cfg.custom_instructions ?? "");
        setSystemPrompt(cfg.system_prompt ?? "");
      } else {
        // Pre-cargar business_name desde el perfil
        const { data: profile } = await supabase
          .from("crm_business_profile")
          .select("business_name, first_name, last_name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profile) {
          setBusinessName(
            profile.business_name ||
            [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
            "",
          );
        }
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const generatePrompt = async () => {
    setPolishing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent-config`,
        {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${token}`,
            "apikey":        import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            action: "generate_prompt",
            wizard: {
              business_name:        businessName,
              business_description: businessDescription,
              tone,
              language:             "español",
              escalation_phrase:    escalationPhrase,
              custom_instructions:  customInstructions,
            },
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? res.statusText);
      }
      const data = await res.json();
      setSystemPrompt(data.system_prompt ?? "");
      toast.success(data.polished ? "Prompt generado con IA" : "Prompt generado (base)");
    } catch (err: any) {
      toast.error(err.message ?? "No se pudo generar el prompt");
    } finally {
      setPolishing(false);
    }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        user_id:              user.id,
        enabled,
        business_name:        businessName.trim() || null,
        business_description: businessDescription.trim() || null,
        tone:                 tone.trim() || null,
        escalation_phrase:    escalationPhrase.trim() || null,
        custom_instructions:  customInstructions.trim() || null,
        system_prompt:        systemPrompt.trim() || null,
      };
      if (configId) {
        const { error } = await supabase
          .from("ai_agent_config")
          .update(payload)
          .eq("id", configId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("ai_agent_config")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        setConfigId(data.id);
      }
      toast.success("Configuración guardada");
    } catch (err: any) {
      toast.error(err.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">Estado del agente</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{enabled ? "Activo" : "Pausado"}</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Cuando está activo, el agente responde automáticamente los mensajes entrantes de WhatsApp.
          Puedes pausarlo en cualquier momento sin perder la configuración.
        </p>
      </div>

      <div className="bg-card border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Pencil size={15} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold">Datos del negocio</h2>
        </div>

        <Field label="Nombre del negocio *" hint="Cómo se identifica el agente al cliente">
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="h-10 text-sm"
            placeholder="Ej: Clínica Acrosoft"
          />
        </Field>

        <Field label="Descripción breve" hint="A qué se dedica el negocio, en pocas líneas">
          <Textarea
            value={businessDescription}
            onChange={(e) => setBusinessDesc(e.target.value)}
            className="text-sm min-h-[80px]"
            placeholder="Ej: Clínica dental especializada en odontología estética y ortodoncia invisible."
          />
        </Field>

        <Field label="Tono de respuesta">
          <Input
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="h-10 text-sm"
            placeholder="amable y profesional / casual / formal / cercano"
          />
        </Field>

        <Field label="Frase al escalar a humano" hint="Mensaje que el agente envía cuando deriva al cliente a una persona">
          <Input
            value={escalationPhrase}
            onChange={(e) => setEscalationPhrase(e.target.value)}
            className="h-10 text-sm"
            placeholder="Te paso con un humano enseguida"
          />
        </Field>

        <Field label="Instrucciones adicionales" hint="Reglas específicas: qué nunca decir, cómo presentar precios, etc.">
          <Textarea
            value={customInstructions}
            onChange={(e) => setCustom(e.target.value)}
            className="text-sm min-h-[100px]"
            placeholder="Ej: Nunca prometas resultados clínicos. Si preguntan por dirección, comparte exclusivamente la sucursal del centro."
          />
        </Field>
      </div>

      <div className="bg-card border rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Eye size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">Prompt del sistema</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={generatePrompt}
              disabled={polishing || !businessName.trim()}
              className="h-8 gap-1.5"
            >
              {polishing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {systemPrompt ? "Regenerar" : "Generar con IA"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPreview((s) => !s)}
              className="h-8 gap-1.5 text-xs"
            >
              {showPreview ? "Editar" : "Vista previa"}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Estas son las instrucciones exactas que recibe la IA. Puedes editarlas a mano si quieres más control.
          {!systemPrompt && " Completa los datos arriba y pulsa Generar con IA."}
        </p>

        {showPreview && systemPrompt ? (
          <div className="bg-secondary/40 rounded-xl p-4 text-xs whitespace-pre-wrap font-mono text-foreground/85 leading-relaxed">
            {systemPrompt}
          </div>
        ) : (
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="text-xs font-mono min-h-[280px] leading-relaxed"
            placeholder="El prompt aparecerá aquí al pulsar Generar con IA. También puedes escribirlo manualmente."
          />
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || !businessName.trim()} className="gap-1.5">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar configuración
        </Button>
      </div>
    </div>
  );
};

export default CrmAgenteIAConfig;
