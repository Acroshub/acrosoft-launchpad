import { useState } from "react";
import { FileText, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase, type CrmContact } from "@/lib/supabase";
import {
  ONBOARDING_DOC_PATH, buildOnboardingDocHtml, findOnboardingSource, hasActiveSaasAccess, onboardingValues, personName,
} from "@/lib/onboardingDoc";
import { useSaasAccess } from "@/hooks/useCrmData";

const TABLE = "crm_onboarding_docs";

const findToken = async (contactId: string): Promise<string | null> => {
  const { data, error } = await supabase.from(TABLE).select("token").eq("contact_id", contactId).maybeSingle();
  if (error) throw error;
  return data?.token ?? null;
};

/** Link del documento del contacto. La copia se crea la primera vez; después siempre se reutiliza (con las ediciones que ya tenga). */
const ensureDocUrl = async (source: CrmContact, apptContact: CrmContact): Promise<string> => {
  let token = await findToken(source.id);
  if (!token) {
    const values = onboardingValues(source)!;
    const name = personName(String(values["ob-name"] ?? ""), apptContact, source);
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ user_id: source.user_id, contact_id: source.id, content_html: buildOnboardingDocHtml(values, name) })
      .select("token")
      .single();
    // 23505: otro clic (u otra persona) lo creó un instante antes.
    if (error && error.code !== "23505") throw error;
    token = data?.token ?? (await findToken(source.id));
  }
  if (!token) throw new Error("No se pudo crear el documento");
  return `${window.location.origin}${ONBOARDING_DOC_PATH}/${token}`;
};

/** Botón de la ficha del contacto y de la cita: solo aparece con Acceso SaaS vigente y el formulario «Onboarding Acros» llenado. */
const OnboardingDocButton = ({ contact, contacts }: { contact: CrmContact; contacts: CrmContact[] }) => {
  const [busy, setBusy] = useState<"open" | "copy" | null>(null);
  const { data: saasAccess } = useSaasAccess(contact.id);
  const source = findOnboardingSource(contact, contacts);
  if (!source || !hasActiveSaasAccess(saasAccess)) return null;

  const open = async () => {
    // La pestaña se abre dentro del clic; si se abriera después de esperar al servidor, el navegador la bloquearía.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    setBusy("open");
    try {
      const url = await ensureDocUrl(source, contact);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch {
      tab?.close();
      toast.error("No se pudo abrir el documento de onboarding");
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    setBusy("copy");
    try {
      const url = await ensureDocUrl(source, contact);
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link público copiado");
      } catch {
        window.prompt("Copia el link público", url);
      }
    } catch {
      toast.error("No se pudo generar el link");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <button
          onClick={open}
          disabled={!!busy}
          className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy === "open" ? <Loader2 size={13} className="shrink-0 animate-spin" /> : <FileText size={13} className="shrink-0" />}
          Onboarding para Google Ads
        </button>
        <button
          onClick={copy}
          disabled={!!busy}
          title="Copiar link público"
          aria-label="Copiar link público"
          className="flex w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
        >
          {busy === "copy" ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={14} />}
        </button>
      </div>
      {source.id !== contact.id && (
        <p className="text-[10px] text-muted-foreground">Datos de la ficha «{source.name}» (mismo teléfono).</p>
      )}
    </div>
  );
};

export default OnboardingDocButton;
