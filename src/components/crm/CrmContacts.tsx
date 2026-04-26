import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Search, Users, Mail, Phone, Calendar, X, Eye,
  ArrowLeft, FolderOpen, Star, FileText, MessageSquare,
  TrendingUp, Briefcase, Target, ImagePlus, Plus,
  Download, Archive, Pencil, Image as ImageIcon, Link as LinkIconLucide, Loader2,
  Trash2, ChevronDown, ExternalLink, Bell,
} from "lucide-react";
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact, useForms, usePipelines, useContactNotes, useCreateContactNote, useClientAccounts, useCreateSaasClient, useDisableSaasClient, useEnableSaasClient, useAllContactStages, useSales, useServices } from "@/hooks/useCrmData";
import type { CrmContact, CrmForm } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import CreateReminderModal from "@/components/shared/CreateReminderModal";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import { useStaffPermissions } from "@/hooks/useAuth";

// ─── Inline editable field ────────────────────────────────────────────────────
const InlineEdit = ({
  icon: Icon,
  value,
  placeholder,
  type = "text",
  onSave,
  readOnly = false,
}: {
  icon: React.ElementType;
  value: string | null;
  placeholder: string;
  type?: string;
  onSave: (val: string) => Promise<void>;
  readOnly?: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setVal(value ?? ""); }, [value]);

  const commit = async () => {
    const trimmed = val.trim();
    if (trimmed === (value ?? "")) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch {
      toast.error("Error al guardar");
      setVal(value ?? "");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Icon size={13} className="shrink-0 text-muted-foreground" />
        <Input
          autoFocus
          type={type}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setVal(value ?? ""); setEditing(false); }
          }}
          disabled={saving}
          placeholder={placeholder}
          className="h-7 text-xs flex-1"
        />
        {saving && <Loader2 size={13} className="animate-spin text-muted-foreground shrink-0" />}
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className={`flex items-center gap-2.5 text-xs w-full rounded-lg px-0 py-0.5 ${value ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
        <Icon size={13} className="shrink-0" />
        <span className="truncate flex-1">{value || placeholder}</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`flex items-center gap-2.5 text-xs w-full group rounded-lg px-0 py-0.5 hover:text-foreground transition-colors text-left ${value ? "text-muted-foreground" : "text-muted-foreground/40"}`}
      title={`Editar ${placeholder.toLowerCase()}`}
    >
      <Icon size={13} className="shrink-0" />
      <span className="truncate flex-1">{value || placeholder}</span>
      <Pencil size={10} className="shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
};

// ─── Contact Notes Thread ─────────────────────────────────────────────────────
const ContactNotesThread = ({ contactId }: { contactId: string }) => {
  const { data: notes = [], isLoading } = useContactNotes(contactId);
  const createNote = useCreateContactNote();
  const [body, setBody] = useState("");

  const handleSubmit = async () => {
    const text = body.trim();
    if (!text) return;
    try {
      await createNote.mutateAsync({ contactId, body: text });
      setBody("");
    } catch {
      // silently fail — user can retry
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Historial de notas</p>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/50 italic">Sin notas aún.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="bg-secondary/30 rounded-xl px-3 py-2 space-y-1">
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{note.body}</p>
              <p className="text-[9px] text-muted-foreground/50 tabular-nums">
                {new Date(note.created_at).toLocaleString("es-ES", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
          rows={2}
          placeholder="Escribe una nota… (Cmd+Enter para guardar)"
          className="text-xs resize-none"
        />
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleSubmit}
          disabled={!body.trim() || createNote.isPending}
        >
          {createNote.isPending && <Loader2 size={12} className="animate-spin mr-1" />}
          Guardar nota
        </Button>
      </div>
    </div>
  );
};

// ─── Forms data panel (shown in contact detail for all users) ─────────────────
const SIMPLE_TYPES = ["text", "email", "phone", "number", "url", "textarea", "select", "address"];

const FormDataPanel = ({
  contact,
  forms,
  onSave,
  canEdit = true,
}: {
  contact: CrmContact;
  forms: CrmForm[];
  onSave: (customFields: Record<string, Record<string, string>>) => Promise<void>;
  canEdit?: boolean;
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const getAll = (): Record<string, Record<string, string>> =>
    ((contact.custom_fields as any) ?? {});

  const getFormValues = (formId: string): Record<string, string> =>
    getAll()[formId] ?? {};

  const editableFields = (form: CrmForm) =>
    (form.fields as any[]).filter((f) => SIMPLE_TYPES.includes(f.type));

  const startEdit = (form: CrmForm) => {
    const current = getFormValues(form.id);
    const initial: Record<string, string> = {};
    editableFields(form).forEach((f) => { initial[f.id] = current[f.id] ?? ""; });
    setEditValues(initial);
    setEditingFormId(form.id);
    setExpandedId(form.id);
  };

  const saveEdit = async (formId: string) => {
    setSaving(true);
    try {
      await onSave({ ...getAll(), [formId]: editValues });
      setEditingFormId(null);
    } finally {
      setSaving(false);
    }
  };

  if (forms.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-2">
        Formularios
      </p>
      <div className="space-y-1">
        {forms.map((form) => {
          const isExpanded = expandedId === form.id;
          const isEditing = editingFormId === form.id;
          const values = getFormValues(form.id);
          const fields = editableFields(form);

          return (
            <div key={form.id} className="border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : form.id)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/30 transition-colors text-left"
              >
                <span className="text-xs font-medium">{form.name}</span>
                <ChevronDown
                  size={13}
                  className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 pt-2 border-t space-y-2.5 bg-secondary/10">
                  {fields.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50 italic">Sin campos configurados</p>
                  ) : isEditing ? (
                    <>
                      {fields.map((f) => (
                        <div key={f.id}>
                          <label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium block mb-0.5">
                            {f.label}
                          </label>
                          {f.type === "textarea" ? (
                            <textarea
                              value={editValues[f.id] ?? ""}
                              onChange={(e) => setEditValues((p) => ({ ...p, [f.id]: e.target.value }))}
                              placeholder={f.placeholder ?? ""}
                              className="flex w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none min-h-[60px]"
                            />
                          ) : (
                            <Input
                              value={editValues[f.id] ?? ""}
                              onChange={(e) => setEditValues((p) => ({ ...p, [f.id]: e.target.value }))}
                              placeholder={f.placeholder ?? ""}
                              className="h-7 text-xs"
                            />
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() => saveEdit(form.id)}
                          disabled={saving}
                          className="h-7 text-xs flex-1"
                        >
                          {saving && <Loader2 size={11} className="animate-spin mr-1" />}
                          Guardar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingFormId(null)}
                          className="h-7 text-xs"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {fields.map((f) => (
                        <div key={f.id}>
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium block">
                            {f.label}
                          </span>
                          <span className="text-xs">{values[f.id] || "—"}</span>
                        </div>
                      ))}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(form)}
                          className="h-7 text-xs w-full mt-1 gap-1.5"
                        >
                          <Pencil size={11} /> Editar
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Ficha técnica (solo admin) ───────────────────────────────────────────────
const ONBOARDING_FORM_ID = "b733e0c5-60d4-414d-896a-5ce459b07eaf";

const ClientDetail = ({
  contact,
  onBack,
  stages = [],
}: {
  contact: CrmContact;
  onBack: () => void;
  stages?: { pipelineName: string; stage: string }[];
}) => {
  const [downloading, setDownloading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const qc = useQueryClient();
  const cf = (contact.custom_fields as Record<string, any>) ?? {};

  // Form data is stored nested: custom_fields[form_id][field_id]
  const ob = (cf[ONBOARDING_FORM_ID] as Record<string, any>) ?? {};

  const val = (fieldId: string) => {
    const v = ob[fieldId];
    if (v === undefined || v === null || v === "") return "—";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v).trim() || "—";
  };

  const handleDownloadDoc = async () => {
    if (!contact.master_doc_url) {
      toast.error("El documento maestro aún no ha sido generado");
      return;
    }
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from("master-docs")
        .createSignedUrl(contact.master_doc_url, 60);
      if (error || !data?.signedUrl) throw error ?? new Error("No URL");
      const downloadUrl = `${data.signedUrl}&download=true`;
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `documento-maestro-${contact.name.toLowerCase().replace(/\s+/g, "-")}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      toast.error("Error al descargar el documento");
    } finally {
      setDownloading(false);
    }
  };

  const handleGenerateDoc = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("generate-master-doc", {
        body: {
          contact_id: contact.id,
          form_id: ONBOARDING_FORM_ID,
          data: ob,
          user_id: contact.user_id,
        },
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["crm_contacts"] });
      toast.success("Documento maestro generado correctamente");
    } catch (e) {
      toast.error("Error al generar el documento maestro");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-lg hover:bg-secondary gap-2">
          <ArrowLeft size={15} /> Volver
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold">{contact.name}</h1>
            {stages.length > 0
              ? stages.map((s, i) => (
                  <Badge key={i} variant="outline" className="bg-primary/8 text-primary border-primary/20 text-[10px]" title={s.pipelineName}>
                    {s.stage}
                  </Badge>
                ))
              : contact.stage && (
                  <Badge variant="outline" className="bg-primary/8 text-primary border-primary/20 text-[10px]">
                    {contact.stage}
                  </Badge>
                )
            }
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
            <Calendar size={11} /> Recibido el{" "}
            {new Date(contact.created_at).toLocaleDateString("es-ES", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </p>
        </div>
      </div>

      {(
        <div className="grid md:grid-cols-3 gap-4 animate-in fade-in duration-300">
          {[
            {
              title: "Información del Negocio",
              icon: FolderOpen,
              fields: [
                ["Negocio", val("ob-1-1")],
                ["Rubro", val("ob-1-2")],
                ["Ciudad", val("ob-1-3")],
                ["Años operando", val("ob-1-4")],
              ],
            },
            {
              title: "Datos de Contacto",
              icon: Phone,
              fields: [
                ["WhatsApp", val("ob-0-phone") !== "—" ? val("ob-0-phone") : (contact.phone || "—")],
                ["Email", contact.email || "—"],
                ["Instagram", val("ob-7-5")],
                ["Facebook", val("ob-7-6")],
              ],
            },
            {
              title: "Identidad & Marca",
              icon: Star,
              fields: [
                ["Estilo visual", val("ob-3-6")],
                ["Color Primario", val("ob-3-2")],
                ["Color Secundario", val("ob-3-3")],
                ["Tipografía", val("ob-3-5")],
              ],
            },
          ].map((section) => (
            <div key={section.title} className="bg-background border rounded-2xl p-5 border-border/50 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <section.icon size={14} className="text-muted-foreground" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h3>
                </div>
              </div>
              <div className="space-y-3">
                {section.fields.map(([label, value]) => (
                  <div key={label}>
                    <span className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest mb-0.5 block">
                      {label}
                    </span>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="md:col-span-2 bg-background border rounded-2xl p-5 border-border/50 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={14} className="text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Descripción del Negocio
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground bg-secondary/30 p-5 rounded-xl border border-dashed border-border/60 min-h-[120px]">
              {val("ob-1-5") === "—" ? (
                <span className="italic opacity-50">Sin descripción registrada</span>
              ) : (
                val("ob-1-5")
              )}
            </p>
          </div>

          <div className="md:col-span-1 bg-secondary/20 border border-border/40 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-background border flex items-center justify-center shadow-sm">
              <Archive size={28} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Documento Maestro</h3>
              <Badge
                variant="outline"
                className={`mt-2 bg-background/50 border-primary/20 text-[10px] ${contact.master_doc_url ? "text-green-600 border-green-500/30" : "text-primary"}`}
              >
                {contact.master_doc_url ? "Listo para descargar" : "Pendiente de generar"}
              </Badge>
              <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
                Generado automáticamente con IA al completar el formulario de onboarding.
              </p>
            </div>
            {contact.master_doc_url ? (
              <Button
                variant="default"
                className="w-full h-10 rounded-xl font-bold text-[10px] uppercase tracking-wider"
                disabled={downloading}
                onClick={handleDownloadDoc}
              >
                {downloading ? (
                  <Loader2 size={13} className="mr-2 animate-spin" />
                ) : (
                  <Download size={13} className="mr-2" />
                )}
                DESCARGAR (.MD)
              </Button>
            ) : (
              <Button
                variant="default"
                className="w-full h-10 rounded-xl font-bold text-[10px] uppercase tracking-wider"
                disabled={generating}
                onClick={handleGenerateDoc}
              >
                {generating ? (
                  <Loader2 size={13} className="mr-2 animate-spin" />
                ) : (
                  <Archive size={13} className="mr-2" />
                )}
                GENERAR DOCUMENTO
              </Button>
            )}
          </div>

          <div className="md:col-span-2 bg-background border rounded-2xl p-5 border-border/50 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase size={14} className="text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Servicios & Oferta
              </h3>
            </div>
            {Array.isArray(ob["ob-4-1"]) && ob["ob-4-1"].length > 0 ? (
              <div className="space-y-2">
                {(ob["ob-4-1"] as any[]).map((s: any, i: number) => {
                  const sName  = s?.["ob-4-1-1"] || `Servicio ${i + 1}`;
                  const sDesc  = s?.["ob-4-1-2"] || "";
                  const sPrice = s?.["ob-4-1-3"] ? `$${s["ob-4-1-3"]}` : "";
                  const isStar = s?.["ob-4-1-4"];
                  return (
                    <div key={i} className="flex items-start gap-3 bg-secondary/20 border border-border/50 rounded-xl p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{sName}</span>
                          {isStar && <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-500/40 bg-yellow-50/50">⭐ Estrella</Badge>}
                          {sPrice && <span className="text-xs text-muted-foreground ml-auto">Desde {sPrice}</span>}
                        </div>
                        {sDesc && <p className="text-xs text-muted-foreground mt-0.5">{sDesc}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/50 italic">Sin servicios registrados</p>
            )}
          </div>

          <div className="md:col-span-1 bg-background border rounded-2xl p-5 border-border/50 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon size={14} className="text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logotipo</h3>
            </div>
            <div className="flex-1 bg-secondary/30 border border-dashed border-border/60 rounded-xl flex items-center justify-center p-6 min-h-[140px]">
              <div className="flex flex-col items-center text-muted-foreground/50">
                <ImageIcon size={32} className="mb-2 opacity-50" />
                <span className="text-[10px] uppercase tracking-widest font-medium">Sin logo</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-background border rounded-2xl p-5 border-border/50 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Target size={14} className="text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Público Objetivo</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                ["Cliente ideal", val("ob-5-1")],
                ["Problema que resuelven", val("ob-5-2")],
                ["Diferenciador", val("ob-5-3")],
              ].map(([l, v]) => (
                <div key={l} className="bg-secondary/20 border border-border/50 rounded-xl p-4">
                  <span className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest mb-1 block">
                    {l}
                  </span>
                  <p className="text-sm font-medium">{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-1 bg-background border rounded-2xl p-5 border-border/50 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <LinkIconLucide size={14} className="text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inspiración</h3>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest block">
                Sitios de Referencia
              </span>
              {[val("ob-3-7"), val("ob-3-8"), val("ob-3-9")].every((v) => v === "—") ? (
                <p className="text-xs text-muted-foreground/50 italic">Sin referencias</p>
              ) : (
                [val("ob-3-7"), val("ob-3-8"), val("ob-3-9")]
                  .filter((u) => u !== "—")
                  .map((url) => (
                    <div
                      key={url}
                      className="text-xs text-primary bg-primary/5 flex items-center gap-2 p-2 rounded-lg border border-primary/10 truncate"
                    >
                      <LinkIconLucide size={10} className="shrink-0" /> {url}
                    </div>
                  ))
              )}
            </div>
            <div className="mt-4 space-y-2">
              <span className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest block">
                Imágenes Subidas
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="aspect-square bg-secondary/40 rounded-lg flex items-center justify-center border border-border/50 text-muted-foreground/30"
                  >
                    <ImagePlus size={16} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Contacts list ────────────────────────────────────────────────────────────
const CrmContacts = ({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) => {
  const { can } = useStaffPermissions();
  const canCreate         = can("contactos", "create");
  const canEdit           = can("contactos", "edit");
  const canDelete         = can("contactos", "delete");
  const canCreateReminder = can("recordatorios", "create");

  const { data: contacts = [], isLoading } = useContacts();
  const { data: forms = [] } = useForms();
  const { data: pipelines = [] } = usePipelines();
  const { data: clientAccounts = [] } = useClientAccounts();
  const { data: contactStagesMap = {} } = useAllContactStages();
  const { data: sales = [] } = useSales();
  const { data: services = [] } = useServices();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const createSaasClient = useCreateSaasClient();
  const disableClient    = useDisableSaasClient();
  const enableClient     = useEnableSaasClient();

  const [accessingCrm, setAccessingCrm]       = useState<string | null>(null);
  const [reminderContact, setReminderContact] = useState<typeof contacts[0] | null>(null);

  // Map contact_id → client account for O(1) lookup
  const accountByContact = Object.fromEntries(
    clientAccounts.map((a) => [a.contact_id, a])
  );

  const handleAccessCrm = async (contactId: string) => {
    setAccessingCrm(contactId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-magic-link", {
        body: { contact_id: contactId },
      });
      if (error) throw error;
      if (data?.magic_link) {
        window.open(data.magic_link, "_blank");
      }
    } catch (err) {
      toast.error("No se pudo generar el acceso. Verifica que el cliente haya activado su cuenta.");
    } finally {
      setAccessingCrm(null);
    }
  };

  // First contacts pipeline — new contacts auto-enter its first column
  const contactsPipeline = pipelines.find((p) => p.type === "contacts") ?? null;
  const defaultStage = contactsPipeline?.column_names[0] ?? null;

  const [search, setSearch]         = useState("");
  const [onlyClients, setOnlyClients] = useState(false);
  const [serviceFilter, setServiceFilter] = useState("");
  const [selected, setSelected]     = useState<string | null>(null);
  const [viewing, setViewing]       = useState<string | null>(null);
  const [tagInputId, setTagInputId] = useState<string | null>(null);
  const [tagValue, setTagValue]     = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // New contact dialog
  const [showNew, setShowNew]       = useState(false);
  const [newName, setNewName]       = useState("");
  const [newEmail, setNewEmail]     = useState("");

  const clientContactIds = useMemo(
    () => new Set(sales.map((s) => s.contact_id).filter(Boolean) as string[]),
    [sales]
  );
  const contactIdsByService = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const s of sales) {
      if (!s.service_id || !s.contact_id) continue;
      if (!map.has(s.service_id)) map.set(s.service_id, new Set());
      map.get(s.service_id)!.add(s.contact_id);
    }
    return map;
  }, [sales]);
  const contactServices = useMemo(() => {
    const svcMap = new Map(services.map((s) => [s.id, s]));
    const map = new Map<string, { serviceName: string; isSaas: boolean }[]>();
    for (const sale of sales) {
      if (!sale.contact_id || !sale.service_id) continue;
      const svc = svcMap.get(sale.service_id);
      const entry = { serviceName: sale.service_name ?? svc?.name ?? "Servicio", isSaas: svc?.is_saas ?? false };
      if (!map.has(sale.contact_id)) map.set(sale.contact_id, []);
      const list = map.get(sale.contact_id)!;
      if (!list.some((e) => e.serviceName === entry.serviceName)) list.push(entry);
    }
    return map;
  }, [sales, services]);

  // Superadmin: show full ficha técnica
  const viewingContact = contacts.find((c) => c.id === viewing);
  if (viewing && viewingContact && isSuperAdmin) {
    return <ClientDetail contact={viewingContact} stages={contactStagesMap[viewingContact.id] ?? []} onBack={() => setViewing(null)} />;
  }

  const q = search.toLowerCase();
  const filtered = contacts.filter((c) => {
    if (onlyClients && !clientContactIds.has(c.id)) return false;
    if (serviceFilter && !contactIdsByService.get(serviceFilter)?.has(c.id)) return false;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q) ||
      (c.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  });

  const detail = contacts.find((c) => c.id === selected);

  const addTag = async (id: string) => {
    if (!tagValue.trim()) return;
    const contact = contacts.find((c) => c.id === id);
    if (!contact) return;
    const newTags = [...(contact.tags ?? []), tagValue.trim()];
    await updateContact.mutateAsync({ id, tags: newTags });
    setTagValue("");
    setTagInputId(null);
  };

  const removeTag = async (id: string, tag: string) => {
    const contact = contacts.find((c) => c.id === id);
    if (!contact) return;
    const newTags = (contact.tags ?? []).filter((t) => t !== tag);
    await updateContact.mutateAsync({ id, tags: newTags });
  };

  const handleCreateContact = async () => {
    if (!newName.trim() || !newEmail.trim()) return;
    try {
      await createContact.mutateAsync({
        name: newName.trim(),
        email: newEmail.trim(),
        phone: null,
        company: null,
        stage: defaultStage,
        tags: [],
      });
      toast.success(defaultStage ? `Contacto creado y añadido a "${defaultStage}"` : "Contacto creado exitosamente");
      setShowNew(false);
      setNewName("");
      setNewEmail("");
    } catch {
      toast.error("Error al crear el contacto");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteContact.mutateAsync({ id: deleteTarget.id, name: deleteTarget.name });
      if (selected === deleteTarget.id) setSelected(null);
      toast.success("Contacto eliminado");
    } catch {
      toast.error("Error al eliminar contacto");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSaveFormData = async (
    contactId: string,
    customFields: Record<string, Record<string, string>>
  ) => {
    await updateContact.mutateAsync({ id: contactId, custom_fields: customFields });
    toast.success("Datos guardados");
  };

  return (
    <>
    <DeleteConfirmDialog
      open={!!deleteTarget}
      onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      onConfirm={handleConfirmDelete}
      isPending={deleteContact.isPending}
      description="Se eliminará el contacto y todos sus datos permanentemente."
    />

    <CreateReminderModal
      open={!!reminderContact}
      onOpenChange={(v) => { if (!v) setReminderContact(null); }}
      contactId={reminderContact?.id}
      contactEmail={reminderContact?.email}
      contactPhone={reminderContact?.phone}
      contactName={reminderContact?.name}
    />

    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Contactos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Todos los contactos registrados en el CRM</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowNew(true)} className="rounded-xl gap-2 h-9 text-xs font-medium">
            <Plus size={14} /> Nuevo contacto
          </Button>
        )}
      </div>

      {/* New contact dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Nuevo Contacto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre *</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre completo"
                className="h-9"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email *</label>
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@ejemplo.com"
                className="h-9"
                type="email"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim() && newEmail.trim()) handleCreateContact();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowNew(false); setNewName(""); setNewEmail(""); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateContact}
              disabled={!newName.trim() || !newEmail.trim() || createContact.isPending}
              className="rounded-xl"
            >
              {createContact.isPending && <Loader2 size={14} className="animate-spin mr-2" />}
              Guardar contacto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Lista */}
          <div className="bg-card border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, email, teléfono o etiqueta..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 text-sm bg-secondary/30 border-transparent"
                  />
                </div>
                <span className="text-xs text-muted-foreground shrink-0 font-medium">
                  {filtered.length} contactos
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setOnlyClients(!onlyClients)}
                  className={`h-7 px-3 rounded-lg text-[11px] font-semibold border transition-all ${
                    onlyClients
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/50 text-muted-foreground border-transparent hover:border-border"
                  }`}
                >
                  Solo clientes
                </button>
                <div className="relative">
                  <select
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                    className="h-7 rounded-lg border bg-secondary/50 border-transparent text-[11px] font-semibold text-muted-foreground pl-2.5 pr-7 appearance-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Todos los servicios</option>
                    {services.filter((s) => s.active).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
                {(onlyClients || serviceFilter) && (
                  <button
                    onClick={() => { setOnlyClients(false); setServiceFilter(""); }}
                    className="h-7 px-2.5 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all flex items-center gap-1"
                  >
                    <X size={11} /> Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Users size={28} className="text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {search || onlyClients || serviceFilter
                    ? "No se encontraron contactos con estos filtros."
                    : "No hay contactos registrados aún."}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((c) => {
                  const account = accountByContact[c.id];
                  const isSaasActive = account?.status === "active";
                  const isSaasPending = account?.status === "pending";

                  return (
                  <div key={c.id} className="space-y-0">
                    <div
                      className={`px-5 py-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors ${
                        selected === c.id ? "bg-primary/5" : ""
                      }`}
                    >
                      <button
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        onClick={() => setSelected(c.id === selected ? null : c.id)}
                      >
                        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xs font-semibold shrink-0">
                          {c.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            {(contactStagesMap[c.id]?.length ?? 0) > 0
                              ? contactStagesMap[c.id].map((s, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] px-2 py-0 shrink-0 border-primary/20 bg-primary/5 text-primary" title={s.pipelineName}>
                                    {s.stage}
                                  </Badge>
                                ))
                              : c.stage && (
                                  <Badge variant="outline" className="text-[10px] px-2 py-0 shrink-0 border-primary/20 bg-primary/5 text-primary">
                                    {c.stage}
                                  </Badge>
                                )
                            }
                            {(contactServices.get(c.id) ?? []).map((svc, i) => (
                              <Badge key={`svc-${i}`} variant="outline" className="text-[10px] px-2 py-0 shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40">
                                {svc.serviceName}
                              </Badge>
                            ))}
                            {(isSaasActive || isSaasPending) && (
                              <Badge className={`text-[10px] px-2 py-0 shrink-0 font-semibold ${
                                isSaasActive
                                  ? "bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100"
                                  : "bg-yellow-50 text-yellow-600 border border-yellow-200 hover:bg-yellow-50"
                              }`}>
                                Booking System
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{c.email ?? "Sin email"}</p>
                        </div>
                      </button>

                      {/* Acceder a CRM (only for active SaaS clients) */}
                      {isSaasActive && (
                        <button
                          onClick={() => handleAccessCrm(c.id)}
                          disabled={accessingCrm === c.id}
                          className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors shrink-0 disabled:opacity-60"
                          title="Acceder al CRM del cliente"
                        >
                          {accessingCrm === c.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <ExternalLink size={12} />
                          }
                          CRM
                        </button>
                      )}

                      {/* Delete button */}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive shrink-0"
                          title="Eliminar contacto"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel de detalle */}
          <div className="bg-card border rounded-2xl flex flex-col max-h-[80vh]">
            {detail ? (
              <>
                {/* Fixed header */}
                <div className="p-5 border-b shrink-0 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-sm font-semibold shrink-0">
                        {detail.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{detail.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Desde{" "}
                          {new Date(detail.created_at).toLocaleDateString("es-ES", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {isSuperAdmin && (
                    <Button
                      className="w-full h-9 rounded-xl text-xs font-medium gap-2"
                      onClick={() => setViewing(detail.id)}
                    >
                      <Eye size={14} />
                      Ver Ficha Técnica
                    </Button>
                  )}

                  {/* SaaS account actions in detail panel */}
                  {(() => {
                    const acc = accountByContact[detail.id];
                    const hasSaasService = (contactServices.get(detail.id) ?? []).some((s) => s.isSaas);

                    // No account yet — show activation button only if contact bought a SaaS service
                    if (!acc) {
                      if (!detail.email || !hasSaasService) return null;
                      return (
                        <button
                          onClick={async () => {
                            try {
                              await createSaasClient.mutateAsync(detail.id);
                              toast.success("Invitación enviada. El cliente recibirá un email para activar su cuenta.");
                            } catch (err) {
                              const msg = err instanceof Error ? err.message : "Error desconocido";
                              toast.error(`Error al activar: ${msg}`);
                            }
                          }}
                          disabled={createSaasClient.isPending}
                          className="w-full h-9 rounded-xl text-xs font-semibold border-2 border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
                        >
                          {createSaasClient.isPending
                            ? <Loader2 size={12} className="animate-spin" />
                            : <span>🔐</span>
                          }
                          Activar Booking System
                        </button>
                      );
                    }

                    return (
                      <div className="border rounded-xl p-3 space-y-2 bg-amber-50/50 border-amber-200">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-widest text-amber-700/70 font-semibold">Cuenta SaaS</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            acc.status === "active"   ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            acc.status === "pending"  ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                        "bg-secondary text-muted-foreground border-border"
                          }`}>
                            {acc.status === "active" ? "Activa" : acc.status === "pending" ? "Pendiente de activación" : "Deshabilitada"}
                          </span>
                        </div>
                        {acc.status === "active" && (
                          <button
                            onClick={async () => {
                              try {
                                await disableClient.mutateAsync(acc.id);
                                toast.success("Cuenta SaaS deshabilitada");
                              } catch { toast.error("Error al deshabilitar"); }
                            }}
                            disabled={disableClient.isPending}
                            className="w-full h-8 rounded-lg text-xs font-medium border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors flex items-center justify-center gap-1.5"
                          >
                            {disableClient.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                            Deshabilitar cuenta
                          </button>
                        )}
                        {acc.status === "pending" && (
                          <p className="text-[11px] text-muted-foreground">
                            Esperando que el cliente active su cuenta vía email.
                          </p>
                        )}
                        {acc.status === "disabled" && (
                          <button
                            onClick={async () => {
                              try {
                                await enableClient.mutateAsync(acc.id);
                                toast.success("Cuenta SaaS reactivada");
                              } catch { toast.error("Error al reactivar"); }
                            }}
                            disabled={enableClient.isPending}
                            className="w-full h-8 rounded-lg text-xs font-medium border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1.5"
                          >
                            {enableClient.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                            Reactivar cuenta
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Scrollable body */}
                <div className="p-5 overflow-y-auto flex-1 space-y-5">

                {((contactStagesMap[detail.id]?.length ?? 0) > 0 || detail.stage) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium shrink-0">Etapa</span>
                    {(contactStagesMap[detail.id]?.length ?? 0) > 0
                      ? contactStagesMap[detail.id].map((s, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] px-2 py-0.5 border-primary/20 bg-primary/5 text-primary" title={s.pipelineName}>
                            {s.stage}
                          </Badge>
                        ))
                      : (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/20 bg-primary/5 text-primary">
                            {detail.stage}
                          </Badge>
                        )
                    }
                  </div>
                )}

                <div className="space-y-2">
                  <InlineEdit
                    icon={Mail}
                    value={detail.email}
                    placeholder="Añadir email"
                    type="email"
                    readOnly={!canEdit}
                    onSave={(v) => updateContact.mutateAsync({ id: detail.id, email: v || null }).then(() => {})}
                  />
                  <InlineEdit
                    icon={Phone}
                    value={detail.phone}
                    placeholder="Añadir teléfono"
                    type="tel"
                    readOnly={!canEdit}
                    onSave={(v) => updateContact.mutateAsync({ id: detail.id, phone: v || null }).then(() => {})}
                  />
                </div>

                {/* Tags */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-2">Etiquetas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(detail.tags ?? []).map((tag) => (
                      <span key={tag} className="flex items-center gap-1 text-[10px] border rounded-full px-2 py-0.5 bg-secondary/50">
                        {tag}
                        {canEdit && (
                          <button onClick={() => removeTag(detail.id, tag)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <X size={9} />
                          </button>
                        )}
                      </span>
                    ))}
                    {canEdit && (
                      <button
                        onClick={() => { setTagInputId(detail.id); setTagValue(""); }}
                        className="flex items-center gap-1 text-[10px] border border-dashed rounded-full px-2 py-0.5 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                      >
                        <Plus size={9} /> Añadir
                      </button>
                    )}
                  </div>
                  {tagInputId === detail.id && (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        autoFocus
                        value={tagValue}
                        onChange={(e) => setTagValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addTag(detail.id);
                          if (e.key === "Escape") setTagInputId(null);
                        }}
                        onBlur={() => setTimeout(() => setTagInputId(null), 150)}
                        placeholder="Nueva etiqueta..."
                        className="h-7 text-xs flex-1"
                      />
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addTag(detail.id)}
                        className="p-1 rounded-md bg-primary text-primary-foreground"
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setTagInputId(null)}
                        className="p-1 rounded-md hover:bg-secondary text-muted-foreground"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Recordatorio rápido */}
                {canCreateReminder && (
                  <div>
                    <button
                      onClick={() => setReminderContact(detail)}
                      className="w-full flex items-center justify-center gap-2 h-8 rounded-xl border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                    >
                      <Bell size={12} /> Crear recordatorio
                    </button>
                  </div>
                )}

                {/* Formularios */}
                <FormDataPanel
                  contact={detail}
                  forms={forms}
                  canEdit={canEdit}
                  onSave={(cf) => handleSaveFormData(detail.id, cf)}
                />

                {/* Historial de notas */}
                <ContactNotesThread contactId={detail.id} />
              </div>
              </>
            ) : (
              <div className="p-5 py-10 text-center">
                <Users size={22} className="text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Selecciona un contacto para ver los detalles</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default CrmContacts;
