import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CrmForm, CrmService } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Check, ChevronRight, ChevronLeft, CheckCircle2,
  Loader2, ArrowRight, ClipboardCheck,
} from "lucide-react";
import WeeklySchedulePicker, {
  WeeklySchedule,
  DEFAULT_WEEKLY_SCHEDULE,
} from "@/components/shared/WeeklySchedulePicker";

// ─── Local Types ──────────────────────────────────────────────────────────────

interface PublicSection {
  id: string;
  name: string;
  subtitle?: string;
  isConfirmation?: boolean;
}

interface PublicSubField {
  id: string;
  label: string;
  type: string;
}

interface PublicField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  multiSelect?: boolean;
  locked?: boolean;
  sectionId?: string;
  subFields?: PublicSubField[];
  maxItems?: number;
  allowedServiceIds?: string[];
}

// ─── Public Data Hooks (no auth required) ────────────────────────────────────

const usePublicForm = (formId: string) =>
  useQuery({
    queryKey: ["public_form", formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_forms")
        .select("*")
        .eq("id", formId)
        .single();
      if (error) throw error;
      return data as CrmForm;
    },
    enabled: !!formId,
  });

const usePublicServices = (userId?: string | null, allowedIds?: string[]) =>
  useQuery({
    queryKey: ["public_services", userId, allowedIds?.join(",")],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("crm_services")
        .select("*")
        .eq("user_id", userId)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const all = data as CrmService[];
      if (allowedIds?.length) return all.filter(s => allowedIds.includes(s.id));
      return all;
    },
    enabled: !!userId,
  });

// ─── Facebook Pixel helpers ───────────────────────────────────────────────────

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

const loadFbPixel = (pixelId: string) => {
  if (window.fbq) { window.fbq("init", pixelId); return; }
  // Inject the FB pixel base code programmatically
  const script = document.createElement("script");
  script.innerHTML = `
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init','${pixelId}');
  `;
  document.head.appendChild(script);
};

const fbTrack = (event: string) => {
  if (window.fbq) window.fbq("track", event);
};

// ─── Field Wrapper ────────────────────────────────────────────────────────────

const FieldWrapper = ({
  children,
  label,
  required,
  error,
}: {
  children: React.ReactNode;
  label: string;
  required: boolean;
  error?: string;
}) => (
  <div className="space-y-1.5">
    <label className="text-sm font-semibold text-foreground flex items-center gap-1">
      {label}
      {required && <span className="text-destructive font-bold ml-0.5">*</span>}
    </label>
    {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    {children}
  </div>
);

// ─── Services Field ───────────────────────────────────────────────────────────

const ServicesField = ({
  field,
  value,
  onChange,
  formUserId,
  error,
}: {
  field: PublicField;
  value: string | null;
  onChange: (v: string) => void;
  formUserId: string | null;
  error?: string;
}) => {
  const { data: services = [], isLoading } = usePublicServices(
    formUserId,
    field.allowedServiceIds
  );

  return (
    <FieldWrapper label={field.label} required={field.required} error={error}>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 size={16} className="animate-spin" /> Cargando planes...
        </div>
      ) : services.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No hay planes disponibles aún.</p>
      ) : (
        <div className="grid gap-4 mt-1">
          {services.map(svc => {
            const isSelected = value === svc.id;
            return (
              <button
                key={svc.id}
                type="button"
                onClick={() => onChange(svc.id)}
                className={`text-left border-2 rounded-2xl p-6 transition-all relative ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                    : svc.is_recommended
                    ? "border-amber-400/60 bg-card hover:border-primary/40"
                    : "border-border bg-card hover:border-border/80"
                }`}
              >
                {svc.is_recommended && (
                  <Badge className="absolute -top-3 left-6 px-3 py-0.5 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-sm">
                    Recomendado
                  </Badge>
                )}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                  <div className="shrink-0">
                    <h3 className="font-semibold text-base text-foreground">{svc.name}</h3>
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-2xl font-bold text-foreground">${svc.price}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-tight">setup</span>
                    </div>
                    {svc.recurring_price && (
                      <span className="text-sm text-muted-foreground">
                        ${svc.recurring_price}/{svc.recurring_interval}
                        {svc.recurring_label ? ` ${svc.recurring_label}` : ""}
                      </span>
                    )}
                    {svc.delivery_time && (
                      <p className="text-[11px] text-muted-foreground/60 mt-1">{svc.delivery_time}</p>
                    )}
                  </div>
                  {!!svc.benefits?.length && (
                    <ul className="grid gap-1.5 sm:max-w-xs">
                      {svc.benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check size={13} className="text-primary shrink-0 mt-0.5" /> {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {isSelected && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check size={13} className="text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </FieldWrapper>
  );
};

// ─── Repeatable Field ─────────────────────────────────────────────────────────

const RepeatableField = ({
  field,
  value,
  onChange,
  error,
}: {
  field: PublicField;
  value: Record<string, any>[];
  onChange: (v: Record<string, any>[]) => void;
  error?: string;
}) => {
  const items: Record<string, any>[] = Array.isArray(value) && value.length > 0 ? value : [{}];
  const maxItems = field.maxItems ?? 10;
  const subFields = field.subFields ?? [];

  const updateItem = (idx: number, key: string, val: any) =>
    onChange(items.map((item, i) => (i === idx ? { ...item, [key]: val } : item)));

  const addItem = () => {
    if (items.length < maxItems) onChange([...items, {}]);
  };

  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <FieldWrapper label={field.label} required={field.required} error={error}>
      <div className="space-y-3 mt-1">
        {items.map((item, idx) => (
          <div key={idx} className="bg-secondary/20 border border-border/50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                #{idx + 1}
              </span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-[11px] text-destructive hover:underline"
                >
                  Eliminar
                </button>
              )}
            </div>
            {subFields.map(sf => (
              <div key={sf.id} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{sf.label}</label>
                {sf.type === "textarea" ? (
                  <textarea
                    value={item[sf.id] ?? ""}
                    onChange={e => updateItem(idx, sf.id, e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-input bg-background text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                  />
                ) : sf.type === "checkbox" ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!item[sf.id]}
                      onChange={e => updateItem(idx, sf.id, e.target.checked)}
                      className="rounded border-input h-4 w-4 text-primary"
                    />
                    <span className="text-sm text-muted-foreground">Sí</span>
                  </label>
                ) : (
                  <Input
                    type={sf.type === "number" ? "number" : sf.type === "url" ? "url" : "text"}
                    value={item[sf.id] ?? ""}
                    onChange={e => updateItem(idx, sf.id, e.target.value)}
                    className="h-9 text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        ))}
        {items.length < maxItems && (
          <button
            type="button"
            onClick={addItem}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border/60 rounded-xl py-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            + Añadir otro
          </button>
        )}
      </div>
    </FieldWrapper>
  );
};

// ─── Main Field Renderer ──────────────────────────────────────────────────────

const FieldRenderer = ({
  field,
  value,
  onChange,
  formUserId,
  error,
}: {
  field: PublicField;
  value: any;
  onChange: (v: any) => void;
  formUserId: string | null;
  error?: string;
}) => {
  if (field.type === "heading") {
    return (
      <div className="pt-2 pb-1 border-b border-border/50">
        <h3 className="text-sm font-bold text-foreground">{field.label}</h3>
      </div>
    );
  }

  if (field.type === "services") {
    return (
      <ServicesField
        field={field}
        value={value ?? null}
        onChange={onChange}
        formUserId={formUserId}
        error={error}
      />
    );
  }

  if (field.type === "repeatable") {
    return (
      <RepeatableField
        field={field}
        value={value ?? [{}]}
        onChange={onChange}
        error={error}
      />
    );
  }

  if (field.type === "schedule") {
    return (
      <FieldWrapper label={field.label} required={field.required} error={error}>
        <div className="mt-1">
          <WeeklySchedulePicker
            value={value ?? DEFAULT_WEEKLY_SCHEDULE}
            onChange={onChange}
          />
        </div>
      </FieldWrapper>
    );
  }

  if (field.type === "color") {
    const color = value || "#2563EB";
    return (
      <FieldWrapper label={field.label} required={field.required} error={error}>
        <div className="flex items-center gap-3 mt-1">
          <input
            type="color"
            value={color}
            onChange={e => onChange(e.target.value)}
            className="w-12 h-10 rounded-lg border border-input cursor-pointer p-0.5"
          />
          <Input
            value={color}
            onChange={e => onChange(e.target.value)}
            className="h-10 text-sm w-36 font-mono"
            placeholder="#000000"
          />
        </div>
      </FieldWrapper>
    );
  }

  if (field.type === "select") {
    return (
      <FieldWrapper label={field.label} required={field.required} error={error}>
        <div className="relative mt-1">
          <select
            value={value ?? ""}
            onChange={e => onChange(e.target.value)}
            className="w-full h-11 rounded-xl border border-input bg-background text-sm px-3 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">{field.placeholder || "Selecciona una opción…"}</option>
            {(field.options ?? []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-xs">▾</div>
        </div>
      </FieldWrapper>
    );
  }

  if (field.type === "radio") {
    return (
      <FieldWrapper label={field.label} required={field.required} error={error}>
        <div className="grid sm:grid-cols-2 gap-3 mt-1">
          {(field.options ?? []).map(opt => {
            const isSelected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`text-left px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                  isSelected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/30"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </FieldWrapper>
    );
  }

  if (field.type === "checkbox") {
    return (
      <FieldWrapper label={field.label} required={field.required} error={error}>
        <label className="flex items-center gap-3 mt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => onChange(e.target.checked)}
            className="rounded border-input h-4 w-4 text-primary"
          />
          <span className="text-sm text-muted-foreground">{field.placeholder || "Sí"}</span>
        </label>
      </FieldWrapper>
    );
  }

  if (field.type === "file") {
    const fileNames: string[] = Array.isArray(value) ? value : value ? [value] : [];
    return (
      <FieldWrapper label={field.label} required={field.required} error={error}>
        <label className="mt-1 flex items-center gap-4 border-2 border-dashed border-border/60 rounded-xl p-5 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-lg">
            📎
          </div>
          <div className="flex-1 min-w-0">
            {fileNames.length > 0 ? (
              <div className="space-y-0.5">
                {fileNames.map((n, i) => (
                  <p key={i} className="text-sm font-medium truncate">{n}</p>
                ))}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fileNames.length} archivo{fileNames.length !== 1 ? "s" : ""} seleccionado{fileNames.length !== 1 ? "s" : ""} · Haz clic para añadir más
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium">Seleccionar archivos</p>
                <p className="text-xs text-muted-foreground mt-0.5">Puedes subir varios archivos a la vez</p>
              </>
            )}
          </div>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={e => {
              const files = Array.from(e.target.files ?? []).map(f => f.name);
              if (files.length) onChange([...fileNames, ...files]);
            }}
          />
        </label>
        {fileNames.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors mt-1"
          >
            Limpiar archivos
          </button>
        )}
      </FieldWrapper>
    );
  }

  if (field.type === "textarea") {
    return (
      <FieldWrapper label={field.label} required={field.required} error={error}>
        <textarea
          value={value ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className="w-full rounded-xl border border-input bg-background text-sm px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50 mt-1"
        />
      </FieldWrapper>
    );
  }

  // text, email, phone, url, number, address, date, time
  const inputType =
    field.type === "email" ? "email"
    : field.type === "number" ? "number"
    : field.type === "date" ? "date"
    : field.type === "time" ? "time"
    : field.type === "url" ? "url"
    : "text";

  return (
    <FieldWrapper label={field.label} required={field.required} error={error}>
      <Input
        type={inputType}
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="h-11 text-sm mt-1"
      />
    </FieldWrapper>
  );
};

// ─── Confirmation Summary ─────────────────────────────────────────────────────

const ConfirmationView = ({
  sections,
  fields,
  formValues,
}: {
  sections: PublicSection[];
  fields: PublicField[];
  formValues: Record<string, any>;
}) => {
  const formatValue = (field: PublicField, val: any): string => {
    if (val === undefined || val === null || val === "") return "—";
    if (field.type === "repeatable" && Array.isArray(val)) {
      return `${val.length} elemento${val.length !== 1 ? "s" : ""}`;
    }
    if (field.type === "checkbox") return val ? "Sí" : "No";
    if (field.type === "schedule") return "Horario configurado";
    if (field.type === "file") return typeof val === "string" ? val : "Archivo adjunto";
    if (field.type === "color") return val;
    return String(val);
  };

  return (
    <div className="space-y-4">
      {sections.map(sec => {
        const sectionFields = fields.filter(
          f => f.sectionId === sec.id && f.type !== "heading"
        );
        if (sectionFields.length === 0) return null;
        return (
          <div key={sec.id} className="bg-secondary/20 rounded-2xl border border-secondary/50 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-secondary/10">
              <ClipboardCheck size={14} className="text-primary" />
              <h3 className="text-sm font-bold">{sec.name}</h3>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {sectionFields.map(field => (
                <Badge
                  key={field.id}
                  variant="secondary"
                  className="bg-background border-border/50 text-xs font-medium px-3 py-1 text-muted-foreground"
                >
                  {field.label}: {formatValue(field, formValues[field.id])}
                </Badge>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main FormRenderer Component ──────────────────────────────────────────────

const FormRenderer = ({ formId }: { formId: string }) => {
  const { data: form, isLoading, error: loadError } = usePublicForm(formId);

  const sections = useMemo<PublicSection[]>(() => {
    if (!form?.sections) return [];
    return (form.sections as any[]).map(s => s as PublicSection);
  }, [form]);

  const fields = useMemo<PublicField[]>(() => {
    if (!form?.fields) return [];
    return (form.fields as any[]).map(f => f as PublicField);
  }, [form]);

  const activeSections = useMemo(() => sections.filter(s => !s.isConfirmation), [sections]);
  const confirmSection = useMemo(() => sections.find(s => s.isConfirmation), [sections]);

  const [currentStep, setCurrentStep] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Facebook Pixel: init + ViewContent on mount ──────────────────
  const pixelId = (form as any)?.facebook_pixel_id as string | undefined;
  useEffect(() => {
    if (!pixelId) return;
    loadFbPixel(pixelId);
    fbTrack("ViewContent");
  }, [pixelId]);

  const totalSteps = activeSections.length + (confirmSection ? 1 : 0);
  const isOnConfirm = !!confirmSection && currentStep === activeSections.length;
  const currentSection = isOnConfirm ? confirmSection! : activeSections[currentStep];
  const currentFields = isOnConfirm
    ? []
    : fields.filter(f => f.sectionId === currentSection?.id);
  const formUserId = (form as any)?.user_id ?? null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of currentFields) {
      if (!field.required || field.type === "heading") continue;
      const val = formValues[field.id];
      const isEmpty =
        val === undefined ||
        val === null ||
        val === "" ||
        (Array.isArray(val) && val.length === 0);
      if (isEmpty) newErrors[field.id] = `${field.label} es obligatorio`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const next = () => {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setCurrentStep(s => Math.min(s + 1, totalSteps - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prev = () => {
    setErrors({});
    setCurrentStep(s => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const dbUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${dbUrl}/functions/v1/crm-form-public`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ form_id: formId, data: formValues }),
      });
      if (!res.ok) throw new Error("Error en el servidor");
      const result = await res.json();
      setSubmissionId(result.submission_id ?? "");
      fbTrack("Lead");
      setSubmitted(true);
      if (form?.success_action === "redirect" && form.redirect_url) {
        window.location.href = form.redirect_url;
      }
    } catch (e) {
      console.error(e);
      alert("Hubo un problema enviando tu solicitud. Por favor intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Loading / Error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <p className="text-sm">No se pudo cargar el formulario.</p>
      </div>
    );
  }

  // ─── Success state ─────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="flex items-center justify-center py-16 px-4">
        <div className="text-center space-y-8 max-w-md animate-in fade-in zoom-in duration-500">
          <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/5 animate-bounce">
            <CheckCircle2 size={56} className="text-primary" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight">¡Todo listo!</h1>
            <p className="text-muted-foreground leading-relaxed">
              {form.success_message ||
                "Hemos recibido tu información. Nuestro equipo estará en contacto pronto."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Form render ───────────────────────────────────────────────────────────

  const stepNames = [
    ...activeSections.map(s => s.name),
    ...(confirmSection ? [confirmSection.name] : []),
  ];

  return (
    <>
      {/* Stepper Progress */}
      <div className="bg-card/50 border-b py-6 mb-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                Paso {currentStep + 1} de {totalSteps}
              </span>
              <h2 className="text-lg font-black tracking-tight">{stepNames[currentStep]}</h2>
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              {Math.round(((currentStep + 1) / totalSteps) * 100)}% Completado
            </span>
          </div>
          <div className="flex items-center gap-1.5 h-1.5">
            {stepNames.map((_, i) => (
              <div
                key={i}
                className={`h-full flex-1 rounded-full transition-all duration-500 ${
                  i <= currentStep
                    ? "bg-primary shadow-sm shadow-primary/20"
                    : "bg-muted-foreground/10"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-20">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border border-border/60 rounded-3xl p-8 md:p-10 shadow-xl shadow-foreground/5 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Section header */}
            {currentSection && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-foreground tracking-tight">
                  {currentSection.name}
                </h2>
                {currentSection.subtitle && (
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {currentSection.subtitle}
                  </p>
                )}
              </div>
            )}

            {/* Confirmation step */}
            {isOnConfirm ? (
              <div className="space-y-6">
                {form.confirmation_message && (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {form.confirmation_message}
                    </p>
                  </div>
                )}
                <ConfirmationView
                  sections={activeSections}
                  fields={fields}
                  formValues={formValues}
                />
              </div>
            ) : (
              /* Fields */
              <div className="space-y-6">
                {Object.keys(errors).length > 0 && (
                  <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-2xl px-4 py-3">
                    <span className="text-destructive font-bold text-base leading-none mt-0.5">!</span>
                    <p className="text-sm text-destructive font-medium">
                      Por favor completa los campos obligatorios antes de continuar.
                    </p>
                  </div>
                )}
                {currentFields.map(field => (
                  <FieldRenderer
                    key={field.id}
                    field={field}
                    value={formValues[field.id]}
                    error={errors[field.id]}
                    formUserId={formUserId}
                    onChange={val => {
                      setFormValues(v => ({ ...v, [field.id]: val }));
                      if (errors[field.id]) setErrors(e => ({ ...e, [field.id]: "" }));
                    }}
                  />
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-12 pt-8 border-t border-border/50">
              <Button
                variant="ghost"
                onClick={prev}
                disabled={currentStep === 0}
                className="rounded-xl h-12 px-6 font-bold text-muted-foreground hover:text-foreground transition-all"
              >
                <ChevronLeft size={18} className="mr-2" /> Anterior
              </Button>

              {isOnConfirm ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="rounded-xl h-12 px-8 font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {isSubmitting ? (
                    <><Loader2 size={18} className="mr-2 animate-spin" /> Enviando…</>
                  ) : (
                    <>{form.submit_label || "Enviar"} <ArrowRight size={18} className="ml-2" /></>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={next}
                  className="rounded-xl h-12 px-8 font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Continuar <ChevronRight size={18} className="ml-2" />
                </Button>
              )}
            </div>
          </div>

          <p className="text-center text-[10px] font-medium text-muted-foreground/40 mt-8 uppercase tracking-[0.2em]">
            Acrosoft Labs · Formulario Seguro
          </p>
        </div>
      </main>
    </>
  );
};

export default FormRenderer;
