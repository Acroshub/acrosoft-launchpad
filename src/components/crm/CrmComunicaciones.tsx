import { useState, useEffect, useMemo } from "react";
import {
  Mail, CalendarDays, ClipboardList, Bot, DollarSign, Package, BookOpen,
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Check, X, Loader2, Lock, Construction,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import {
  useEmailTemplatesByCategory, useCreateEmailTemplate, useUpdateEmailTemplate, useDeleteEmailTemplate,
} from "@/hooks/useCrmData";
import type { CrmEmailTemplate } from "@/lib/supabase";

type EmailTypeDef = { key: string; name: string; recipient: string; subject: string; body: string };
type CommsCategory = {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  emails: EmailTypeDef[];
};

const CATEGORIES: CommsCategory[] = [
  {
    id: "calendario",
    label: "Calendario",
    icon: CalendarDays,
    description: "Recordatorios de citas",
    emails: [
      {
        key: "calendario_recordatorio_cita",
        name: "Recordatorio de cita (antes / después)",
        recipient: "Contacto o negocio",
        subject: "Recordatorio: tu cita con {{business.name}} es el {{appointment.date}}",
        body: "Hola {{contact.name}}, te recordamos tu cita el {{appointment.date}} a las {{appointment.time}} para {{appointment.service}}. ¡Te esperamos!",
      },
    ],
  },
  {
    id: "formulario",
    label: "Formulario",
    icon: ClipboardList,
    description: "Recordatorios de formularios",
    emails: [
      {
        key: "formulario_recordatorio_envio",
        name: "Recordatorio o confirmación de envío",
        recipient: "Contacto o negocio",
        subject: "Hemos recibido tu formulario",
        body: "Hola {{contact.name}}, gracias por completar el formulario. Nos pondremos en contacto contigo pronto.",
      },
    ],
  },
  {
    id: "whatsapp_ia",
    label: "WhatsApp IA",
    icon: Bot,
    description: "Notificaciones del agente",
    emails: [
      {
        key: "whatsapp_ia_transferencia_humano",
        name: "Transferencia a humano",
        recipient: "Negocio",
        subject: "🔔 Conversación transferida a un humano",
        body: "Un cliente en WhatsApp necesita atención humana. Revisa la conversación en tu CRM.",
      },
      {
        key: "whatsapp_ia_nuevo_lead",
        name: "Nuevo lead capturado",
        recipient: "Negocio",
        subject: "🎯 Nuevo lead: {{contact.name}}",
        body: "El agente de WhatsApp capturó un nuevo contacto: {{contact.name}} ({{contact.phone}}). Revísalo en tu CRM.",
      },
      {
        key: "whatsapp_ia_venta_detectada",
        name: "Venta detectada o confirmada",
        recipient: "Negocio",
        subject: "💰 Venta confirmada por el Agente IA",
        body: "Se registró una nueva venta detectada automáticamente por el agente de WhatsApp. Revisa los detalles en tu CRM.",
      },
      {
        key: "whatsapp_ia_sin_metodo_pago",
        name: "Cliente quiere comprar sin método de pago",
        recipient: "Negocio",
        subject: "💳 Cliente quiere comprar — falta método de pago",
        body: "Un cliente quiere completar una compra por WhatsApp pero no tienes un método de pago configurado. Configúralo para no perder la venta.",
      },
    ],
  },
  {
    id: "ventas",
    label: "Ventas",
    icon: DollarSign,
    description: "Renovaciones y acceso SaaS",
    emails: [
      {
        key: "ventas_recordatorio_renovacion",
        name: "Recordatorio de renovación",
        recipient: "Negocio y cliente final",
        subject: "Tu renovación con {{business.name}} vence pronto",
        body: "Hola {{contact.name}}, tu servicio vence el {{next_renewal_date}}. Realiza tu pago para mantener el acceso activo.",
      },
      {
        key: "ventas_invitacion_saas_manual",
        name: "Invitación de acceso SaaS (activación manual)",
        recipient: "Cliente final",
        subject: "Ya tienes acceso a tu CRM",
        body: "Hola {{contact.name}}, tu acceso al CRM de {{business.name}} ha sido activado. Haz clic en el enlace para crear tu contraseña y comenzar.",
      },
      {
        key: "ventas_invitacion_saas_nuevo_cliente",
        name: "Invitación de acceso SaaS (nuevo cliente)",
        recipient: "Cliente final",
        subject: "Bienvenido — activa tu cuenta",
        body: "Hola {{contact.name}}, te damos la bienvenida. Activa tu cuenta haciendo clic en el enlace de invitación.",
      },
      {
        key: "ventas_invitacion_saas_formulario",
        name: "Invitación SaaS automática al elegir plan en un formulario",
        recipient: "Cliente final",
        subject: "Tu acceso está listo",
        body: "Gracias por elegir tu plan. Te hemos enviado un enlace para activar tu acceso.",
      },
    ],
  },
  {
    id: "inventario",
    label: "Inventario",
    icon: Package,
    description: "Alertas de stock",
    emails: [
      {
        key: "inventario_stock_bajo",
        name: "Stock bajo o agotado",
        recipient: "Negocio",
        subject: "⚠️ Stock bajo: {{product.name}}",
        body: "El producto {{product.name}} tiene solo {{product.stock}} unidades disponibles. Considera reabastecer pronto.",
      },
    ],
  },
  {
    id: "cursos",
    label: "Cursos",
    icon: BookOpen,
    description: "Acceso a contenido",
    emails: [
      {
        key: "cursos_solicitud_acceso",
        name: "Solicitud de acceso a curso",
        recipient: "Cliente final",
        subject: "Accede al curso: {{course.title}}",
        body: "Hola, aquí tienes tu enlace de acceso al curso {{course.title}}. Válido por 15 minutos.",
      },
      {
        key: "cursos_invitacion_acceso",
        name: "Invitación de acceso a curso",
        recipient: "Cliente final",
        subject: "Tienes acceso al curso: {{course.title}}",
        body: "¡Felicidades! Ya tienes acceso al curso {{course.title}}. Haz clic para comenzar.",
      },
      {
        key: "cursos_cambio_url",
        name: "Aviso de cambio de URL de curso",
        recipient: "Cliente final",
        subject: "Nuevo enlace para ingresar al curso: {{course.title}}",
        body: "El enlace de acceso a tu curso {{course.title}} cambió. Usa este nuevo enlace para continuar.",
      },
    ],
  },
];

type Selection = { emailKey: string; templateId: string | null }; // null = Original

// ─── Detalle de categoría: panel dividido (lista + vista previa estilo email) ──
const CategoryDetail = ({ category, onBack }: { category: CommsCategory; onBack: () => void }) => {
  const { data: copies = [], isLoading } = useEmailTemplatesByCategory(category.id);
  const createTemplate = useCreateEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();
  const deleteTemplate = useDeleteEmailTemplate();

  const copiesByType = useMemo(() => {
    const map = new Map<string, CrmEmailTemplate[]>();
    for (const c of copies) {
      if (!map.has(c.email_type)) map.set(c.email_type, []);
      map.get(c.email_type)!.push(c);
    }
    return map;
  }, [copies]);

  const [selection, setSelection] = useState<Selection>({ emailKey: category.emails[0]?.key ?? "", templateId: null });
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [subjectVal, setSubjectVal] = useState("");
  const [bodyVal, setBodyVal] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const emailDef = category.emails.find((e) => e.key === selection.emailKey) ?? category.emails[0];
  const selectedCopy = selection.templateId ? copies.find((c) => c.id === selection.templateId) ?? null : null;
  const isOriginalSelected = !selection.templateId;

  useEffect(() => {
    setEditing(false);
  }, [selection.emailKey, selection.templateId]);

  const select = (emailKey: string, templateId: string | null) => {
    setSelection({ emailKey, templateId });
    setMobileShowDetail(true);
  };

  const startEdit = () => {
    if (!selectedCopy) return;
    setNameVal(selectedCopy.name);
    setSubjectVal(selectedCopy.subject);
    setBodyVal(selectedCopy.body);
    setEditing(true);
  };

  const commitEdit = async () => {
    if (!selectedCopy) return;
    try {
      await updateTemplate.mutateAsync({ id: selectedCopy.id, name: nameVal.trim() || "Copia", subject: subjectVal, body: bodyVal });
      setEditing(false);
      toast.success("Plantilla actualizada");
    } catch {
      toast.error("Error al guardar la plantilla");
    }
  };

  const handleCreateCopy = async (emailKey: string) => {
    const def = category.emails.find((e) => e.key === emailKey);
    if (!def) return;
    const existing = copiesByType.get(emailKey) ?? [];
    try {
      const created = await createTemplate.mutateAsync({
        category: category.id,
        emailType: emailKey,
        name: `Copia ${existing.length + 1}`,
        subject: def.subject,
        body: def.body,
      });
      select(emailKey, created.id);
      toast.success("Copia creada");
    } catch {
      toast.error("Error al crear la copia");
    }
  };

  const handleDelete = async () => {
    if (!selectedCopy) return;
    try {
      await deleteTemplate.mutateAsync({ id: selectedCopy.id, userId: selectedCopy.user_id, category: selectedCopy.category });
      select(selection.emailKey, null);
      toast.success("Copia eliminada");
    } catch {
      toast.error("Error al eliminar la copia");
    } finally {
      setDeleteOpen(false);
    }
  };

  const Icon = category.icon;

  return (
    <div className="space-y-5">
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isPending={deleteTemplate.isPending}
        description="Se eliminará esta copia de plantilla permanentemente."
      />

      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-primary -ml-1 px-1 py-1 rounded-xl hover:bg-secondary/60 transition-colors"
      >
        <ChevronLeft size={16} />
        Comunicaciones
      </button>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
          <Icon size={19} className="text-primary/70" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">{category.label}</h1>
          <p className="text-xs text-muted-foreground">{category.description}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-5">
        {/* ── Lista de plantillas ── */}
        <div className={`bg-card border rounded-2xl overflow-hidden ${mobileShowDetail ? "hidden lg:block" : ""}`}>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
          ) : (
            category.emails.map((email, i) => {
              const emailCopies = copiesByType.get(email.key) ?? [];
              return (
                <div key={email.key} className={i < category.emails.length - 1 ? "border-b" : ""}>
                  <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {email.name}
                  </p>
                  <button
                    onClick={() => select(email.key, null)}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-left text-xs transition-colors ${
                      selection.emailKey === email.key && isOriginalSelected
                        ? "bg-primary/8 text-primary font-medium"
                        : "text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <Lock size={11} className="shrink-0 opacity-50" />
                    <span className="truncate">Original</span>
                  </button>
                  {emailCopies.map((copy) => (
                    <button
                      key={copy.id}
                      onClick={() => select(email.key, copy.id)}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-left text-xs transition-colors ${
                        selection.templateId === copy.id
                          ? "bg-primary/8 text-primary font-medium"
                          : "text-foreground hover:bg-secondary/40"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0 ml-[1.5px]" />
                      <span className="truncate">{copy.name}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => handleCreateCopy(email.key)}
                    disabled={createTemplate.isPending}
                    className="w-full flex items-center gap-2 px-4 py-2 mb-1 text-left text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    {createTemplate.isPending ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                    Crear copia
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* ── Vista previa / edición ── */}
        <div className={mobileShowDetail ? "" : "hidden lg:block"}>
          <button
            onClick={() => setMobileShowDetail(false)}
            className="lg:hidden flex items-center gap-1.5 text-sm font-medium text-primary mb-3"
          >
            <ChevronLeft size={16} /> Plantillas
          </button>

          {!emailDef ? null : (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {isOriginalSelected ? "Original" : selectedCopy?.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Para: {emailDef.recipient}</p>
                </div>
                {isOriginalSelected ? (
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => handleCreateCopy(emailDef.key)} disabled={createTemplate.isPending}>
                    {createTemplate.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Crear copia
                  </Button>
                ) : !editing ? (
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={startEdit}>
                      <Pencil size={12} /> Editar
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                      <Trash2 size={12} /> Eliminar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" className="h-8 text-xs gap-1.5" onClick={commitEdit} disabled={updateTemplate.isPending}>
                      {updateTemplate.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Guardar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5" onClick={() => setEditing(false)}>
                      <X size={12} /> Cancelar
                    </Button>
                  </div>
                )}
              </div>

              {editing ? (
                <div className="rounded-2xl border bg-card p-5 space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Nombre de la copia</label>
                    <Input value={nameVal} onChange={(e) => setNameVal(e.target.value)} className="h-9 text-base md:text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Asunto</label>
                    <Input value={subjectVal} onChange={(e) => setSubjectVal(e.target.value)} className="h-9 text-base md:text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Contenido</label>
                    <Textarea value={bodyVal} onChange={(e) => setBodyVal(e.target.value)} rows={8} className="text-base md:text-sm resize-none" />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border bg-card overflow-hidden">
                  <div className="px-6 py-4 border-b bg-secondary/20">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1">Asunto</p>
                    <p className="text-sm font-semibold text-foreground">{isOriginalSelected ? emailDef.subject : selectedCopy?.subject}</p>
                  </div>
                  <div className="px-6 py-5">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {isOriginalSelected ? emailDef.body : selectedCopy?.body}
                    </p>
                  </div>
                  {isOriginalSelected && (
                    <div className="px-6 pb-5">
                      <p className="text-[11px] text-muted-foreground/60 italic">
                        Esta es la plantilla del sistema — no se puede editar ni eliminar. Usa "Crear copia" para personalizarla.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Recordatorio para el admin — quitar cuando la sección esté terminada.
const DevBanner = () => (
  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
    <Construction size={16} className="text-amber-600 shrink-0" />
    <div>
      <p className="text-xs font-semibold text-amber-800">Sección en desarrollo</p>
      <p className="text-[11px] text-amber-700/80 mt-0.5">
        Solo tú (admin) la ves por ahora — falta la lógica real de envío (a quién y cuándo). Continuar después.
      </p>
    </div>
  </div>
);

const CrmComunicaciones = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const category = CATEGORIES.find((c) => c.id === selectedId);

  if (category) {
    return (
      <div className="space-y-5">
        <DevBanner />
        <CategoryDetail category={category} onBack={() => setSelectedId(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <DevBanner />

      <div>
        <h1 className="text-xl font-bold text-foreground">Comunicaciones</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Centraliza aquí los emails y WhatsApp que tu CRM envía al negocio y a tus clientes
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        {CATEGORIES.map(({ id, label, icon: Icon, description, emails }) => (
          <button
            key={id}
            onClick={() => setSelectedId(id)}
            className="bg-card border rounded-2xl p-5 text-left hover:border-primary/30 hover:bg-primary/5 transition-colors flex flex-col gap-3"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
                <Icon size={17} className="text-primary/70" />
              </div>
              <ChevronRight size={15} className="text-muted-foreground/40 mt-1" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground/70">
              {emails.length} tipo{emails.length !== 1 ? "s" : ""} de email
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-secondary/40 border border-secondary">
        <Mail size={14} className="text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          Por ahora puedes ver la plantilla original de cada email y crear copias personalizadas. Elegir a quién y cuándo se envía cada una llega en una próxima iteración.
        </p>
      </div>
    </div>
  );
};

export default CrmComunicaciones;
