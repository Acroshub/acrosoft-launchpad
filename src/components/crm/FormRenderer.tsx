import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CrmForm, CrmService } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Check, ChevronRight, ChevronLeft, CheckCircle2,
  Loader2, ArrowRight, ClipboardCheck, X,
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

const usePublicBusinessProfile = (userId?: string | null) =>
  useQuery({
    queryKey: ["public_business_profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("crm_business_profile")
        .select("logo_url, color_primary, theme")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as { logo_url: string | null; color_primary: string; theme: string } | null;
    },
    enabled: !!userId,
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

const FB_PIXEL_SCRIPT_ID = "acrosoft-fb-pixel";

const loadFbPixel = (pixelId: string) => {
  const sanitized = pixelId.replace(/\D/g, "");
  if (!sanitized) return;
  if (window.fbq) { window.fbq("init", sanitized); return; }
  if (document.getElementById(FB_PIXEL_SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = FB_PIXEL_SCRIPT_ID;
  script.innerHTML = `
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init','${sanitized}');
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
                    <div className="flex items-baseline gap-1.5 mt-2 flex-wrap">
                      {svc.discount_pct > 0 ? (
                        <>
                          <span className="text-base font-bold text-muted-foreground/50 line-through">${svc.price}</span>
                          <span className="text-2xl font-bold text-primary">${(svc.price * (1 - svc.discount_pct / 100)).toFixed(0)}</span>
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-foreground">${svc.price}</span>
                      )}
                      <span className="text-xs text-muted-foreground uppercase tracking-tight">
                        {svc.is_recurring && svc.recurring_price ? "setup" : svc.is_recurring ? `/ ${svc.recurring_label ? svc.recurring_label.replace(/^[/\s]+/, "") : (svc.recurring_interval ?? "mes")}` : "pago único"}
                      </span>
                    </div>
                    {svc.recurring_price && (
                      <span className="text-sm text-muted-foreground">
                        ${svc.recurring_price} / {svc.recurring_label ? svc.recurring_label.replace(/^[/\s]+/, "") : (svc.recurring_interval ?? "mes")}
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

// ─── File Upload Field ────────────────────────────────────────────────────────

const BUCKET = "form-uploads";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
}

const FileUploadField = ({
  field,
  value,
  onChange,
  error,
}: {
  field: PublicField;
  value: any;
  onChange: (v: any) => void;
  error?: string;
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // value is a URL string (single) or array of URL strings
  const urls: string[] = Array.isArray(value)
    ? value.filter(Boolean)
    : value && typeof value === "string"
    ? [value]
    : [];

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    setUploadError(null);

    const newUrls: string[] = [];
    for (const file of files) {
      const ext  = file.name.split(".").pop() ?? "bin";
      const base = sanitizeFilename(file.name.replace(/\.[^.]+$/, ""));
      const path = `${field.id}/${Date.now()}-${base}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });

      if (upErr) {
        setUploadError(`Error al subir ${file.name}: ${upErr.message}`);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }

    onChange([...urls, ...newUrls]);
    setUploading(false);
  };

  const removeUrl = (idx: number) => {
    const next = urls.filter((_, i) => i !== idx);
    onChange(next.length === 0 ? null : next);
  };

  return (
    <FieldWrapper label={field.label} required={field.required} error={uploadError ?? error}>
      <label
        className={`mt-1 flex items-center gap-4 border-2 border-dashed rounded-xl p-5 transition-all ${
          uploading
            ? "border-primary/40 bg-primary/5 cursor-wait"
            : "border-border/60 cursor-pointer hover:border-primary/40 hover:bg-primary/5"
        }`}
      >
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-lg">
          {uploading ? <Loader2 size={20} className="animate-spin text-primary" /> : "📎"}
        </div>
        <div className="flex-1 min-w-0">
          {uploading ? (
            <p className="text-sm font-medium text-primary">Subiendo…</p>
          ) : urls.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">
                {urls.length} archivo{urls.length !== 1 ? "s" : ""} subido{urls.length !== 1 ? "s" : ""} · Haz clic para añadir más
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Seleccionar archivo</p>
              <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, PDF — máx. 5 MB</p>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          disabled={uploading}
          className="hidden"
          onChange={e => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) handleFiles(files);
            // reset input so same file can be re-selected
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      </label>

      {/* Uploaded files list */}
      {urls.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {urls.map((url, i) => {
            const filename = decodeURIComponent(url.split("/").pop() ?? url).replace(/^\d+-/, "");
            const isImage  = /\.(jpe?g|png|webp|gif|svg)$/i.test(url);
            return (
              <div key={i} className="flex items-center gap-2 bg-secondary/30 rounded-lg px-3 py-2">
                {isImage ? (
                  <img src={url} alt={filename} className="w-8 h-8 rounded object-cover shrink-0 border" />
                ) : (
                  <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-xs shrink-0">PDF</div>
                )}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-xs font-medium truncate text-primary hover:underline"
                >
                  {filename}
                </a>
                <button
                  type="button"
                  onClick={() => removeUrl(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
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
    return (
      <FileUploadField
        field={field}
        value={value}
        onChange={onChange}
        error={error}
      />
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
  serviceMap,
}: {
  sections: PublicSection[];
  fields: PublicField[];
  formValues: Record<string, any>;
  serviceMap: Map<string, string>;
}) => {
  const formatValue = (field: PublicField, val: any): string => {
    if (val === undefined || val === null || val === "") return "—";
    if (field.type === "repeatable" && Array.isArray(val)) {
      return `${val.length} elemento${val.length !== 1 ? "s" : ""}`;
    }
    if (field.type === "checkbox") return val ? "Sí" : "No";
    if (field.type === "schedule") return "Horario configurado";
    if (field.type === "file") {
      const fileUrls = Array.isArray(val) ? val.filter(Boolean) : val ? [val] : [];
      if (!fileUrls.length) return "—";
      return `${fileUrls.length} archivo${fileUrls.length !== 1 ? "s" : ""} adjunto${fileUrls.length !== 1 ? "s" : ""}`;
    }
    if (field.type === "color") return val;
    if (field.type === "services") return serviceMap.get(val) ?? val;
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

  const activeSections = useMemo(() => {
    const real = sections.filter(s => !s.isConfirmation);
    if (real.length > 0) return real;
    if (fields.length > 0) {
      return [{ id: "__virtual__", name: form?.name ?? "", subtitle: "", isConfirmation: false } as PublicSection];
    }
    return [];
  }, [sections, fields, form?.name]);
  const confirmSection = useMemo(() => sections.find(s => s.isConfirmation), [sections]);

  const [currentStep, setCurrentStep] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);

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
    : fields.filter(f =>
        currentSection?.id === "__virtual__"
          ? !f.sectionId
          : f.sectionId === currentSection?.id
      );
  const formUserId = (form as any)?.user_id ?? null;
  const { data: branding } = usePublicBusinessProfile(formUserId);
  const isBranded = branding?.theme === "branded";
  const brandPrimary = isBranded ? (branding?.color_primary ?? null) : null;
  const brandLogo = isBranded ? (branding?.logo_url ?? null) : null;

  const hasServicesField = fields.some(f => f.type === "services");
  const servicesFieldAllowedIds = useMemo(() => {
    const sf = fields.find(f => f.type === "services");
    return sf?.allowedServiceIds;
  }, [fields]);
  const { data: servicesForConfirm = [] } = usePublicServices(
    hasServicesField && confirmSection ? formUserId : null,
    servicesFieldAllowedIds
  );
  const serviceMap = useMemo(
    () => new Map(servicesForConfirm.map(s => [s.id, s.name])),
    [servicesForConfirm]
  );

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
    let redirecting = false;
    try {
      const dbUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${dbUrl}/functions/v1/crm-form-public`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ form_id: formId, data: formValues, terms_accepted_at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Error en el servidor");
      const result = await res.json();
      setSubmissionId(result.submission_id ?? "");
      fbTrack("Lead");
      if (form?.success_action === "redirect" && form.redirect_url) {
        redirecting = true;
        const url = form.redirect_url;
        setTimeout(() => { window.location.href = url; }, 350);
      } else {
        setSubmitted(true);
      }
    } catch (e) {
      console.error(e);
      alert("Hubo un problema enviando tu solicitud. Por favor intenta de nuevo.");
    } finally {
      if (!redirecting) setIsSubmitting(false);
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
      {/* Stepper Progress — only show when multi-step */}
      {totalSteps > 1 && <div className="bg-card/50 border-b py-6 mb-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {brandLogo && (
            <div className="mb-4">
              <img src={brandLogo} alt="Logo" className="h-9 max-w-[180px] object-contain" />
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={brandPrimary ? { color: brandPrimary } : undefined}
              >
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
                    ? brandPrimary ? "" : "bg-primary shadow-sm shadow-primary/20"
                    : "bg-muted-foreground/10"
                }`}
                style={i <= currentStep && brandPrimary ? { backgroundColor: brandPrimary } : undefined}
              />
            ))}
          </div>
        </div>
      </div>}

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-20">
        <div className="max-w-2xl mx-auto">
          {/* Brand logo — only on single-page forms (multi-step shows it in stepper) */}
          {brandLogo && totalSteps === 1 && (
            <div className="mb-6">
              <img src={brandLogo} alt="Logo" className="h-9 max-w-[180px] object-contain" />
            </div>
          )}
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
                  serviceMap={serviceMap}
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

            {/* Terms checkbox — only on submit step */}
            {(isOnConfirm || (!confirmSection && currentStep === activeSections.length - 1)) && (
              <div className="mt-8 pt-6 border-t border-border/30 space-y-1.5">
                <label className="flex items-start gap-3 cursor-pointer group" onClick={() => { setTermsAccepted(v => !v); setTermsError(false); }}>
                  <div className={`mt-0.5 w-5 h-5 rounded border-2 flex-none flex items-center justify-center transition-all ${termsAccepted ? "bg-primary border-primary" : termsError ? "border-destructive" : "border-border group-hover:border-primary/50"}`}>
                    {termsAccepted && <Check size={12} className="text-primary-foreground" />}
                  </div>
                  <span className="text-sm text-muted-foreground leading-snug select-none">
                    Acepto los{" "}
                    <a
                      href="/terminos_y_politicas_de_privacidad"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                    >
                      términos y políticas de privacidad
                    </a>
                  </span>
                </label>
                {termsError && (
                  <p className="text-xs text-destructive ml-8">Debes aceptar los términos para continuar.</p>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-12 pt-8 border-t border-border/50">
              {totalSteps > 1 ? (
                <Button
                  variant="ghost"
                  onClick={prev}
                  disabled={currentStep === 0}
                  className="rounded-xl h-12 px-6 font-bold text-muted-foreground hover:text-foreground transition-all"
                >
                  <ChevronLeft size={18} className="mr-2" /> Anterior
                </Button>
              ) : <div />}

              {isOnConfirm || (!confirmSection && currentStep === activeSections.length - 1) ? (
                <Button
                  onClick={isOnConfirm
                    ? () => { if (!termsAccepted) { setTermsError(true); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); return; } handleSubmit(); }
                    : () => { if (!termsAccepted) { setTermsError(true); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); return; } if (validate()) handleSubmit(); }}
                  disabled={isSubmitting}
                  className="rounded-xl h-12 px-8 font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                  style={brandPrimary ? { backgroundColor: brandPrimary, borderColor: brandPrimary, boxShadow: `0 4px 14px ${brandPrimary}33` } : undefined}
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
                  className="rounded-xl h-12 px-8 font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                  style={brandPrimary ? { backgroundColor: brandPrimary, borderColor: brandPrimary, boxShadow: `0 4px 14px ${brandPrimary}33` } : undefined}
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
