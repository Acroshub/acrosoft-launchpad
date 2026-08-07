import { useState, useEffect, useRef } from "react";
import {
  Building2, Image as ImageIcon,
  Check, Loader2, Trash2, Upload, Globe, MapPin, Phone,
  Instagram, Facebook, Clock,
  HelpCircle, Plus, X,
} from "lucide-react";
import { useBusinessProfile, useUpsertBusinessProfile } from "@/hooks/useCrmData";
import { useStaffPermissions } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { CrmBusinessProfile } from "@/lib/supabase";
import { validateUrl } from "@/lib/validators";
import { EditableField, PhoneEditableField, FieldLabel } from "@/components/shared/BusinessFormFields";

const LOGO_BUCKET = "form-uploads";

// ─── Timezone options ─────────────────────────────────────────────────────────
const TIMEZONE_OPTIONS = (Intl as any).supportedValuesOf?.("timeZone") as string[] | undefined ?? ["America/La_Paz"];

// ─── Negocio tab ──────────────────────────────────────────────────────────────
const NegocioTab = ({
  profile, update, readOnly = false,
}: {
  profile: CrmBusinessProfile | null;
  update: (data: Partial<CrmBusinessProfile>) => Promise<void>;
  readOnly?: boolean;
}) => {
  const [desc, setDesc]             = useState(profile?.description || "");
  const [savingDesc, setSavingDesc] = useState(false);
  const [faq, setFaq]               = useState<Array<{ q: string; a: string }>>(profile?.agent_faq ?? []);
  const [newQ, setNewQ]             = useState("");
  const [newA, setNewA]             = useState("");
  const [savingFaq, setSavingFaq]   = useState(false);
  const fileRef                     = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]   = useState(false);

  useEffect(() => { setDesc(profile?.description || ""); }, [profile?.description]);
  useEffect(() => { setFaq(profile?.agent_faq ?? []); }, [profile?.agent_faq]);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("El archivo supera el límite de 2 MB"); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Formato no soportado. Usa PNG, JPG o WEBP"); return;
    }
    setUploading(true);
    try {
      const ext  = file.name.split(".").pop() ?? "png";
      const path = `logos/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
      await update({ logo_url: urlData.publicUrl });
      toast.success("Logo actualizado");
    } catch {
      toast.error("Error al subir el logo. Intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    await update({ logo_url: null });
    toast.success("Logo eliminado");
  };

  const handleAddFaq = async () => {
    if (!newQ.trim() || !newA.trim()) return;
    const updated = [...faq, { q: newQ.trim(), a: newA.trim() }];
    setSavingFaq(true);
    try {
      await update({ agent_faq: updated });
      setFaq(updated);
      setNewQ("");
      setNewA("");
      toast.success("Pregunta agregada");
    } catch {
      toast.error("Error al guardar pregunta");
    } finally {
      setSavingFaq(false);
    }
  };

  const handleDeleteFaq = async (index: number) => {
    const updated = faq.filter((_, i) => i !== index);
    setSavingFaq(true);
    try {
      await update({ agent_faq: updated });
      setFaq(updated);
    } catch {
      toast.error("Error al eliminar pregunta");
    } finally {
      setSavingFaq(false);
    }
  };

  const handleSaveDesc = async () => {
    if (desc === profile?.description) return;
    setSavingDesc(true);
    try {
      await update({ description: desc });
      toast.success("Descripción guardada");
    } catch {
      toast.error("Error al guardar descripción");
    } finally {
      setSavingDesc(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* Información del Negocio */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 size={13} className="text-primary" />
          </div>
          <h2 className="text-sm font-semibold">Información del Negocio</h2>
        </div>
        <div className="px-5 py-5 space-y-6">

          {/* Datos básicos */}
          <div className="grid sm:grid-cols-2 gap-4">
            <EditableField label="Nombre del negocio" value={profile?.business_name || ""} icon={Building2} readOnly={readOnly} onSave={val => update({ business_name: val })} placeholder="Nombre de tu empresa" />
            <EditableField label="Rubro / Industria" value={profile?.industry || ""} readOnly={readOnly} onSave={val => update({ industry: val })} placeholder="Ej: Salud, Tecnología" />
            <EditableField label="Ciudad" value={profile?.city || ""} icon={MapPin} readOnly={readOnly} onSave={val => update({ city: val })} placeholder="Tu ciudad" />
            <EditableField label="País" value={profile?.country || ""} readOnly={readOnly} onSave={val => update({ country: val })} placeholder="Tu país" />
          </div>

          {/* Logo */}
          <div>
            <FieldLabel>Logo del negocio</FieldLabel>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
            <button
              type="button"
              onClick={() => !readOnly && fileRef.current?.click()}
              disabled={uploading || readOnly}
              className="w-full border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center py-8 gap-3 bg-secondary/10 hover:bg-secondary/30 hover:border-primary/40 transition-all disabled:opacity-60 disabled:cursor-default disabled:hover:bg-secondary/10 disabled:hover:border-border group"
            >
              {uploading ? (
                <Loader2 size={24} className="animate-spin text-muted-foreground" />
              ) : profile?.logo_url ? (
                <img src={profile.logo_url} alt="Logo" className="max-h-16 max-w-[200px] object-contain" />
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-secondary group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <ImageIcon size={20} className="text-muted-foreground/50 group-hover:text-primary/60 transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{readOnly ? "Sin logo" : "Sube tu logo"}</p>
                    {!readOnly && <p className="text-xs text-muted-foreground/60 mt-0.5">PNG, JPG o WEBP · máx. 2 MB</p>}
                  </div>
                </>
              )}
            </button>
            {!readOnly && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  <Upload size={13} />
                  {profile?.logo_url ? "Cambiar logo" : "Subir logo"}
                </button>
                {profile?.logo_url && (
                  <button
                    onClick={handleRemoveLogo}
                    disabled={uploading}
                    className="h-10 w-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 hover:border-destructive/30 transition-all disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Zona horaria */}
          <div>
            <FieldLabel>Zona horaria</FieldLabel>
            {readOnly ? (
              <div className="flex items-center gap-3 px-4 h-12 rounded-2xl bg-secondary/40 border border-border/50">
                <Clock size={14} className="text-muted-foreground/40 shrink-0" />
                <p className="text-sm font-medium">{profile?.timezone?.replace(/_/g, " ") ?? "America/La Paz"}</p>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={profile?.timezone ?? "America/La_Paz"}
                  onChange={(e) => update({ timezone: e.target.value })}
                  className="w-full h-12 px-4 rounded-2xl border border-border bg-background text-base md:text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">Los calendarios nuevos la heredan automáticamente</p>
          </div>

          {/* Descripción */}
          <div>
            <FieldLabel>Descripción del negocio</FieldLabel>
            <textarea
              value={desc}
              onChange={e => !readOnly && setDesc(e.target.value)}
              rows={5}
              readOnly={readOnly}
              className={`w-full rounded-2xl border border-border bg-background text-base md:text-sm px-4 py-3.5 resize-none outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${readOnly ? "opacity-70 cursor-default" : ""}`}
              placeholder="Describe brevemente tu negocio, qué ofreces y a quién..."
            />
            {!readOnly && desc !== profile?.description && (
              <button
                onClick={handleSaveDesc}
                disabled={savingDesc}
                className="h-11 px-5 rounded-2xl text-sm font-bold text-white flex items-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm mt-3"
                style={{ background: "linear-gradient(135deg, #1877F2, #0f5cc8)" }}
              >
                {savingDesc ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Guardar descripción
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Contacto y redes sociales */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Globe size={13} className="text-primary" />
          </div>
          <h2 className="text-sm font-semibold">Contacto y Redes</h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          <EditableField label="Sitio web" value={profile?.website || ""} icon={Globe} readOnly={readOnly} onSave={val => update({ website: val })} validate={validateUrl} placeholder="https://..." />
          <PhoneEditableField label="WhatsApp" value={profile?.whatsapp || ""} icon={Phone} readOnly={readOnly} onSave={val => update({ whatsapp: val })} />
          <EditableField label="Instagram" value={profile?.instagram || ""} icon={Instagram} readOnly={readOnly} onSave={val => update({ instagram: val })} placeholder="@usuario" />
          <EditableField label="Facebook" value={profile?.facebook || ""} icon={Facebook} readOnly={readOnly} onSave={val => update({ facebook: val })} placeholder="Página o @usuario" />
        </div>
      </div>

      {/* Preguntas Frecuentes */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <HelpCircle size={13} className="text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Preguntas Frecuentes</h2>
            <p className="text-xs text-muted-foreground mt-0.5">El Agente IA usará estas respuestas en las conversaciones de WhatsApp</p>
          </div>
        </div>
        <div className="px-5 py-5 space-y-4">
          {/* Listado existente */}
          {faq.length > 0 ? (
            <div className="space-y-2">
              {faq.map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs font-semibold text-foreground truncate">P: {item.q}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">R: {item.a}</p>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => handleDeleteFaq(i)}
                      disabled={savingFaq}
                      className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60 text-center py-4">
              Aún no hay preguntas frecuentes registradas.
            </p>
          )}

          {/* Formulario para agregar nueva FAQ */}
          {!readOnly && (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-4 space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Agregar pregunta</p>
              <input
                type="text"
                value={newQ}
                onChange={e => setNewQ(e.target.value)}
                placeholder="¿Cuál es la pregunta que hacen los clientes?"
                className="w-full h-10 rounded-xl border border-border bg-background text-base md:text-sm px-3 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <textarea
                value={newA}
                onChange={e => setNewA(e.target.value)}
                rows={3}
                placeholder="Escribe la respuesta que el agente debe dar..."
                className="w-full rounded-xl border border-border bg-background text-base md:text-sm px-3 py-2.5 resize-none outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <button
                onClick={handleAddFaq}
                disabled={savingFaq || !newQ.trim() || !newA.trim()}
                className="h-9 px-4 rounded-xl text-sm font-semibold text-white flex items-center gap-1.5 transition-all disabled:opacity-40 active:scale-[0.98] shadow-sm"
                style={{ background: "linear-gradient(135deg, #1877F2, #0f5cc8)" }}
              >
                {savingFaq ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Agregar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const CrmBusiness = () => {
  const { isStaff, can }              = useStaffPermissions();
  const { data: profile, isLoading }  = useBusinessProfile();
  const upsertProfile                 = useUpsertBusinessProfile();

  const canRead = !isStaff || can("mi_negocio_datos", "read");
  const readOnly = isStaff && !can("mi_negocio_datos", "edit");

  const handleUpdate = async (updates: Partial<CrmBusinessProfile>) => {
    await upsertProfile.mutateAsync(updates);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="flex items-center justify-center p-24 text-center">
        <p className="text-sm text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Mi Negocio</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isStaff ? "Datos del negocio" : "Gestiona la información y perfil de tu negocio"}
        </p>
      </div>

      <NegocioTab profile={profile} update={handleUpdate} readOnly={readOnly} />

    </div>
  );
};

export default CrmBusiness;
