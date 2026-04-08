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
} from "@/lib/supabase";
import { useCurrentUser } from "./useAuth";

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_contacts"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_contacts"] }),
  });
};

export const useDeleteContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_contacts"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_appointments"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_appointments"] }),
  });
};

export const useDeleteAppointment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_appointments"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_blocked_slots"] }),
  });
};

export const useDeleteBlockedSlot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_blocked_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_blocked_slots"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_pipeline_deals"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_pipeline_deals"] }),
  });
};

export const useDeleteDeal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_pipeline_deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_pipeline_deals"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_forms"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_forms"] }),
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
        .order("created_at", { ascending: false });
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_services"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_services"] }),
  });
};

export const useDeleteService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_services"] }),
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

export const useCalendarConfig = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_calendar_config", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_calendar_config")
        .select("*")
        .single();
      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
      return (data as CrmCalendarConfig) ?? null;
    },
    enabled: !!user,
  });
};

export const useUpsertCalendarConfig = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (config: Partial<CrmCalendarConfig>) => {
      const { data, error } = await supabase
        .from("crm_calendar_config")
        .upsert({ ...config, user_id: user!.id }, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data as CrmCalendarConfig;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_calendar_config"] }),
  });
};
