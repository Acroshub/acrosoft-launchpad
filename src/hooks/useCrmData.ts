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
  CrmContactPipelineMembership,
} from "@/lib/supabase";
import { useCurrentUser, useStaffPermissions } from "./useAuth";

// ─── LOGS ──────────────────────────────────────────────────────

export type CrmLog = {
  id: string;
  created_at: string;
  user_id: string;
  action: "create" | "update" | "delete";
  entity: string;
  entity_id: string | null;
  description: string | null;
  performed_by_user_id: string | null;
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

    const actorId = session.user.id;
    let ownerId = actorId;

    // If the actor is a staff member, attribute the log to the business owner
    const { data: staffRow } = await supabase
      .from("crm_staff")
      .select("owner_user_id")
      .eq("staff_user_id", actorId)
      .eq("status", "active")
      .maybeSingle();

    if (staffRow) ownerId = staffRow.owner_user_id;

    await supabase.from("crm_logs").insert({
      user_id: ownerId,
      performed_by_user_id: actorId,
      action,
      entity,
      description,
      entity_id: entityId ?? null,
    });
  } catch {
    // Logs are non-critical — fail silently
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
  const { ownerUserId } = useStaffPermissions();
  return useMutation({
    mutationFn: async (contact: Partial<CrmContact>) => {
      const { data, error } = await supabase
        .from("crm_contacts")
        .insert({ ...contact, user_id: ownerUserId! })
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
      qc.invalidateQueries({ queryKey: ["crm_contact_memberships"] });
      qc.invalidateQueries({ queryKey: ["crm_all_contact_stages"] });
      logAction("delete", "Contacto", `Contacto eliminado: ${name}`, id);
    },
  });
};

// ─── APPOINTMENTS ──────────────────────────────────────────────

export const useAppointments = (calendarId?: string | null) => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_appointments", user?.id, calendarId ?? null],
    queryFn: async () => {
      let q = supabase
        .from("crm_appointments")
        .select("*")
        .order("date", { ascending: true });
      if (calendarId) q = q.eq("calendar_id", calendarId);
      const { data, error } = await q;
      if (error) throw error;
      return data as CrmAppointment[];
    },
    enabled: !!user,
  });
};

export const useCreateAppointment = () => {
  const qc = useQueryClient();
  const { ownerUserId } = useStaffPermissions();
  return useMutation({
    mutationFn: async (appt: Partial<CrmAppointment>) => {
      const { data, error } = await supabase
        .from("crm_appointments")
        .insert({ ...appt, user_id: ownerUserId! })
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
    queryKey: ["crm_blocked_slots", user?.id, calendarId ?? null],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_blocked_slots")
        .select("*")
        .eq("calendar_id", calendarId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmBlockedSlot[];
    },
    enabled: !!user && !!calendarId,
  });
};

export const useCreateBlockedSlot = () => {
  const qc = useQueryClient();
  const { ownerUserId } = useStaffPermissions();
  return useMutation({
    mutationFn: async (slot: Partial<CrmBlockedSlot>) => {
      const { data, error } = await supabase
        .from("crm_blocked_slots")
        .insert({ ...slot, user_id: ownerUserId! })
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

export const useUpdateBlockedSlot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      type: "hours" | "fullday" | "range";
      reason: string | null;
      date: string | null;
      start_hour: number | null;
      start_minute: number;
      end_hour: number | null;
      end_minute: number;
      range_start: string | null;
      range_end: string | null;
    }) => {
      const { id, ...patch } = data;
      const { error } = await supabase.from("crm_blocked_slots").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["crm_blocked_slots"] });
      logAction("update", "Bloqueo", "Bloqueo de horario actualizado", id);
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
  const { ownerUserId } = useStaffPermissions();
  return useMutation({
    mutationFn: async (deal: Partial<CrmPipelineDeal>) => {
      const { data, error } = await supabase
        .from("crm_pipeline_deals")
        .insert({ ...deal, user_id: ownerUserId! })
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
  const { ownerUserId } = useStaffPermissions();
  return useMutation({
    mutationFn: async (form: Partial<CrmForm>) => {
      const { data, error } = await supabase
        .from("crm_forms")
        .insert({ ...form, user_id: ownerUserId! })
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
  const { ownerUserId } = useStaffPermissions();
  return useMutation({
    mutationFn: async (sale: Partial<CrmSale>) => {
      const { data, error } = await supabase
        .from("crm_sales")
        .insert({ ...sale, user_id: ownerUserId! })
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

/** Returns calendars owned by the admin (excludes SaaS client calendars that have a contact_id) */
export const useCalendars = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_calendar_config", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_calendar_config")
        .select("*")
        .is("contact_id", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CrmCalendarConfig[];
    },
    enabled: !!user,
  });
};


export const useCreateCalendarConfig = () => {
  const qc = useQueryClient();
  const { ownerUserId } = useStaffPermissions();
  return useMutation({
    mutationFn: async (config: Omit<Partial<CrmCalendarConfig>, "id" | "user_id" | "created_at">) => {
      const { data, error } = await supabase
        .from("crm_calendar_config")
        .insert({ ...config, user_id: ownerUserId! })
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
  const { ownerUserId } = useStaffPermissions();
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
        .insert({ ...config, user_id: ownerUserId! })
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
  const { ownerUserId } = useStaffPermissions();
  return useMutation({
    mutationFn: async (pipeline: Pick<CrmPipeline, "name" | "type" | "column_names">) => {
      const { data, error } = await supabase
        .from("crm_pipelines")
        .insert({ ...pipeline, user_id: ownerUserId! })
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
      qc.invalidateQueries({ queryKey: ["crm_contact_memberships"] });
      qc.invalidateQueries({ queryKey: ["crm_all_contact_stages"] });
      logAction("delete", "Pipeline", `Pipeline eliminado: ${name}`, id);
    },
  });
};

// ─── TASKS ────────────────────────────────────────────────────

/**
 * Builds a map of contact_id → [{pipelineName, stage}] from crm_contact_pipeline_memberships.
 * Source of truth for multi-pipeline membership (replaces matching crm_contacts.stage).
 */
export const useAllContactStages = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_all_contact_stages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_contact_pipeline_memberships")
        .select("contact_id, stage, crm_pipelines!inner(name)");
      if (error) throw error;

      const map: Record<string, { pipelineName: string; stage: string }[]> = {};
      for (const row of data ?? []) {
        const pipeline = row.crm_pipelines as unknown as { name: string } | null;
        if (!pipeline) continue;
        if (!map[row.contact_id]) map[row.contact_id] = [];
        map[row.contact_id].push({ pipelineName: pipeline.name, stage: row.stage });
      }
      return map;
    },
    enabled: !!user,
  });
};

// ─── CONTACT PIPELINE MEMBERSHIPS ─────────────────────────────

/** Fetches all memberships for a specific contacts pipeline. */
export const useContactMemberships = (pipelineId: string | null) => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_contact_memberships", pipelineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_contact_pipeline_memberships")
        .select("*")
        .eq("pipeline_id", pipelineId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as CrmContactPipelineMembership[];
    },
    enabled: !!user && !!pipelineId,
  });
};

/** Adds (or updates) a contact's membership in a pipeline. */
export const useAddContactMembership = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contactId,
      pipelineId,
      stage,
      position = 0,
    }: {
      contactId: string;
      pipelineId: string;
      stage: string;
      position?: number;
    }) => {
      const { data, error } = await supabase
        .from("crm_contact_pipeline_memberships")
        .upsert(
          { contact_id: contactId, pipeline_id: pipelineId, stage, position },
          { onConflict: "contact_id,pipeline_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data as CrmContactPipelineMembership;
    },
    onSuccess: (_, { pipelineId }) => {
      qc.invalidateQueries({ queryKey: ["crm_contact_memberships", pipelineId] });
      qc.invalidateQueries({ queryKey: ["crm_all_contact_stages"] });
    },
  });
};

/** Removes a contact from a pipeline (deletes the membership row). */
export const useRemoveContactMembership = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ membershipId }: { membershipId: string; pipelineId: string }) => {
      const { error } = await supabase
        .from("crm_contact_pipeline_memberships")
        .delete()
        .eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: (_, { pipelineId }) => {
      qc.invalidateQueries({ queryKey: ["crm_contact_memberships", pipelineId] });
      qc.invalidateQueries({ queryKey: ["crm_all_contact_stages"] });
    },
  });
};

/** Moves a contact to a different column within the same pipeline. */
export const useUpdateMembershipStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ membershipId, stage }: { membershipId: string; stage: string; pipelineId: string }) => {
      const { data, error } = await supabase
        .from("crm_contact_pipeline_memberships")
        .update({ stage })
        .eq("id", membershipId)
        .select()
        .single();
      if (error) throw error;
      return data as CrmContactPipelineMembership;
    },
    onSuccess: (_, { pipelineId }) => {
      qc.invalidateQueries({ queryKey: ["crm_contact_memberships", pipelineId] });
      qc.invalidateQueries({ queryKey: ["crm_all_contact_stages"] });
    },
  });
};

/** Renames a stage on all memberships in a pipeline (used when renaming a column). */
export const useBatchUpdateMembershipStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pipelineId,
      oldStage,
      newStage,
    }: {
      pipelineId: string;
      oldStage: string;
      newStage: string;
    }) => {
      const { error } = await supabase
        .from("crm_contact_pipeline_memberships")
        .update({ stage: newStage })
        .eq("pipeline_id", pipelineId)
        .eq("stage", oldStage);
      if (error) throw error;
    },
    onSuccess: (_, { pipelineId }) => {
      qc.invalidateQueries({ queryKey: ["crm_contact_memberships", pipelineId] });
      qc.invalidateQueries({ queryKey: ["crm_all_contact_stages"] });
    },
  });
};

/** Updates position on multiple memberships (for within-column reorder). */
export const useBatchUpdateMembershipPositions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; position: number; pipelineId: string }[]) => {
      for (const { id, position } of updates) {
        const { error } = await supabase
          .from("crm_contact_pipeline_memberships")
          .update({ position })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: (_, updates) => {
      const pipelineIds = [...new Set(updates.map((u) => u.pipelineId))];
      pipelineIds.forEach((pid) =>
        qc.invalidateQueries({ queryKey: ["crm_contact_memberships", pid] })
      );
    },
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
  const { ownerUserId } = useStaffPermissions();
  return useMutation({
    mutationFn: async (task: Pick<CrmTask, "pipeline_id" | "title" | "description" | "priority" | "stage"> & { contact_id?: string | null; position?: number }) => {
      const { data, error } = await supabase
        .from("crm_tasks")
        .insert({ ...task, user_id: ownerUserId!, position: task.position ?? 0 })
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

/**
 * Batch-updates stage on multiple contacts by ID.
 * Used when renaming a pipeline column — avoids N individual mutations.
 */
export const useBatchUpdateContactStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, newStage }: { ids: string[]; newStage: string }) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("crm_contacts")
        .update({ stage: newStage })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_contacts"] });
      qc.invalidateQueries({ queryKey: ["crm_all_contact_stages"] });
    },
  });
};

/**
 * Batch-updates position on multiple tasks (for within-column reorder).
 * Runs N sequential updates since Supabase doesn't support bulk upsert with different values.
 */
export const useBatchUpdateTaskPositions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (positions: { id: string; position: number; pipelineId: string }[]) => {
      for (const { id, position } of positions) {
        const { error } = await supabase
          .from("crm_tasks")
          .update({ position })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: (_, updates) => {
      const pipelineIds = [...new Set(updates.map((u) => u.pipelineId))];
      pipelineIds.forEach((pid) => qc.invalidateQueries({ queryKey: ["crm_tasks", pid] }));
    },
  });
};

/**
 * Batch-updates pipeline_position on multiple contacts (for within-column reorder).
 * Each update receives the full merged pipeline_position map to avoid a read-before-write.
 */
export const useBatchUpdateContactPositions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; pipelinePosition: Record<string, number> }[]) => {
      for (const { id, pipelinePosition } of updates) {
        const { error } = await supabase
          .from("crm_contacts")
          .update({ pipeline_position: pipelinePosition })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_contacts"] });
    },
  });
};

/**
 * Batch-updates stage on all tasks in a pipeline that match oldStage.
 * Used when renaming a pipeline column — single DB call.
 */
export const useBatchUpdateTaskStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pipelineId,
      oldStage,
      newStage,
    }: {
      pipelineId: string;
      oldStage: string;
      newStage: string;
    }) => {
      const { error } = await supabase
        .from("crm_tasks")
        .update({ stage: newStage })
        .eq("pipeline_id", pipelineId)
        .eq("stage", oldStage);
      if (error) throw error;
    },
    onSuccess: (_, { pipelineId }) => {
      qc.invalidateQueries({ queryKey: ["crm_tasks", pipelineId] });
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
  const { ownerUserId } = useStaffPermissions();
  return useMutation({
    mutationFn: async ({ contactId, body }: { contactId: string; body: string }) => {
      const { data, error } = await supabase
        .from("crm_contact_notes")
        .insert({ contact_id: contactId, user_id: ownerUserId!, body })
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

export const useLandingProfile = () =>
  useQuery({
    queryKey: ["landing_profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_business_profile")
        .select("user_id, landing_calendar_id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { user_id: string; landing_calendar_id: string | null } | null;
    },
  });

export const useLandingServices = (userId?: string | null) =>
  useQuery({
    queryKey: ["landing_services", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("crm_services")
        .select("*")
        .eq("user_id", userId)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CrmService[];
    },
    enabled: !!userId,
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
      // Use the actual last day of the month — PostgreSQL rejects invalid dates like "2026-04-31"
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
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
        .select("color_primary, color_secondary, color_accent, logo_url, theme")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return null; // Non-critical — fall back to defaults
      return data as { color_primary: string; color_secondary: string; color_accent: string; logo_url: string | null; theme: string } | null;
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
      // data contains the actual JSON body even on non-2xx; check it first for a real message
      if (data?.error) {
        const err = new Error(data.error) as Error & { alreadyExists?: boolean };
        if (data.error === "Client account already exists") err.alreadyExists = true;
        throw err;
      }
      if (error) throw error;
      return data as { account_id: string; client_user_id: string; email: string; reactivated?: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_client_accounts"] });
    },
    onError: (err: Error & { alreadyExists?: boolean }) => {
      // Account existed before cache knew about it — refresh so UI reflects real state
      if (err.alreadyExists) {
        qc.invalidateQueries({ queryKey: ["crm_client_accounts"] });
      }
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

export const useInviteStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (staff_id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const dbUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${dbUrl}/functions/v1/invite-staff-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ staff_id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al enviar invitación");
      return json as { success?: boolean; linked?: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_staff"] });
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
  const { ownerUserId } = useStaffPermissions();
  return useMutation({
    mutationFn: async (reminder: Omit<CrmReminder, "id" | "created_at" | "user_id" | "status" | "sent_at" | "error">) => {
      const { data, error } = await supabase
        .from("crm_reminders")
        .insert({ ...reminder, user_id: ownerUserId!, status: "pending" })
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
