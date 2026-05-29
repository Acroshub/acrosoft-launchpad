import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, supabasePublic } from "@/lib/supabase";
import type {
  CrmContact,
  CrmAppointment,
  CrmBlockedSlot,
  CrmPipelineDeal,
  CrmForm,
  CrmFormSubmission,
  CrmService,
  CrmProduct,
  CrmProductVariant,
  CrmCatalog,
  CrmCatalogProduct,
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
  CrmLog,
  SupportNotificationRecipient,
  CrmVideoCourse,
  CrmVideoModule,
  CrmVideo,
  CrmVendor,
  CrmVendorLinks,
  CrmMaintenancePayment,
  CrmAIAgentConfig,
  CrmWaConversation,
  CrmWaMessage,
  CrmWaLabel,
  CrmWaSequence,
  SequenceStep,
  CrmWaFlow,
  CrmWaFlowFinalAction,
  CrmPaymentMethod,
  CrmGoogleEvent,
  CrmSaasAccess,
  CrmCourse,
  CrmCourseModule,
  CrmCourseLesson,
  CrmCourseAccess,
  CrmPrice,
  CrmEntityFaq,
  CrmWaTemplate,
  WaTemplateContext,
  WaTemplateButton,
  CrmWaCampaign,
  CrmWaCampaignLog,
  CrmWaInstantCampaign,
  CrmWaInstantCampaignLog,
  WaVarMap,
  WaAudienceFilter,
  WaCampaignStatus,
} from "@/lib/supabase";
import { useCurrentUser, useStaffPermissions } from "./useAuth";

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

export const useInsertLog = () => {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      action: "create" | "update" | "delete";
      entity: string;
      entity_id?: string | null;
      description?: string | null;
    }) => {
      if (!user) return;
      const { error } = await supabase.from("crm_logs").insert({
        ...payload,
        user_id: user.id,
        performed_by_user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_logs"] }),
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

function syncToGoogle(appointment_id: string, action: "create" | "update" | "delete") {
  supabase.functions.invoke("sync-to-google", { body: { appointment_id, action } })
    .catch((e) => console.warn("sync-to-google (non-fatal):", e));
}

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
      syncToGoogle(data.id, "create");
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
      syncToGoogle(data.id, data.status === "cancelled" ? "delete" : "update");
    },
  });
};

export const useDeleteAppointment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      // Sync deletion to Google before removing from DB (needs google_event_id)
      await supabase.functions.invoke("sync-to-google", { body: { appointment_id: id, action: "delete" } })
        .catch(() => {});
      const { error } = await supabase.from("crm_appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, name }) => {
      qc.invalidateQueries({ queryKey: ["crm_appointments"] });
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
    },
  });
};

// ─── FORMS ─────────────────────────────────────────────────────

export const useForms = () => {
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  return useQuery({
    queryKey: ["crm_forms", ownerUserId ?? user?.id],
    queryFn: async () => {
      const uid = ownerUserId ?? user!.id;
      const { data, error } = await supabase
        .from("crm_forms")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmForm[];
    },
    enabled: !!(ownerUserId ?? user?.id),
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
    },
  });
};

// ─── SERVICES ──────────────────────────────────────────────────

export const useServices = () => {
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  return useQuery({
    queryKey: ["crm_services", ownerUserId ?? user?.id],
    queryFn: async () => {
      const uid = ownerUserId ?? user!.id;
      const { data, error } = await supabase
        .from("crm_services")
        .select("*")
        .eq("user_id", uid)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CrmService[];
    },
    enabled: !!(ownerUserId ?? user?.id),
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
        .select("*, crm_products(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Aplanar el nombre del producto para acceso directo
      return (data ?? []).map((s: any) => ({
        ...s,
        product_name: s.crm_products?.name ?? null,
        crm_products: undefined,
      })) as CrmSale[];
    },
    enabled: !!user,
  });
};

export const useCreateSale = () => {
  const qc = useQueryClient();
  const { ownerUserId } = useStaffPermissions();
  return useMutation({
    mutationFn: async (sale: Partial<CrmSale>) => {
      let isVip = sale.is_vip ?? false;
      if (!isVip && sale.contact_id) {
        const { data: contact } = await supabase
          .from("crm_contacts")
          .select("tags")
          .eq("id", sale.contact_id)
          .single();
        if (contact?.tags && (contact.tags as string[]).includes("VIP")) {
          isVip = true;
        }
      }
      const { data, error } = await supabase
        .from("crm_sales")
        .insert({ ...sale, user_id: ownerUserId!, is_vip: isVip })
        .select()
        .single();
      if (error) throw error;

      // Decrementar stock — la alerta de poco stock se dispara automáticamente
      // vía trigger de Postgres (trg_stock_alert_variants / trg_stock_alert_products)
      if (sale.product_id) {
        supabase.rpc("decrement_sale_stock", {
          p_product_id: sale.product_id,
          p_variant_id: sale.product_variant_id ?? null,
        }).catch(() => {});
      }

      return data as CrmSale;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm_sales"] });
    },
  });
};

export const useAiPendingSales = () => {
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  return useQuery({
    queryKey: ["ai_pending_sales", ownerUserId ?? user?.id],
    queryFn: async () => {
      const uid = ownerUserId ?? user?.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from("crm_sales")
        .select("id, amount, currency, product_name, service_name, wa_conversation_id, created_at, product_id, is_ai_sale, status")
        .eq("user_id", uid)
        .eq("is_ai_sale", true)
        .eq("status", "pending_review")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CrmSale[];
    },
    enabled: !!(ownerUserId ?? user?.id),
    refetchInterval: 30_000,
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
      qc.invalidateQueries({ queryKey: ["ai_pending_sales"] });
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
    },
  });
};

// ─── CALENDAR CONFIG ───────────────────────────────────────────

/** Returns calendars owned by the admin (excludes SaaS client calendars that have a contact_id) */
export const useCalendars = () => {
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  return useQuery({
    queryKey: ["crm_calendar_config", ownerUserId ?? user?.id],
    queryFn: async () => {
      const uid = ownerUserId ?? user!.id;
      const { data, error } = await supabase
        .from("crm_calendar_config")
        .select("*")
        .eq("user_id", uid)
        .is("contact_id", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CrmCalendarConfig[];
    },
    enabled: !!(ownerUserId ?? user?.id),
  });
};

export const useGoogleEvents = (calendarConfigId: string | null | undefined) => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_google_events", calendarConfigId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("crm_google_events")
        .select("*")
        .eq("calendar_config_id", calendarConfigId!)
        .gte("end_at", now)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CrmGoogleEvent[];
    },
    enabled: !!(user?.id && calendarConfigId),
    refetchInterval: 5 * 60 * 1000, // refetch every 5 min
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
        .eq("user_id", user!.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
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
      const { data, error } = await supabasePublic
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
      const { data, error } = await supabasePublic
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
    staleTime: 10 * 60 * 1000, // 10 min — keeps data during page navigation
    queryFn: async () => {
      const { data, error } = await supabasePublic
        .from("crm_business_profile")
        .select("user_id, landing_calendar_id, vip_calendar_id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { user_id: string; landing_calendar_id: string | null; vip_calendar_id: string | null } | null;
    },
  });

// Self-contained: resolves admin user_id internally so it never depends on
// a parent query completing first. Always fires immediately on mount.
export const useLandingServices = () =>
  useQuery({
    queryKey: ["landing_services"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data: profile } = await supabasePublic
        .from("crm_business_profile")
        .select("user_id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!profile?.user_id) return [];
      const { data, error } = await supabasePublic
        .from("crm_services")
        .select("*")
        .eq("user_id", profile.user_id)
        .eq("active", true)
        .eq("show_on_landing", true)
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
      const { data, error } = await supabasePublic
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
      const { data, error } = await supabasePublic
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
      const { data, error } = await supabasePublic
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
      const { data, error } = await supabasePublic
        .from("crm_business_profile")
        .select("color_primary, color_secondary, color_accent, logo_url, theme, timezone")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return null; // Non-critical — fall back to defaults
      return data as { color_primary: string; color_secondary: string; color_accent: string; logo_url: string | null; theme: string; timezone: string | null } | null;
    },
    enabled: !!userId,
  });

// ─── CLIENT ACCOUNTS ──────────────────────────────────────────────────────────

// Used by SaaS clients to check their own account status (e.g. disabled gate)
export const useMyClientAccount = () => {
  const { user } = useCurrentUser();
  const isSaasClient = user?.user_metadata?.account_type === "saas_client";
  return useQuery({
    queryKey: ["my_client_account", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_client_accounts")
        .select("id, status, admin_user_id")
        .eq("client_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; status: string; admin_user_id: string } | null;
    },
    enabled: !!user && isSaasClient,
  });
};

export const useClientAccounts = () => {
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  const uid = ownerUserId ?? user?.id;
  return useQuery({
    queryKey: ["crm_client_accounts", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_client_accounts")
        .select("*")
        .eq("admin_user_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmClientAccount[];
    },
    enabled: !!uid,
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

// ─── VIDEO COURSES ─────────────────────────────────────────────────────────────

export const useVideoCourses = () =>
  useQuery({
    queryKey: ["video_courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_video_courses")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CrmVideoCourse[];
    },
  });

export const useVideoModules = (courseId: string | null) =>
  useQuery({
    queryKey: ["video_modules", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_video_modules")
        .select("*")
        .eq("course_id", courseId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as CrmVideoModule[];
    },
    enabled: !!courseId,
  });

export const useVideosForCourse = (courseId: string | null) =>
  useQuery({
    queryKey: ["crm_videos", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_videos")
        .select("*")
        .eq("course_id", courseId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as CrmVideo[];
    },
    enabled: !!courseId,
  });

export const useCreateVideoCourse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<CrmVideoCourse, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("crm_video_courses")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as CrmVideoCourse;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video_courses"] }),
  });
};

export const useUpdateVideoCourse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CrmVideoCourse> & { id: string }) => {
      const { data, error } = await supabase
        .from("crm_video_courses")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CrmVideoCourse;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video_courses"] }),
  });
};

export const useDeleteVideoCourse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_video_courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video_courses"] }),
  });
};

export const useCreateVideoModule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<CrmVideoModule, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("crm_video_modules")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as CrmVideoModule;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["video_modules", vars.course_id] }),
  });
};

export const useUpdateVideoModule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, course_id, ...payload }: Partial<CrmVideoModule> & { id: string; course_id: string }) => {
      const { data, error } = await supabase
        .from("crm_video_modules")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CrmVideoModule;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["video_modules", vars.course_id] }),
  });
};

export const useDeleteVideoModule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, course_id }: { id: string; course_id: string }) => {
      const { error } = await supabase.from("crm_video_modules").delete().eq("id", id);
      if (error) throw error;
      return course_id;
    },
    onSuccess: (courseId) => qc.invalidateQueries({ queryKey: ["video_modules", courseId] }),
  });
};

export const useCreateVideo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<CrmVideo, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("crm_videos")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as CrmVideo;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["crm_videos", vars.course_id] }),
  });
};

export const useUpdateVideo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, course_id, ...payload }: Partial<CrmVideo> & { id: string; course_id: string }) => {
      const { data, error } = await supabase
        .from("crm_videos")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CrmVideo;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["crm_videos", vars.course_id] }),
  });
};

export const useDeleteVideo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, course_id }: { id: string; course_id: string }) => {
      const { error } = await supabase.from("crm_videos").delete().eq("id", id);
      if (error) throw error;
      return course_id;
    },
    onSuccess: (courseId) => qc.invalidateQueries({ queryKey: ["crm_videos", courseId] }),
  });
};

export const useAllContactTags = () =>
  useQuery({
    queryKey: ["crm_contact_tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("tags");
      if (error) throw error;
      const unique = [...new Set((data ?? []).flatMap((c: { tags: string[] }) => c.tags ?? []))].sort();
      return unique;
    },
  });

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
      // Enqueue for processing — RLS allows insert when reminder belongs to current user
      const { error: qErr } = await supabase
        .from("crm_reminder_queue")
        .insert({ reminder_id: (data as CrmReminder).id });
      if (qErr) console.error("crm_reminder_queue insert failed:", qErr.message);
      return data as CrmReminder;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_reminders"] });
      qc.invalidateQueries({ queryKey: ["crm_reminders_personal"] });
    },
  });
};

export const useDeleteReminder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("crm_reminder_queue").delete().eq("reminder_id", id);
      const { error } = await supabase.from("crm_reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_reminders"] });
      qc.invalidateQueries({ queryKey: ["crm_reminders_personal"] });
    },
  });
};

// ─── WHATSAPP CONFIG ────────────────────────────────────────────

export const useWhatsappConfig = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["whatsapp_sessions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_sessions")
        .select("id, status, phone_number")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as { id: string; status: string; phone_number: string | null } | null;
    },
    enabled: !!user,
    refetchInterval: 10_000,
  });
};

/** Returns true only when a WhatsApp session is actively connected */
export const useWhatsappEnabled = () => {
  const { data } = useWhatsappConfig();
  return data?.status === "connected";
};

// ─── SOPORTE ──────────────────────────────────────────────────────────────────

import type { SupportTicket, SupportMessage } from "@/lib/supabase";

export const useMyTickets = (type: "ticket" | "suggestion") => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["support_tickets", user?.id, type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("type", type)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as SupportTicket[];
    },
    enabled: !!user,
  });
};

export const useTicketMessages = (ticketId: string | null) =>
  useQuery({
    queryKey: ["support_messages", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as SupportMessage[];
    },
    enabled: !!ticketId,
    refetchInterval: 15_000,
  });

export const useCreateTicket = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async ({
      type,
      subject,
      content,
      attachments = [],
    }: {
      type: "ticket" | "suggestion";
      subject: string;
      content: string;
      attachments?: string[];
    }) => {
      const { data: ticket, error: tErr } = await supabase
        .from("support_tickets")
        .insert({ user_id: user!.id, type, subject, status: "open" })
        .select()
        .single();
      if (tErr) throw tErr;

      const { error: mErr } = await supabase
        .from("support_messages")
        .insert({
          ticket_id: ticket.id,
          sender_id: user!.id,
          sender_role: "client",
          content,
          attachments,
        });
      if (mErr) throw mErr;
      return ticket as SupportTicket;
    },
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
      qc.invalidateQueries({ queryKey: ["support_messages", ticket.id] });
      // Trigger A — notify admin of new ticket/suggestion (fire-and-forget)
      supabase.functions.invoke("send-support-email", {
        body: { trigger: "new_ticket", ticketId: ticket.id },
      }).catch(() => null);
    },
  });
};

export const useCreateSupportMessage = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async ({
      ticketId,
      content,
      attachments = [],
    }: {
      ticketId: string;
      content: string;
      attachments?: string[];
    }) => {
      const { data, error } = await supabase
        .from("support_messages")
        .insert({
          ticket_id: ticketId,
          sender_id: user!.id,
          sender_role: "client",
          content,
          attachments,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SupportMessage;
    },
    onSuccess: (msg) => {
      qc.invalidateQueries({ queryKey: ["support_messages", msg.ticket_id] });
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
      // Trigger C — notify admin of client reply (fire-and-forget)
      supabase.functions.invoke("send-support-email", {
        body: { trigger: "client_reply", ticketId: msg.ticket_id, messageContent: msg.content },
      }).catch(() => null);
    },
  });
};

export const useMarkTicketSeen = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase.rpc("mark_ticket_seen", { p_ticket_id: ticketId });
      if (error) throw error;
    },
    onSuccess: (_data, ticketId) => {
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
      qc.invalidateQueries({ queryKey: ["support_unread"] });
    },
  });
};

export const useSupportUnreadCount = () => {
  const { user } = useCurrentUser();
  const isSaasClient = user?.user_metadata?.account_type === "saas_client";
  return useQuery({
    queryKey: ["support_unread", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, client_last_seen_at, updated_at")
        .in("status", ["open", "in_progress"]);
      if (error) return 0;
      // Count tickets where admin replied after client last saw them
      return (data ?? []).filter((t) => {
        if (!t.client_last_seen_at) return true;
        return new Date(t.updated_at) > new Date(t.client_last_seen_at);
      }).length;
    },
    enabled: !!user && isSaasClient,
    refetchInterval: 30_000,
  });
};

// ─── SOPORTE — Admin ──────────────────────────────────────────────────────────

const ACROSOFT_ADMIN_EMAIL = "e.daniel.acero.r@gmail.com";

export const useAllTickets = (type: "ticket" | "suggestion") => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["all_support_tickets", type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("type", type)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as SupportTicket[];
    },
    enabled: !!user && user.email === ACROSOFT_ADMIN_EMAIL,
    refetchInterval: 30_000,
  });
};

export const useClientEmailMap = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["client_email_map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_client_accounts")
        .select("client_user_id, client_email");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const a of data ?? []) {
        if (a.client_user_id) map[a.client_user_id] = a.client_email;
      }
      return map;
    },
    enabled: !!user && user.email === ACROSOFT_ADMIN_EMAIL,
  });
};

export const useAdminSendMessage = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async ({ ticketId, content }: { ticketId: string; content: string }) => {
      const { data, error } = await supabase
        .from("support_messages")
        .insert({
          ticket_id: ticketId,
          sender_id: user!.id,
          sender_role: "admin",
          content,
          attachments: [],
        })
        .select()
        .single();
      if (error) throw error;
      return data as SupportMessage;
    },
    onSuccess: (msg) => {
      qc.invalidateQueries({ queryKey: ["support_messages", msg.ticket_id] });
      qc.invalidateQueries({ queryKey: ["all_support_tickets"] });
      // Trigger B — notify client of admin reply (fire-and-forget)
      supabase.functions.invoke("send-support-email", {
        body: { trigger: "admin_reply", ticketId: msg.ticket_id, messageContent: msg.content },
      }).catch(() => null);
    },
  });
};

export const useUpdateTicketStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketId,
      status,
    }: {
      ticketId: string;
      status: SupportTicket["status"];
    }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status })
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_support_tickets"] });
    },
  });
};

export const useAdminUnreadCount = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["admin_support_unread"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user && user.email === ACROSOFT_ADMIN_EMAIL,
    refetchInterval: 30_000,
  });
};

// ─── SOPORTE — Notification Recipients (SP-5) ─────────────────────────────────

export const useNotificationRecipients = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["support_notification_recipients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_notification_recipients")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as SupportNotificationRecipient[];
    },
    enabled: !!user && user.email === ACROSOFT_ADMIN_EMAIL,
  });
};

export const useAddNotificationRecipient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase
        .from("support_notification_recipients")
        .insert({ email, active: true })
        .select()
        .single();
      if (error) throw error;
      return data as SupportNotificationRecipient;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support_notification_recipients"] }),
  });
};

export const useToggleNotificationRecipient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("support_notification_recipients")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support_notification_recipients"] }),
  });
};

export const useDeleteNotificationRecipient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("support_notification_recipients")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support_notification_recipients"] }),
  });
};

// ─── VENDEDORES ───────────────────────────────────────────────────────────────

/** Perfil del vendedor actual (si el usuario logueado es vendedor) */
export const useVendorProfile = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["vendor_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_vendors")
        .select("*")
        .eq("vendor_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as CrmVendor | null;
    },
    enabled: !!user,
  });
};

/** Lista de vendedores del superadmin */
export const useVendors = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["vendors", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_vendors")
        .select("*")
        .eq("owner_user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CrmVendor[];
    },
    enabled: !!user,
  });
};

export const useCreateVendor = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (vendor: { name: string; email: string; whatsapp?: string; commission_pct: number; slug: string }) => {
      const { data, error } = await supabase
        .from("crm_vendors")
        .insert({ ...vendor, owner_user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as CrmVendor;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendors"] }),
  });
};

export const useUpdateVendor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CrmVendor> & { id: string }) => {
      const { error } = await supabase
        .from("crm_vendors")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendors"] }),
  });
};

export const useDeleteVendor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_vendors")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendors"] }),
  });
};

/** Links configurados por el superadmin (para vendedores) */
export const useVendorLinks = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["vendor_links", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_vendor_links")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as CrmVendorLinks | null;
    },
    enabled: !!user,
  });
};

export const useUpsertVendorLinks = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (links: Omit<CrmVendorLinks, "id" | "created_at" | "owner_user_id">) => {
      const { error } = await supabase
        .from("crm_vendor_links")
        .upsert({ ...links, owner_user_id: user!.id }, { onConflict: "owner_user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendor_links"] }),
  });
};

/** Pagos de mantenimiento (superadmin) */
export const useMaintenancePayments = (vendorId?: string) => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["maintenance_payments", user?.id, vendorId],
    queryFn: async () => {
      let q = supabase
        .from("crm_maintenance_payments")
        .select("*")
        .order("month", { ascending: false });
      if (vendorId) q = q.eq("vendor_id", vendorId);
      const { data, error } = await q;
      if (error) throw error;
      return data as CrmMaintenancePayment[];
    },
    enabled: !!user,
  });
};

export const useUpsertMaintenancePayment = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (payment: Omit<CrmMaintenancePayment, "id" | "created_at" | "owner_user_id">) => {
      const { error } = await supabase
        .from("crm_maintenance_payments")
        .upsert({ ...payment, owner_user_id: user!.id }, { onConflict: "vendor_id,month" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance_payments"] }),
  });
};

export const useMarkSalePaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, proof_url }: { id: string; proof_url?: string }) => {
      const { error } = await supabase
        .from("crm_sales")
        .update({ is_paid: true, paid_at: new Date().toISOString(), payment_proof_url: proof_url ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_sales"] }),
  });
};

// ─── AI Agent ─────────────────────────────────────────────────────────────────

export const useAIAgentConfig = (userId?: string) => {
  const { user } = useCurrentUser();
  const effectiveId = userId ?? user?.id;
  return useQuery({
    queryKey: ["crm_ai_agent_config", effectiveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_ai_agent_config")
        .select("*")
        .eq("user_id", effectiveId!)
        .maybeSingle();
      if (error) throw error;
      return data as CrmAIAgentConfig | null;
    },
    enabled: !!effectiveId,
  });
};

export const useUpsertAIAgentConfig = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (updates: Partial<Omit<CrmAIAgentConfig, "id" | "user_id" | "created_at" | "updated_at" | "webhook_verify_token">>) => {
      const { error } = await supabase
        .from("crm_ai_agent_config")
        .upsert({ ...updates, user_id: user!.id }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_ai_agent_config"] }),
  });
};

export const useWaConversations = (userId?: string) => {
  const { user } = useCurrentUser();
  const effectiveId = userId ?? user?.id;
  return useQuery({
    queryKey: ["crm_wa_conversations", effectiveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_wa_conversations")
        .select("*")
        .eq("user_id", effectiveId!)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as CrmWaConversation[];
    },
    enabled: !!effectiveId,
    refetchInterval: 3000,
  });
};

export const useMarkConversationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("crm_wa_conversations")
        .update({ unread_count: 0 })
        .eq("id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_wa_conversations"] }),
  });
};

export const useWaMessages = (conversationId: string | null) => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_wa_messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_wa_messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CrmWaMessage[];
    },
    enabled: !!user && !!conversationId,
    refetchInterval: 3000,
  });
};

export const useSetWaConversationMode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mode }: { id: string; mode: 'AI' | 'HUMAN' }) => {
      const { error } = await supabase
        .from("crm_wa_conversations")
        .update({ mode })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_wa_conversations"] }),
  });
};

export const useDeleteWaConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_wa_conversations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_wa_conversations"] });
      qc.invalidateQueries({ queryKey: ["crm_wa_messages"] });
    },
  });
};

export const useAssignConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, staffId }: { conversationId: string; staffId: string | null }) => {
      const { error } = await supabase
        .from("crm_wa_conversations")
        .update({ assigned_to: staffId })
        .eq("id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_wa_conversations"] }),
  });
};

// ─── WhatsApp Labels ──────────────────────────────────────────────────────────

export const useWaLabels = (userId?: string) => {
  const { user } = useCurrentUser();
  const effectiveId = userId ?? user?.id;
  return useQuery({
    queryKey: ["wa_labels", effectiveId],
    queryFn: async () => {
      if (!effectiveId) return [] as CrmWaLabel[];
      const { data } = await supabase
        .from("crm_wa_labels")
        .select("*")
        .eq("user_id", effectiveId)
        .order("created_at");
      return (data ?? []) as CrmWaLabel[];
    },
    enabled: !!effectiveId,
  });
};

export const useUpsertWaLabel = () => {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (label: { id?: string; name: string; color: string; hint?: string | null; remove_hint?: string | null }) => {
      if (label.id) {
        const { data, error } = await supabase
          .from("crm_wa_labels")
          .update({ name: label.name, color: label.color, hint: label.hint ?? null, remove_hint: label.remove_hint ?? null })
          .eq("id", label.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("crm_wa_labels")
          .insert({ name: label.name, color: label.color, hint: label.hint ?? null, remove_hint: label.remove_hint ?? null, user_id: user!.id })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_labels"] }),
  });
};

export const useDeleteWaLabel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_wa_labels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa_labels"] });
      qc.invalidateQueries({ queryKey: ["wa_conv_labels_all"] });
      qc.invalidateQueries({ queryKey: ["wa_conv_labels"] });
    },
  });
};

export const useAllConversationLabels = (userId?: string) => {
  const { user } = useCurrentUser();
  const effectiveId = userId ?? user?.id;
  return useQuery({
    queryKey: ["wa_conv_labels_all", effectiveId],
    queryFn: async () => {
      if (!effectiveId) return {} as Record<string, CrmWaLabel[]>;
      const { data } = await supabase
        .from("crm_wa_conversation_labels")
        .select("conversation_id, crm_wa_labels(id, name, color, hint, user_id, created_at)");
      const map: Record<string, CrmWaLabel[]> = {};
      for (const row of data ?? []) {
        const label = (row as any).crm_wa_labels as CrmWaLabel | null;
        if (!label) continue;
        const cid = row.conversation_id as string;
        if (!map[cid]) map[cid] = [];
        map[cid].push(label);
      }
      return map;
    },
    enabled: !!effectiveId,
  });
};

export const useConversationLabels = (conversationId?: string) => {
  return useQuery({
    queryKey: ["wa_conv_labels", conversationId],
    queryFn: async () => {
      if (!conversationId) return [] as CrmWaLabel[];
      const { data } = await supabase
        .from("crm_wa_conversation_labels")
        .select("label_id, crm_wa_labels(id, name, color, hint, user_id, created_at)")
        .eq("conversation_id", conversationId);
      return (data ?? []).map((r: any) => r.crm_wa_labels as CrmWaLabel).filter(Boolean);
    },
    enabled: !!conversationId,
  });
};

export const useToggleConversationLabel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, labelId, active }: { conversationId: string; labelId: string; active: boolean }) => {
      if (active) {
        await supabase
          .from("crm_wa_conversation_labels")
          .upsert({ conversation_id: conversationId, label_id: labelId }, { ignoreDuplicates: true });
      } else {
        await supabase
          .from("crm_wa_conversation_labels")
          .delete()
          .eq("conversation_id", conversationId)
          .eq("label_id", labelId);
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["wa_conv_labels", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["wa_conv_labels_all"] });
    },
  });
};

// ─── Payment Methods ──────────────────────────────────────────────────────────

export const usePaymentMethods = (entityType: string, entityId: string | null) => {
  return useQuery({
    queryKey: ["payment_methods", entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [] as CrmPaymentMethod[];
      const { data, error } = await supabase
        .from("crm_payment_methods")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CrmPaymentMethod[];
    },
    enabled: !!entityId,
  });
};

export const useUpsertPaymentMethod = () => {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pm: Omit<CrmPaymentMethod, "id" | "created_at" | "user_id"> & { id?: string }) => {
      if (pm.id) {
        const { data, error } = await supabase
          .from("crm_payment_methods")
          .update({ type: pm.type, label: pm.label, content: pm.content, sort_order: pm.sort_order })
          .eq("id", pm.id)
          .select()
          .single();
        if (error) throw error;
        return data as CrmPaymentMethod;
      } else {
        const { data, error } = await supabase
          .from("crm_payment_methods")
          .insert({ ...pm, user_id: user!.id })
          .select()
          .single();
        if (error) throw error;
        return data as CrmPaymentMethod;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["payment_methods", vars.entity_type, vars.entity_id] });
    },
  });
};

export const useDeletePaymentMethod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, entityType, entityId }: { id: string; entityType: string; entityId: string }) => {
      const { error } = await supabase.from("crm_payment_methods").delete().eq("id", id);
      if (error) throw error;
      return { entityType, entityId };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["payment_methods", vars.entityType, vars.entityId] });
    },
  });
};

export const useSearchWaMessages = (query: string) => {
  return useQuery({
    queryKey: ["wa_message_search", query],
    queryFn: async () => {
      if (query.length < 3) return [];
      const { data } = await supabase
        .from("crm_wa_messages")
        .select("id, content, created_at, role, conversation_id, crm_wa_conversations(id, contact_name, phone)")
        .ilike("content", `%${query}%`)
        .not("content", "ilike", "[notif]%")
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as Array<{
        id: string;
        content: string;
        created_at: string;
        role: string;
        conversation_id: string;
        crm_wa_conversations: { id: string; contact_name: string | null; phone: string } | null;
      }>;
    },
    enabled: query.length >= 3,
    staleTime: 30_000,
  });
};

// ─── Catálogos ────────────────────────────────────────────────────────────────

export const useCatalogs = (userId?: string) => {
  const { user } = useCurrentUser();
  const effectiveId = userId ?? user?.id;
  return useQuery({
    queryKey: ["crm_catalogs", effectiveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_catalogs")
        .select("*")
        .eq("user_id", effectiveId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CrmCatalog[];
    },
    enabled: !!effectiveId,
  });
};

export const useUpsertCatalog = () => {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (catalog: Partial<CrmCatalog> & { name: string; slug: string }) => {
      if (catalog.id) {
        const { data, error } = await supabase
          .from("crm_catalogs")
          .update({ name: catalog.name, description: catalog.description, slug: catalog.slug, cover_image: catalog.cover_image, is_active: catalog.is_active, whatsapp_number: catalog.whatsapp_number ?? null })
          .eq("id", catalog.id).select().single();
        if (error) throw error;
        return data as CrmCatalog;
      } else {
        const { data, error } = await supabase
          .from("crm_catalogs")
          .insert({ name: catalog.name, description: catalog.description ?? null, slug: catalog.slug, cover_image: catalog.cover_image ?? null, is_active: catalog.is_active ?? true, whatsapp_number: catalog.whatsapp_number ?? null, user_id: user!.id })
          .select().single();
        if (error) throw error;
        return data as CrmCatalog;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_catalogs"] }),
  });
};

export const useDeleteCatalog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_catalogs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_catalogs"] }),
  });
};

// ─── Productos ────────────────────────────────────────────────────────────────

export const useProducts = (userId?: string) => {
  const { user } = useCurrentUser();
  const effectiveId = userId ?? user?.id;
  return useQuery({
    queryKey: ["crm_products", effectiveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_products")
        .select("*")
        .eq("user_id", effectiveId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CrmProduct[];
    },
    enabled: !!effectiveId,
  });
};

// Carga todas las variantes del tenant en una sola query — para mostrar stock total en lista de productos
export const useAllProductVariants = (userId?: string) => {
  const { user } = useCurrentUser();
  const effectiveId = userId ?? user?.id;
  return useQuery({
    queryKey: ["crm_all_product_variants", effectiveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_product_variants")
        .select("id, product_id, stock, crm_products!inner(user_id, has_variants)")
        .eq("crm_products.user_id", effectiveId!)
        .eq("crm_products.has_variants", true);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id as string,
        product_id: r.product_id as string,
        stock: r.stock as number | null,
      }));
    },
    enabled: !!effectiveId,
  });
};

export const useCatalogProducts = (catalogId: string | null) => {
  return useQuery({
    queryKey: ["crm_catalog_products", catalogId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_catalog_products")
        .select("product_id, sort_order, crm_products(*)")
        .eq("catalog_id", catalogId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => r.crm_products as CrmProduct).filter(Boolean);
    },
    enabled: !!catalogId,
  });
};

export const useProductCatalogIds = (productId: string | null) => {
  return useQuery({
    queryKey: ["crm_product_catalog_ids", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_catalog_products")
        .select("catalog_id")
        .eq("product_id", productId!);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.catalog_id as string);
    },
    enabled: !!productId,
  });
};

export const useUpsertProduct = () => {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: Partial<CrmProduct> & { name: string; price: number }) => {
      if (product.id) {
        const { id, user_id, created_at, updated_at, ...updates } = product as any;
        // Resetear flags de notificación según umbral correcto:
        // notified_low_stock → solo cuando sube POR ENCIMA de 5 (ya no está en zona baja)
        // notified_out_of_stock → cuando sube por encima de 0
        if (typeof updates.stock === "number") {
          if (updates.stock > 5) updates.notified_low_stock = false;
          if (updates.stock > 0) updates.notified_out_of_stock = false;
        }
        const { data, error } = await supabase
          .from("crm_products")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", product.id).select().single();
        if (error) throw error;
        return data as CrmProduct;
      } else {
        const { id, user_id, created_at, updated_at, ...rest } = product as any;
        const { data, error } = await supabase
          .from("crm_products")
          .insert({ ...rest, user_id: user!.id })
          .select().single();
        if (error) throw error;
        return data as CrmProduct;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_products"] });
      qc.invalidateQueries({ queryKey: ["crm_catalog_products"] });
      qc.invalidateQueries({ queryKey: ["crm_orphan_products"] });
    },
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_products"] });
      qc.invalidateQueries({ queryKey: ["crm_catalog_products"] });
      qc.invalidateQueries({ queryKey: ["crm_orphan_products"] });
    },
  });
};

export const useToggleCatalogProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ catalogId, productId, add }: { catalogId: string; productId: string; add: boolean }) => {
      if (add) {
        const { count } = await supabase
          .from("crm_catalog_products")
          .select("*", { count: "exact", head: true })
          .eq("catalog_id", catalogId);
        await supabase.from("crm_catalog_products")
          .upsert({ catalog_id: catalogId, product_id: productId, sort_order: count ?? 0 }, { ignoreDuplicates: true });
      } else {
        await supabase.from("crm_catalog_products")
          .delete().eq("catalog_id", catalogId).eq("product_id", productId);
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["crm_catalog_products", vars.catalogId] });
      qc.invalidateQueries({ queryKey: ["crm_product_catalog_ids", vars.productId] });
      qc.invalidateQueries({ queryKey: ["crm_orphan_products"] });
    },
  });
};

// ─── Variantes ────────────────────────────────────────────────────────────────

export const useProductVariants = (productId: string | null) => {
  return useQuery({
    queryKey: ["crm_product_variants", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_product_variants")
        .select("*")
        .eq("product_id", productId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CrmProductVariant[];
    },
    enabled: !!productId,
  });
};

export const useUpsertProductVariant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (variant: Partial<CrmProductVariant> & { product_id: string; name: string }) => {
      if (variant.id) {
        // Resetear flags de notificación según umbral correcto:
        // notified_low_stock → solo cuando sube POR ENCIMA de 5
        // notified_out_of_stock → cuando sube por encima de 0
        const stockResetFields: Record<string, boolean> = {};
        if (typeof variant.stock === "number") {
          if (variant.stock > 5) stockResetFields.notified_low_stock = false;
          if (variant.stock > 0) stockResetFields.notified_out_of_stock = false;
        }
        const { data, error } = await supabase
          .from("crm_product_variants")
          .update({ name: variant.name, price_override: variant.price_override ?? null, discount_pct: variant.discount_pct ?? 0, stock: variant.stock ?? null, sort_order: variant.sort_order ?? 0, ...stockResetFields })
          .eq("id", variant.id).select().single();
        if (error) throw error;
        return data as CrmProductVariant;
      } else {
        const { data, error } = await supabase
          .from("crm_product_variants")
          .insert({ product_id: variant.product_id, name: variant.name, price_override: variant.price_override ?? null, discount_pct: variant.discount_pct ?? 0, stock: variant.stock ?? null, sort_order: variant.sort_order ?? 0 })
          .select().single();
        if (error) throw error;
        return data as CrmProductVariant;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["crm_product_variants", vars.product_id ?? vars.id] });
      qc.invalidateQueries({ queryKey: ["crm_all_product_variants"] });
    },
  });
};

export const useDeleteProductVariant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase.from("crm_product_variants").delete().eq("id", id);
      if (error) throw error;
      return { productId };
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["crm_product_variants", vars.productId] }),
  });
};

export const useOrphanProducts = (userId?: string) => {
  const { user } = useCurrentUser();
  const effectiveId = userId ?? user?.id;
  return useQuery({
    queryKey: ["crm_orphan_products", effectiveId],
    queryFn: async () => {
      const { data: inCatalog } = await supabase
        .from("crm_catalog_products")
        .select("product_id");
      const inCatalogIds = new Set((inCatalog ?? []).map((r: any) => r.product_id as string));
      const { data, error } = await supabase
        .from("crm_products")
        .select("*")
        .eq("user_id", effectiveId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as CrmProduct[]).filter(p => !inCatalogIds.has(p.id));
    },
    enabled: !!effectiveId,
  });
};

// Retorna mapa catalogId -> productId[] para agrupar productos por catálogo en UI
export const useCatalogProductsMap = (userId?: string) => {
  const { user } = useCurrentUser();
  const effectiveId = userId ?? user?.id;
  return useQuery({
    queryKey: ["crm_catalog_products_map", effectiveId],
    queryFn: async () => {
      // Primero obtenemos los IDs de catálogos del usuario
      const { data: catalogs } = await supabase
        .from("crm_catalogs")
        .select("id")
        .eq("user_id", effectiveId!);
      if (!catalogs?.length) return new Map<string, string[]>();

      const catalogIds = catalogs.map((c: any) => c.id as string);
      const { data, error } = await supabase
        .from("crm_catalog_products")
        .select("catalog_id, product_id")
        .in("catalog_id", catalogIds);
      if (error) throw error;

      const map = new Map<string, string[]>();
      for (const row of (data ?? [])) {
        const cid = (row as any).catalog_id as string;
        const pid = (row as any).product_id as string;
        if (!map.has(cid)) map.set(cid, []);
        map.get(cid)!.push(pid);
      }
      return map;
    },
    enabled: !!effectiveId,
  });
};

// ─── Onboarding status ────────────────────────────────────────────────────────
export const useOnboardingStatus = () => {
  const { data: profile } = useBusinessProfile();
  const { data: services = [] } = useServices();
  const { data: products = [] } = useProducts();

  const flags = (profile?.onboarding_flags ?? {}) as Record<string, boolean>;

  const step1 = !!(profile?.first_name && profile?.last_name && profile?.contact_email && profile?.contact_phone);
  const step2 = !!(profile?.business_name && profile?.description);
  const step3 = !!profile?.logo_url || !!flags.logo_skipped;
  const step4 = services.length > 0 || products.length > 0 || !!flags.catalog_skipped;

  const allDone = step1 && step2 && step3 && step4;
  const requiredDone = step1 && step2;
  const completed = [step1, step2, step3, step4].filter(Boolean).length;

  return { step1, step2, step3, step4, allDone, requiredDone, completed, flags, profile };
};

// ─── B18-1 · Acceso SaaS ─────────────────────────────────────────────────────

export const useSaasAccess = (contactId: string | null) => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_saas_access", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_saas_access")
        .select("*, plan:crm_services(id, name, price, currency)")
        .eq("contact_id", contactId!)
        .maybeSingle();
      if (error) throw error;
      return data as CrmSaasAccess | null;
    },
    enabled: !!contactId && !!user,
  });
};

export const useActivateSaasClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      contact_id: string;
      plan_id?: string | null;
      starts_at?: string;
      expires_at?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase.functions.invoke("activate-saas-client", {
        body: payload,
      });
      if (data?.error) throw new Error(data.error);
      if (error) throw error;
      return data as { success: boolean; client_user_id: string; is_new_user: boolean };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["crm_saas_access", variables.contact_id] });
      qc.invalidateQueries({ queryKey: ["crm_client_accounts"] });
    },
  });
};

export const useUpdateSaasAccess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      contact_id: string;
      status?: 'active' | 'suspended';
      plan_id?: string | null;
      starts_at?: string;
      expires_at?: string | null;
      notes?: string | null;
    }) => {
      const { contact_id, ...fields } = payload;

      // 1. Actualizar crm_saas_access
      const { data, error } = await supabase
        .from("crm_saas_access")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("contact_id", contact_id)
        .select()
        .single();
      if (error) throw error;

      // 2. Sincronizar crm_client_accounts — esto controla el acceso real al CRM
      if (payload.status === 'suspended') {
        await supabase
          .from("crm_client_accounts")
          .update({ status: "disabled", disabled_at: new Date().toISOString() })
          .eq("contact_id", contact_id);
      } else if (payload.status === 'active') {
        await supabase
          .from("crm_client_accounts")
          .update({ status: "active", disabled_at: null })
          .eq("contact_id", contact_id);
      }

      return data as CrmSaasAccess;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["crm_saas_access", variables.contact_id] });
      qc.invalidateQueries({ queryKey: ["crm_client_accounts"] });
    },
  });
};

// ─── B18-4: WA Sequences (Secuencias de Mensajes) ────────────────────────────

export const useWaSequences = (userId?: string) => {
  const { user } = useCurrentUser();
  const effectiveId = userId ?? user?.id;
  return useQuery({
    queryKey: ["wa_sequences", effectiveId],
    queryFn: async () => {
      if (!effectiveId) return [] as CrmWaSequence[];
      const { data } = await supabase
        .from("crm_wa_sequences")
        .select("*")
        .eq("user_id", effectiveId)
        .order("created_at");
      return (data ?? []) as CrmWaSequence[];
    },
    enabled: !!effectiveId,
  });
};

export const useUpsertWaSequence = () => {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (seq: { id?: string; name: string; product_id: string | null; steps: SequenceStep[] }) => {
      if (seq.id) {
        const { data, error } = await supabase
          .from("crm_wa_sequences")
          .update({ name: seq.name, product_id: seq.product_id, steps: seq.steps, updated_at: new Date().toISOString() })
          .eq("id", seq.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("crm_wa_sequences")
          .insert({ name: seq.name, product_id: seq.product_id, steps: seq.steps, user_id: user!.id })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_sequences"] }),
  });
};

export const useDeleteWaSequence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_wa_sequences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_sequences"] }),
  });
};

// ─── B18-5: WA Flows (Flow Builder) ──────────────────────────────────────────

export const useWaFlows = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["wa_flows", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as CrmWaFlow[];
      const { data } = await supabase
        .from("crm_wa_flows")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at");
      return (data ?? []) as CrmWaFlow[];
    },
    enabled: !!user?.id,
  });
};

export const useUpsertWaFlow = () => {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (flow: {
      id?: string
      name: string
      trigger_text: string
      sequence_id: string | null
      final_action: CrmWaFlowFinalAction
      is_active: boolean
      trigger_once: boolean
      flow_trigger_type: "new_conversation" | "intent"
    }) => {
      if (flow.id) {
        const { data, error } = await supabase
          .from("crm_wa_flows")
          .update({
            name: flow.name,
            trigger_text: flow.trigger_text,
            sequence_id: flow.sequence_id,
            final_action: flow.final_action,
            is_active: flow.is_active,
            trigger_once: flow.trigger_once,
            flow_trigger_type: flow.flow_trigger_type,
            updated_at: new Date().toISOString(),
          })
          .eq("id", flow.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("crm_wa_flows")
          .insert({
            name: flow.name,
            trigger_text: flow.trigger_text,
            sequence_id: flow.sequence_id,
            final_action: flow.final_action,
            is_active: flow.is_active,
            trigger_once: flow.trigger_once,
            flow_trigger_type: flow.flow_trigger_type,
            user_id: user!.id,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_flows"] }),
  });
};

export const useDeleteWaFlow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_wa_flows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_flows"] }),
  });
};

export const useToggleWaFlow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("crm_wa_flows")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_flows"] }),
  });
};

// ─── Cursos ───────────────────────────────────────────────────────────────────

export const useCourses = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["crm_courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_courses")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CrmCourse[];
    },
    enabled: !!user,
  });
};

export const useUpsertCourse = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (course: Partial<Omit<CrmCourse, "user_id" | "created_at">> & { id?: string }) => {
      const payload = { ...course, user_id: user!.id, updated_at: new Date().toISOString() };
      if (course.id) {
        const { data, error } = await supabase.from("crm_courses").update(payload).eq("id", course.id).select().single();
        if (error) throw error;
        return data as CrmCourse;
      }
      const { data, error } = await supabase.from("crm_courses").insert(payload).select().single();
      if (error) throw error;
      return data as CrmCourse;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_courses"] }),
  });
};

export const useDeleteCourse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_courses"] }),
  });
};

export const useCourseModules = (courseId: string | null) =>
  useQuery({
    queryKey: ["crm_course_modules", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_course_modules")
        .select("*")
        .eq("course_id", courseId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CrmCourseModule[];
    },
    enabled: !!courseId,
  });

export const useUpsertCourseModule = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (mod: Partial<Omit<CrmCourseModule, "user_id" | "created_at">> & { course_id: string }) => {
      const payload = { ...mod, user_id: user!.id };
      if (mod.id) {
        const { data, error } = await supabase.from("crm_course_modules").update(payload).eq("id", mod.id).select().single();
        if (error) throw error;
        return data as CrmCourseModule;
      }
      const { data, error } = await supabase.from("crm_course_modules").insert(payload).select().single();
      if (error) throw error;
      return data as CrmCourseModule;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["crm_course_modules", vars.course_id] }),
  });
};

export const useDeleteCourseModule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await supabase.from("crm_course_modules").delete().eq("id", id);
      if (error) throw error;
      return courseId;
    },
    onSuccess: (courseId) => {
      qc.invalidateQueries({ queryKey: ["crm_course_modules", courseId] });
      qc.invalidateQueries({ queryKey: ["crm_course_lessons", courseId] });
    },
  });
};

export const useCourseLessons = (courseId: string | null) => {
  return useQuery({
    queryKey: ["crm_course_lessons", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_course_lessons")
        .select("*")
        .eq("course_id", courseId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CrmCourseLesson[];
    },
    enabled: !!courseId,
  });
};

export const useUpsertCourseLesson = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lesson: Partial<Omit<CrmCourseLesson, "created_at">> & { course_id: string }) => {
      if (lesson.id) {
        const { data, error } = await supabase.from("crm_course_lessons").update(lesson).eq("id", lesson.id).select().single();
        if (error) throw error;
        return data as CrmCourseLesson;
      }
      const { data, error } = await supabase.from("crm_course_lessons").insert(lesson).select().single();
      if (error) throw error;
      return data as CrmCourseLesson;
    },
    onSuccess: (data, vars) => {
      // Actualizar cache inmediatamente para evitar flash de "—" mientras llega el refetch
      qc.setQueryData(
        ["crm_course_lessons", vars.course_id],
        (old: CrmCourseLesson[] | undefined) => {
          if (!old) return [data];
          const exists = old.some(l => l.id === data.id);
          return exists ? old.map(l => l.id === data.id ? data : l) : [...old, data];
        },
      );
      qc.invalidateQueries({ queryKey: ["crm_course_lessons", vars.course_id] });
    },
  });
};

export const useDeleteCourseLesson = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await supabase.from("crm_course_lessons").delete().eq("id", id);
      if (error) throw error;
      return courseId;
    },
    onSuccess: (courseId) => qc.invalidateQueries({ queryKey: ["crm_course_lessons", courseId] }),
  });
};

export const useCourseAccess = (courseId: string | null) => {
  return useQuery({
    queryKey: ["crm_course_access", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_course_access")
        .select("*")
        .eq("course_id", courseId!)
        .order("granted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CrmCourseAccess[];
    },
    enabled: !!courseId,
  });
};

export const useGrantCourseAccess = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async ({ course_id, email, expires_at }: { course_id: string; email: string; expires_at?: string | null }) => {
      const { data, error } = await supabase
        .from("crm_course_access")
        .upsert({ course_id, email: email.toLowerCase().trim(), granted_by: user!.id, expires_at: expires_at ?? null }, { onConflict: "course_id,email" })
        .select().single();
      if (error) throw error;
      return data as CrmCourseAccess;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["crm_course_access", vars.course_id] }),
  });
};

export const useRevokeCourseAccess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await supabase.from("crm_course_access").delete().eq("id", id);
      if (error) throw error;
      return courseId;
    },
    onSuccess: (courseId) => qc.invalidateQueries({ queryKey: ["crm_course_access", courseId] }),
  });
};

// Devuelve un Map<email, count> con el número de cursos asignados a cada email
export const useContactCourseMap = () =>
  useQuery({
    queryKey: ["contact_course_map"],
    queryFn: async () => {
      const { data: courses } = await supabase.from("crm_courses").select("id");
      if (!courses?.length) return new Map<string, number>();
      const courseIds = courses.map((c: { id: string }) => c.id);
      const { data: accesses } = await supabase
        .from("crm_course_access")
        .select("email, course_id")
        .in("course_id", courseIds);
      const map = new Map<string, number>();
      accesses?.forEach((a: { email: string; course_id: string }) => {
        if (a.email) map.set(a.email, (map.get(a.email) ?? 0) + 1);
      });
      return map;
    },
    staleTime: 30_000,
  });

export const useContactCourseAccess = (email: string | null | undefined) =>
  useQuery({
    queryKey: ["contact_course_access", email],
    queryFn: async () => {
      if (!email) return [];
      const { data } = await supabase
        .from("crm_course_access")
        .select("id, status, expires_at, course_id, crm_courses(id, title, user_id, slug, is_published)")
        .eq("email", email.toLowerCase().trim());
      return (data ?? []) as Array<{
        id: string;
        status: string;
        expires_at: string | null;
        course_id: string;
        crm_courses: { id: string; title: string; user_id: string; slug: string; is_published: boolean } | null;
      }>;
    },
    enabled: !!email,
    staleTime: 30_000,
  });

// ─── Multi-currency prices ────────────────────────────────────────────────────

export const usePricesByEntity = (entityType: CrmPrice["entity_type"], entityId: string | null | undefined) => {
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  const uid = ownerUserId ?? user?.id;
  return useQuery({
    queryKey: ["crm_prices", entityType, entityId],
    enabled: !!(uid && entityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_prices")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CrmPrice[];
    },
  });
};

export const useUpsertPrices = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      prices,
    }: {
      entityType: CrmPrice["entity_type"];
      entityId: string;
      prices: { currency: string; price: number }[];
    }) => {
      if (!user?.id) throw new Error("No user");
      // Delete all existing prices for this entity, then insert fresh
      await supabase.from("crm_prices").delete().eq("entity_id", entityId).eq("entity_type", entityType);
      if (prices.length === 0) return;
      const { error } = await supabase.from("crm_prices").insert(
        prices.map((p, i) => ({
          user_id: user.id,
          entity_type: entityType,
          entity_id: entityId,
          currency: p.currency,
          price: p.price,
          sort_order: i,
        }))
      );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["crm_prices", vars.entityType, vars.entityId] });
    },
  });
};

// ─── Entity FAQs ─────────────────────────────────────────────────────────────

export const useFaqsByEntity = (entityType: CrmEntityFaq["entity_type"], entityId: string | null | undefined) => {
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  const uid = ownerUserId ?? user?.id;
  return useQuery({
    queryKey: ["crm_entity_faqs", entityType, entityId],
    enabled: !!(uid && entityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_entity_faqs")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CrmEntityFaq[];
    },
  });
};

export const useUpsertFaqs = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      faqs,
    }: {
      entityType: CrmEntityFaq["entity_type"];
      entityId: string;
      faqs: { question: string; answer: string }[];
    }) => {
      if (!user?.id) throw new Error("No user");
      await supabase.from("crm_entity_faqs").delete().eq("entity_id", entityId).eq("entity_type", entityType);
      if (faqs.length === 0) return;
      const { error } = await supabase.from("crm_entity_faqs").insert(
        faqs.map((f, i) => ({
          user_id: user.id,
          entity_type: entityType,
          entity_id: entityId,
          question: f.question,
          answer: f.answer,
          sort_order: i,
        }))
      );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["crm_entity_faqs", vars.entityType, vars.entityId] });
    },
  });
};

// ─── WhatsApp Templates ───────────────────────────────────────────────────────

export const useWaTemplates = (context?: WaTemplateContext) => {
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  const effectiveId = ownerUserId ?? user?.id;
  return useQuery({
    queryKey: ["crm_wa_templates", effectiveId, context ?? "all"],
    enabled: !!effectiveId,
    queryFn: async () => {
      let q = supabase
        .from("crm_wa_templates")
        .select("*")
        .eq("user_id", effectiveId!)
        .order("created_at", { ascending: false });
      if (context) q = q.eq("usage_context", context);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CrmWaTemplate[];
    },
  });
};

export const useCreateWaTemplate = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  const effectiveId = ownerUserId ?? user?.id;
  return useMutation({
    mutationFn: async (template: Omit<CrmWaTemplate, "id" | "user_id" | "created_at" | "updated_at" | "meta_template_id" | "meta_status" | "rejection_reason">) => {
      if (!effectiveId) throw new Error("No user");
      const { data, error } = await supabase
        .from("crm_wa_templates")
        .insert({ ...template, user_id: effectiveId })
        .select()
        .single();
      if (error) throw error;
      return data as CrmWaTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_wa_templates", effectiveId] }),
  });
};

export const useUpdateWaTemplate = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  const effectiveId = ownerUserId ?? user?.id;
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CrmWaTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("crm_wa_templates")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CrmWaTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_wa_templates", effectiveId] }),
  });
};

export const useDeleteWaTemplate = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  const effectiveId = ownerUserId ?? user?.id;
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_wa_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_wa_templates", effectiveId] }),
  });
};

// ─── WA Campaigns ─────────────────────────────────────────────────────────────

export const useWaCampaigns = () => {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["wa_campaigns", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_wa_campaigns")
        .select("*, crm_wa_templates(name, body_text, language)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CrmWaCampaign[];
    },
  });
};

export const useWaCampaignLogs = (campaignId: string | null) => {
  return useQuery({
    queryKey: ["wa_campaign_logs", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_wa_campaign_logs")
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CrmWaCampaignLog[];
    },
  });
};

type CreateCampaignPayload = {
  template_id: string;
  name: string;
  variable_map: WaVarMap;
  audience_type: "all" | "include" | "exclude";
  audience_filters: WaAudienceFilter[];
};

export const useCreateWaCampaign = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (payload: CreateCampaignPayload) => {
      const { data, error } = await supabase
        .from("crm_wa_campaigns")
        .insert({ ...payload, user_id: user!.id, status: "draft" })
        .select()
        .single();
      if (error) throw error;
      return data as CrmWaCampaign;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_campaigns", user?.id] }),
  });
};

export const useUpdateWaCampaignStatus = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async ({ id, status, sent_count, failed_count, total_contacts, completed_at }: {
      id: string; status: WaCampaignStatus;
      sent_count?: number; failed_count?: number;
      total_contacts?: number; completed_at?: string;
    }) => {
      const { error } = await supabase
        .from("crm_wa_campaigns")
        .update({ status, sent_count, failed_count, total_contacts, completed_at })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_campaigns", user?.id] }),
  });
};

export const useDeleteWaCampaign = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_wa_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_campaigns", user?.id] }),
  });
};

// ─── Instant Campaigns (Dentro de 24h) ───────────────────────────────────────

export type ActiveConv = { id: string; phone: string; contact_name: string | null; label_ids: string[] }

export const useWaActiveConversations = (windowHours: number) => {
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  const uid = ownerUserId ?? user?.id;
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  return useQuery({
    queryKey: ["wa_active_conversations", uid, windowHours],
    enabled: !!uid,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: convs } = await supabase
        .from("crm_wa_conversations")
        .select("id, phone, contact_name")
        .eq("user_id", uid!)
        .gt("last_message_at", cutoff);

      if (!convs?.length) return [] as ActiveConv[];

      const { data: labelLinks } = await supabase
        .from("crm_wa_conversation_labels")
        .select("conversation_id, label_id")
        .in("conversation_id", convs.map(c => c.id));

      const labelsByConv = new Map<string, string[]>();
      for (const link of labelLinks ?? []) {
        const arr = labelsByConv.get(link.conversation_id) ?? [];
        arr.push(link.label_id);
        labelsByConv.set(link.conversation_id, arr);
      }

      return convs.map(c => ({
        ...c,
        label_ids: labelsByConv.get(c.id) ?? [],
      })) as ActiveConv[];
    },
  });
};

export const useInstantCampaigns = () => {
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  const uid = ownerUserId ?? user?.id;
  return useQuery({
    queryKey: ["wa_instant_campaigns", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_wa_instant_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CrmWaInstantCampaign[];
    },
  });
};

export const useInstantCampaignLogs = (campaignId: string | null) => {
  return useQuery({
    queryKey: ["wa_instant_campaign_logs", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_wa_instant_campaign_logs")
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CrmWaInstantCampaignLog[];
    },
  });
};

export const useCreateInstantCampaign = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  const uid = ownerUserId ?? user?.id;
  return useMutation({
    mutationFn: async (payload: Omit<CrmWaInstantCampaign, "id" | "user_id" | "total_contacts" | "sent_count" | "failed_count" | "created_at">) => {
      if (!uid) throw new Error("No user");
      const { data, error } = await supabase
        .from("crm_wa_instant_campaigns")
        .insert({ ...payload, user_id: uid })
        .select()
        .single();
      if (error) throw error;
      return data as CrmWaInstantCampaign;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_instant_campaigns", uid] }),
  });
};

export const useDeleteInstantCampaign = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  const uid = ownerUserId ?? user?.id;
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_wa_instant_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_instant_campaigns", uid] }),
  });
};

// ─── WA Automations ───────────────────────────────────────────────────────────

import type { CrmWaAutomation, CrmWaAutomationQueueItem } from "@/lib/supabase";

export const useWaAutomations = () => {
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  const uid = ownerUserId ?? user?.id;
  return useQuery({
    queryKey: ["wa_automations", uid],
    enabled: !!uid,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_wa_automations")
        .select("*")
        .eq("user_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CrmWaAutomation[];
    },
  });
};

export const useCreateWaAutomation = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  const uid = ownerUserId ?? user?.id;
  return useMutation({
    mutationFn: async (payload: Omit<CrmWaAutomation, "id" | "user_id" | "sent_count" | "skipped_count" | "failed_count" | "created_at">) => {
      if (!uid) throw new Error("No user");
      const { data, error } = await supabase
        .from("crm_wa_automations")
        .insert({ ...payload, user_id: uid })
        .select()
        .single();
      if (error) throw error;
      return data as CrmWaAutomation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_automations", uid] }),
  });
};

export const useUpdateWaAutomation = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  const uid = ownerUserId ?? user?.id;
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CrmWaAutomation> & { id: string }) => {
      const { data, error } = await supabase
        .from("crm_wa_automations")
        .update(patch)
        .eq("id", id)
        .eq("user_id", uid!)
        .select()
        .single();
      if (error) throw error;
      return data as CrmWaAutomation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_automations", uid] }),
  });
};

export const useDeleteWaAutomation = () => {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  const uid = ownerUserId ?? user?.id;
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_wa_automations")
        .delete()
        .eq("id", id)
        .eq("user_id", uid!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_automations", uid] }),
  });
};

export const useAutomationQueue = (automationId: string | null) => {
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  const uid = ownerUserId ?? user?.id;
  return useQuery({
    queryKey: ["wa_automation_queue", uid, automationId],
    enabled: !!uid && !!automationId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_wa_automation_queue")
        .select("*")
        .eq("automation_id", automationId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as CrmWaAutomationQueueItem[];
    },
  });
};
