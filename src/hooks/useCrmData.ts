import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  CrmContact,
  CrmAppointment,
  CrmBlockedSlot,
  CrmPipelineDeal,
  CrmForm,
  CrmFormSubmission,
  CrmService,
  CrmSale,
  CrmCalendarConfig,
  CrmBusinessProfile,
  CrmPipeline,
  CrmTask,
  CrmContactNote,
  CrmClientAccount,
  CrmStaff,
  CrmReminderConfig,
  CrmReminder,
} from "@/lib/supabase";
import { useCurrentUser } from "./useAuth";

// ─── LOGS ──────────────────────────────────────────────────────

export type CrmLog = {
  id: string;
  created_at: string;
  user_id: string;
  action: "create" | "update" | "delete";
  entity: string;
  entity_id: string | null;
  description: string | null;
};

const logAction = async (
  action: "create" | "update" | "delete",
  entity: string,
  description: string,
  entityId?: string
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase.from("crm_logs").insert({
      user_id: session.user.id,
      action,
      entity,
      description,
      entity_id: entityId ?? null,
    });
  } catch {
    // Logs are non-critical — fail silently until migration is applied
  }
};

export const useLogs = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as CrmLog[];
    },
    enabled: !!user,
  });
};

// ─── CONTACTS ──────────────────────────────────────────────────

export const useContacts = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmContact[];
    },
    enabled: !!user,
  });
};

export const useCreateContact = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (contact: Partial<CrmContact>) => {
      const { data, error } = await supabase
        .from("crm_contacts")
        .insert({ ...contact, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as CrmContact;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_contacts"] });
      logAction("create", "Contacto", `Contacto creado: ${data.name}`, data.id);
    },
  });
};

export const useUpdateContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CrmContact> & { id: string }) => {
      const { data, error } = await supabase
        .from("crm_contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CrmContact;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_contacts"] });
      logAction("update", "Contacto", `Contacto actualizado: ${data.name}`, data.id);
    },
  });
};

export const useDeleteContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      const { error } = await supabase.from("crm_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, name }) => {
      qc.invalidateQueries({ queryKey: ["crm_contacts"] });
      logAction("delete", "Contacto", `Contacto eliminado: ${name}`, id);
    },
  });
};

// ─── APPOINTMENTS ──────────────────────────────────────────────

export const useAppointments = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_appointments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_appointments")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      return data as CrmAppointment[];
    },
    enabled: !!user,
  });
};

export const useCreateAppointment = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (appt: Partial<CrmAppointment>) => {
      const { data, error } = await supabase
        .from("crm_appointments")
        .insert({ ...appt, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as CrmAppointment;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_appointments"] });
      logAction("create", "Cita", `Cita agendada: ${data.date} ${String(data.hour).padStart(2, "0")}:${String(data.minute ?? 0).padStart(2, "0")}`, data.id);
    },
  });
};

export const useUpdateAppointment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CrmAppointment> & { id: string }) => {
      const { data, error } = await supabase
        .from("crm_appointments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CrmAppointment;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_appointments"] });
      logAction("update", "Cita", `Cita actualizada: ${data.date}`, data.id);
    },
  });
};

export const useDeleteAppointment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      const { error } = await supabase.from("crm_appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, name }) => {
      qc.invalidateQueries({ queryKey: ["crm_appointments"] });
      logAction("delete", "Cita", `Cita eliminada: ${name}`, id);
    },
  });
};

// ─── BLOCKED SLOTS ─────────────────────────────────────────────

export const useBlockedSlots = (calendarId?: string | null) => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_blocked_slots", user?.id, calendarId],
    queryFn: async () => {
      let q = supabase
        .from("crm_blocked_slots")
        .select("*")
        .order("created_at", { ascending: false });
      if (calendarId) q = q.eq("calendar_id", calendarId);
      const { data, error } = await q;
      if (error) throw error;
      return data as CrmBlockedSlot[];
    },
    enabled: !!user,
  });
};

export const useCreateBlockedSlot = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (slot: Partial<CrmBlockedSlot>) => {
      const { data, error } = await supabase
        .from("crm_blocked_slots")
        .insert({ ...slot, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as CrmBlockedSlot;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_blocked_slots"] });
      logAction("create", "Bloqueo", `Horario bloqueado: ${data.date ?? data.type}`, data.id);
    },
  });
};

export const useDeleteBlockedSlot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      const { error } = await supabase.from("crm_blocked_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, name }) => {
      qc.invalidateQueries({ queryKey: ["crm_blocked_slots"] });
      logAction("delete", "Bloqueo", `Bloqueo de horario eliminado: ${name}`, id);
    },
  });
};

// ─── PIPELINE DEALS ────────────────────────────────────────────

export const useDeals = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_pipeline_deals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_pipeline_deals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmPipelineDeal[];
    },
    enabled: !!user,
  });
};

export const useCreateDeal = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (deal: Partial<CrmPipelineDeal>) => {
      const { data, error } = await supabase
        .from("crm_pipeline_deals")
        .insert({ ...deal, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as CrmPipelineDeal;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_pipeline_deals"] });
      logAction("create", "Deal", `Deal creado: ${data.title}`, data.id);
    },
  });
};

export const useUpdateDeal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CrmPipelineDeal> & { id: string }) => {
      const { data, error } = await supabase
        .from("crm_pipeline_deals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CrmPipelineDeal;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_pipeline_deals"] });
      logAction("update", "Deal", `Deal actualizado: ${data.title}`, data.id);
    },
  });
};

export const useDeleteDeal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      const { error } = await supabase.from("crm_pipeline_deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, name }) => {
      qc.invalidateQueries({ queryKey: ["crm_pipeline_deals"] });
      logAction("delete", "Deal", `Deal eliminado: ${name}`, id);
    },
  });
};

// ─── FORMS ─────────────────────────────────────────────────────

export const useForms = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_forms", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_forms")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmForm[];
    },
    enabled: !!user,
  });
};

export const useCreateForm = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (form: Partial<CrmForm>) => {
      const { data, error } = await supabase
        .from("crm_forms")
        .insert({ ...form, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as CrmForm;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_forms"] });
      logAction("create", "Formulario", `Formulario creado: ${data.name}`, data.id);
    },
  });
};

export const useUpdateForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CrmForm> & { id: string }) => {
      const { data, error } = await supabase
        .from("crm_forms")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CrmForm;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_forms"] });
      logAction("update", "Formulario", `Formulario actualizado: ${data.name}`, data.id);
    },
  });
};

export const useDeleteForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      const { error } = await supabase.from("crm_forms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, name }) => {
      qc.invalidateQueries({ queryKey: ["crm_forms"] });
      logAction("delete", "Formulario", `Formulario eliminado: ${name}`, id);
    },
  });
};

// ─── SERVICES ──────────────────────────────────────────────────

export const useServices = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_services", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_services")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CrmService[];
    },
    enabled: !!user,
  });
};

export const useCreateService = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (service: Partial<CrmService>) => {
      const { data, error } = await supabase
        .from("crm_services")
        .insert({ ...service, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as CrmService;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_services"] });
      logAction("create", "Servicio", `Servicio creado: ${data.name}`, data.id);
    },
  });
};

export const useUpdateService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CrmService> & { id: string }) => {
      const { data, error } = await supabase
        .from("crm_services")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CrmService;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_services"] });
      logAction("update", "Servicio", `Servicio actualizado: ${data.name}`, data.id);
    },
  });
};

export const useDeleteService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      const { error } = await supabase.from("crm_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, name }) => {
      qc.invalidateQueries({ queryKey: ["crm_services"] });
      logAction("delete", "Servicio", `Servicio eliminado: ${name}`, id);
    },
  });
};

// ─── SALES ─────────────────────────────────────────────────────

export const useSales = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_sales", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_sales")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmSale[];
    },
    enabled: !!user,
  });
};

export const useCreateSale = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (sale: Partial<CrmSale>) => {
      const { data, error } = await supabase
        .from("crm_sales")
        .insert({ ...sale, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as CrmSale;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_sales"] });
      logAction("create", "Venta", `Venta registrada: ${data.contact_name ?? "—"} — ${data.service_name ?? "—"} ($${data.amount})`, data.id);
    },
  });
};

export const useUpdateSale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, justification, ...updates }: Partial<CrmSale> & { id: string; justification: string }) => {
      const { data, error } = await supabase
        .from("crm_sales")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { sale: data as CrmSale, justification };
    },
    onSuccess: ({ sale, justification }) => {
      qc.invalidateQueries({ queryKey: ["crm_sales"] });
      logAction("update", "Venta", `Venta editada: ${sale.contact_name ?? "—"} — $${sale.amount}. Justificación: ${justification}`, sale.id);
    },
  });
};

export const useDeleteSale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; contactName: string; serviceName: string; amount: number; justification: string }) => {
      const { error } = await supabase.from("crm_sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, contactName, serviceName, amount, justification }) => {
      qc.invalidateQueries({ queryKey: ["crm_sales"] });
      logAction("delete", "Venta", `Venta eliminada: ${contactName} — ${serviceName} ($${amount}). Justificación: ${justification}`, id);
    },
  });
};

// ─── CALENDAR CONFIG ───────────────────────────────────────────

/** Returns ALL calendars for the current user */
export const useCalendars = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_calendar_config", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_calendar_config")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CrmCalendarConfig[];
    },
    enabled: !!user,
  });
};


export const useCreateCalendarConfig = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (config: Omit<Partial<CrmCalendarConfig>, "id" | "user_id" | "created_at">) => {
      const { data, error } = await supabase
        .from("crm_calendar_config")
        .insert({ ...config, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as CrmCalendarConfig;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_calendar_config"] });
      logAction("create", "Calendario", `Calendario creado: ${data.name ?? "sin nombre"}`, data.id);
    },
  });
};

export const useUpdateCalendarConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...config }: Partial<CrmCalendarConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from("crm_calendar_config")
        .update(config)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CrmCalendarConfig;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_calendar_config"] });
      logAction("update", "Calendario", `Calendario actualizado: ${data.name ?? "sin nombre"}`, data.id);
    },
  });
};

/** @deprecated kept for CrmCalendar missing-form recovery; prefer useUpdateCalendarConfig */
export const useUpsertCalendarConfig = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (config: Partial<CrmCalendarConfig>) => {
      if (config.id) {
        const { id, ...rest } = config;
        const { data, error } = await supabase
          .from("crm_calendar_config")
          .update(rest)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as CrmCalendarConfig;
      }
      const { data, error } = await supabase
        .from("crm_calendar_config")
        .insert({ ...config, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as CrmCalendarConfig;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_calendar_config"] });
      logAction("update", "Calendario", `Calendario actualizado: ${data.name ?? "sin nombre"}`, data.id);
    },
  });
};

export const useDeleteCalendarConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_calendar_config")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["crm_calendar_config"] });
      logAction("delete", "Calendario", "Calendario eliminado", id);
    },
  });
};

// ─── BUSINESS PROFILE ──────────────────────────────────────────

export const useBusinessProfile = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_business_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_business_profile")
        .select("*")
        .single();
      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
      return (data as CrmBusinessProfile) ?? null;
    },
    enabled: !!user,
  });
};

export const useUpsertBusinessProfile = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (profile: Partial<CrmBusinessProfile>) => {
      const { data, error } = await supabase
        .from("crm_business_profile")
        .upsert({ ...profile, user_id: user!.id }, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data as CrmBusinessProfile;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_business_profile"] });
      logAction("update", "Perfil de Negocio", `Perfil actualizado: ${data.business_name ?? "sin nombre"}`, data.id);
    },
  });
};

// ─── PIPELINES ────────────────────────────────────────────────

export const usePipelines = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_pipelines", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_pipelines")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CrmPipeline[];
    },
    enabled: !!user,
  });
};

export const useCreatePipeline = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (pipeline: Pick<CrmPipeline, "name" | "type" | "column_names">) => {
      const { data, error } = await supabase
        .from("crm_pipelines")
        .insert({ ...pipeline, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as CrmPipeline;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_pipelines"] });
      logAction("create", "Pipeline", `Pipeline creado: ${data.name}`, data.id);
    },
  });
};

export const useUpdatePipeline = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CrmPipeline> & { id: string }) => {
      const { data, error } = await supabase
        .from("crm_pipelines")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CrmPipeline;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_pipelines"] });
    },
  });
};

export const useDeletePipeline = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      const { error } = await supabase.from("crm_pipelines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, name }) => {
      qc.invalidateQueries({ queryKey: ["crm_pipelines"] });
      qc.invalidateQueries({ queryKey: ["crm_tasks"] });
      logAction("delete", "Pipeline", `Pipeline eliminado: ${name}`, id);
    },
  });
};

// ─── TASKS ────────────────────────────────────────────────────

/**
 * Builds a map of contact_id → [{pipelineName, stage}] by matching
 * crm_contacts.stage against crm_pipelines.column_names.
 * A contact appears in a pipeline when its stage value is one of that pipeline's columns.
 */
export const useAllContactStages = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_all_contact_stages", user?.id],
    queryFn: async () => {
      // Fetch all contacts-type pipelines
      const { data: pipelines, error: pErr } = await supabase
        .from("crm_pipelines")
        .select("id, name, column_names")
        .eq("user_id", user!.id)
        .eq("type", "contacts");
      if (pErr) throw pErr;

      // Fetch all contacts that have a stage
      const { data: contacts, error: cErr } = await supabase
        .from("crm_contacts")
        .select("id, stage")
        .eq("user_id", user!.id)
        .not("stage", "is", null);
      if (cErr) throw cErr;

      // Build map: contact_id → [{pipelineName, stage}]
      const map: Record<string, { pipelineName: string; stage: string }[]> = {};
      for (const contact of contacts ?? []) {
        if (!contact.stage) continue;
        for (const pipeline of pipelines ?? []) {
          if ((pipeline.column_names as string[]).includes(contact.stage)) {
            if (!map[contact.id]) map[contact.id] = [];
            map[contact.id].push({ pipelineName: pipeline.name, stage: contact.stage });
          }
        }
      }
      return map;
    },
    enabled: !!user,
  });
};

export const useTasks = (pipelineId: string | null) => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_tasks", pipelineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_tasks")
        .select("*")
        .eq("pipeline_id", pipelineId!)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CrmTask[];
    },
    enabled: !!user && !!pipelineId,
  });
};

export const useCreateTask = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (task: Pick<CrmTask, "pipeline_id" | "title" | "description" | "priority" | "stage">) => {
      const { data, error } = await supabase
        .from("crm_tasks")
        .insert({ ...task, user_id: user!.id, position: 0 })
        .select()
        .single();
      if (error) throw error;
      return data as CrmTask;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_tasks", data.pipeline_id] });
    },
  });
};

export const useUpdateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CrmTask> & { id: string }) => {
      const { data, error } = await supabase
        .from("crm_tasks")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CrmTask;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_tasks", data.pipeline_id] });
    },
  });
};

export const useDeleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pipelineId }: { id: string; pipelineId: string; name: string }) => {
      const { error } = await supabase.from("crm_tasks").delete().eq("id", id);
      if (error) throw error;
      return pipelineId;
    },
    onSuccess: (pipelineId, { id, name }) => {
      qc.invalidateQueries({ queryKey: ["crm_tasks", pipelineId] });
      logAction("delete", "Tarea", `Tarea eliminada: ${name}`, id);
    },
  });
};

// ─── CONTACT NOTES ────────────────────────────────────────────

export const useContactNotes = (contactId: string | null) => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_contact_notes", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_contact_notes")
        .select("*")
        .eq("contact_id", contactId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CrmContactNote[];
    },
    enabled: !!user && !!contactId,
  });
};

export const useCreateContactNote = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async ({ contactId, body }: { contactId: string; body: string }) => {
      const { data, error } = await supabase
        .from("crm_contact_notes")
        .insert({ contact_id: contactId, user_id: user!.id, body })
        .select()
        .single();
      if (error) throw error;
      return data as CrmContactNote;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_contact_notes", data.contact_id] });
    },
  });
};

// ─── PUBLIC HOOKS (no auth required) ──────────────────────────────────────────

export const usePublicForm = (formId: string) =>
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

export const usePublicServices = (userId?: string | null, allowedIds?: string[]) =>
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
      if (allowedIds?.length) return all.filter((s) => allowedIds.includes(s.id));
      return all;
    },
    enabled: !!userId,
  });

export const useLandingServices = () =>
  useQuery({
    queryKey: ["landing_services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_services")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CrmService[];
    },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const usePublicCalendar = (calendarId: string) =>
  useQuery({
    queryKey: ["public_calendar", calendarId],
    queryFn: async () => {
      const isUUID = UUID_RE.test(calendarId);
      const { data, error } = await supabase
        .from("crm_calendar_config")
        .select("*")
        .eq(isUUID ? "id" : "slug", calendarId)
        .single();
      if (error) throw error;
      return data as CrmCalendarConfig;
    },
    enabled: !!calendarId,
  });

export const usePublicAppointments = (
  calendarId?: string | null,
  year?: number,
  month?: number,
) =>
  useQuery({
    queryKey: ["public_appointments", calendarId, year, month],
    queryFn: async () => {
      if (!calendarId || year == null || month == null) return [];
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      // Use 31 as a safe upper bound — Supabase will just return nothing for invalid dates
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-31`;
      const { data, error } = await supabase
        .from("crm_appointments")
        .select("date, hour, minute, duration_min, status")
        .eq("calendar_id", calendarId)
        .gte("date", startDate)
        .lte("date", endDate)
        .neq("status", "cancelled");
      if (error) throw error;
      return data as { date: string; hour: number; minute: number; duration_min: number; status: string }[];
    },
    enabled: !!calendarId && year != null && month != null,
  });

export const usePublicBlockedSlots = (calendarId?: string | null) =>
  useQuery({
    queryKey: ["public_blocked_slots", calendarId],
    queryFn: async () => {
      if (!calendarId) return [];
      const { data, error } = await supabase
        .from("crm_blocked_slots")
        .select("*")
        .eq("calendar_id", calendarId);
      if (error) throw error;
      return data as CrmBlockedSlot[];
    },
    enabled: !!calendarId,
  });

export const usePublicBusinessProfile = (userId?: string | null) =>
  useQuery({
    queryKey: ["public_business_profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("crm_business_profile")
        .select("color_primary, color_secondary, color_accent")
        .eq("user_id", userId)
        .single();
      if (error) return null; // Non-critical — fall back to defaults
      return data as { color_primary: string; color_secondary: string; color_accent: string } | null;
    },
    enabled: !!userId,
  });

// ─── CLIENT ACCOUNTS ──────────────────────────────────────────────────────────

export const useClientAccounts = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_client_accounts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_client_accounts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmClientAccount[];
    },
    enabled: !!user,
  });
};

export const useCreateSaasClient = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (contactId: string) => {
      const { data, error } = await supabase.functions.invoke("create-saas-client", {
        body: { contact_id: contactId, admin_user_id: user!.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { account_id: string; client_user_id: string; email: string; reactivated?: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_client_accounts"] });
    },
  });
};

export const useDisableSaasClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase
        .from("crm_client_accounts")
        .update({ status: "disabled", disabled_at: new Date().toISOString() })
        .eq("id", accountId)
        .select()
        .single();
      if (error) throw error;
      return data as CrmClientAccount;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_client_accounts"] });
    },
  });
};

export const useEnableSaasClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase
        .from("crm_client_accounts")
        .update({ status: "active", disabled_at: null })
        .eq("id", accountId)
        .select()
        .single();
      if (error) throw error;
      return data as CrmClientAccount;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_client_accounts"] });
    },
  });
};

// ─── STAFF ────────────────────────────────────────────────────────────────────

export const useStaff = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_staff", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_staff")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmStaff[];
    },
    enabled: !!user,
  });
};

export const useCreateStaff = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (staff: Omit<CrmStaff, "id" | "created_at" | "owner_user_id" | "staff_user_id" | "status">) => {
      const { data, error } = await supabase
        .from("crm_staff")
        .insert({ ...staff, owner_user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as CrmStaff;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_staff"] });
      logAction("create", "Staff", `Staff creado: ${data.name}`, data.id);
    },
  });
};

export const useUpdateStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CrmStaff> & { id: string }) => {
      const { data, error } = await supabase
        .from("crm_staff")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CrmStaff;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_staff"] });
      logAction("update", "Staff", `Staff actualizado: ${data.name}`, data.id);
    },
  });
};

export const useDeleteStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      const { error } = await supabase.from("crm_staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, name }) => {
      qc.invalidateQueries({ queryKey: ["crm_staff"] });
      logAction("delete", "Staff", `Staff eliminado: ${name}`, id);
    },
  });
};

// ─── REMINDERS ────────────────────────────────────────────────────────────────

export const useReminderConfig = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_reminder_config", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_reminder_config")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return (data as CrmReminderConfig) ?? null;
    },
    enabled: !!user,
  });
};

export const useUpsertReminderConfig = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (config: Partial<CrmReminderConfig>) => {
      const { data, error } = await supabase
        .from("crm_reminder_config")
        .upsert({ ...config, user_id: user!.id }, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data as CrmReminderConfig;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_reminder_config"] }),
  });
};

export const useReminders = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_reminders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_reminders")
        .select("*")
        .order("scheduled_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as CrmReminder[];
    },
    enabled: !!user,
  });
};

export const usePersonalReminders = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_reminders_personal", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_reminders")
        .select("*")
        .eq("is_personal", true)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data as CrmReminder[];
    },
    enabled: !!user,
  });
};

export const useCreateReminder = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (reminder: Omit<CrmReminder, "id" | "created_at" | "user_id" | "status" | "sent_at" | "error">) => {
      const { data, error } = await supabase
        .from("crm_reminders")
        .insert({ ...reminder, user_id: user!.id, status: "pending" })
        .select()
        .single();
      if (error) throw error;
      // Also enqueue it immediately
      await supabase.from("crm_reminder_queue").insert({ reminder_id: (data as CrmReminder).id });
      return data as CrmReminder;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_reminders"] });
      qc.invalidateQueries({ queryKey: ["crm_reminders_personal"] });
      logAction("create", "Recordatorio", "Recordatorio programado");
    },
  });
};

// ─── WHATSAPP CONFIG ────────────────────────────────────────────

export const useWhatsappConfig = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_whatsapp_config", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_whatsapp_config")
        .select("id, status, phone_number")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as { id: string; status: string; phone_number: string | null } | null;
    },
    enabled: !!user,
  });
};

/** Returns true only when a WhatsApp session is actively connected */
export const useWhatsappEnabled = () => {
  const { data } = useWhatsappConfig();
  return data?.status === "connected";
};
