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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["crm_contacts"] });
      logAction("delete", "Contacto", "Contacto eliminado", id);
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
      logAction("create", "Cita", `Cita agendada: ${data.date} ${data.hour}h`, data.id);
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["crm_appointments"] });
      logAction("delete", "Cita", "Cita eliminada", id);
    },
  });
};

// ─── BLOCKED SLOTS ─────────────────────────────────────────────

export const useBlockedSlots = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_blocked_slots", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_blocked_slots")
        .select("*")
        .order("created_at", { ascending: false });
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_blocked_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["crm_blocked_slots"] });
      logAction("delete", "Bloqueo", "Bloqueo de horario eliminado", id);
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_pipeline_deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["crm_pipeline_deals"] });
      logAction("delete", "Deal", "Deal eliminado", id);
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_forms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["crm_forms"] });
      logAction("delete", "Formulario", "Formulario eliminado", id);
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["crm_services"] });
      logAction("delete", "Servicio", "Servicio eliminado", id);
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_sales"] }),
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

/** @deprecated Use useCalendars() instead */
export const useCalendarConfig = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_calendar_config", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_calendar_config")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1);
      if (error) throw error;
      return ((data ?? [])[0] as CrmCalendarConfig) ?? null;
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
