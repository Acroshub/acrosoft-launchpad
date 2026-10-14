import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useAuth";
import { useStaffPermissions } from "@/hooks/useAuth";
import { copyName } from "@/lib/duplicates";
import type { CrmWaLabel, CrmWaFlow, CrmWaAutomation } from "@/lib/supabase";

// Duplicados: cada copia nace como Borrador, apuntando a su original (duplicated_from).

/** Copia una secuencia (solo su versión publicada) para que editar la copia no toque el original. */
async function copySequence(
  userId: string, sequenceId: string | null | undefined, takenNames: string[],
): Promise<string | null> {
  if (!sequenceId) return null;
  const { data: src } = await supabase.from("crm_wa_sequences").select("name, steps")
    .eq("id", sequenceId).eq("user_id", userId).maybeSingle();
  if (!src) return null;
  const name = copyName(src.name, takenNames);
  takenNames.push(name);
  const { data, error } = await supabase.from("crm_wa_sequences").insert({
    user_id: userId, name, steps: src.steps, status: "published", draft_steps: null, duplicated_from: sequenceId,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

async function sequenceNames(userId: string): Promise<string[]> {
  const { data } = await supabase.from("crm_wa_sequences").select("name").eq("user_id", userId);
  return (data ?? []).map(s => s.name as string);
}

export const useDuplicateWaLabel = () => {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ label, existingNames }: { label: CrmWaLabel; existingNames: string[] }) => {
      const { data, error } = await supabase.from("crm_wa_labels").insert({
        user_id: user!.id, name: copyName(label.name, existingNames), color: label.color,
        hint: label.hint ?? null, remove_hint: label.remove_hint ?? null,
        meta_event: label.meta_event ?? null, product_id: label.product_id ?? null,
        status: "draft", duplicated_from: label.id,
      }).select().single();
      if (error) throw error;
      return data as CrmWaLabel;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_labels"] }),
  });
};

export const useDuplicateWaFlow = () => {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ flow, existingNames }: { flow: CrmWaFlow; existingNames: string[] }) => {
      const userId = user!.id;
      const taken = await sequenceNames(userId);
      // Una misma secuencia usada en varios países se copia una sola vez.
      const copies = new Map<string, string | null>();
      const dup = async (id: string | null | undefined) => {
        if (!id) return null;
        if (!copies.has(id)) copies.set(id, await copySequence(userId, id, taken));
        return copies.get(id) ?? null;
      };
      const sequence_id = await dup(flow.sequence_id);
      const country_sequences: { country_code: string; sequence_id: string }[] = [];
      for (const c of flow.country_sequences ?? []) {
        const id = await dup(c.sequence_id);
        if (id) country_sequences.push({ country_code: c.country_code, sequence_id: id });
      }
      const { data, error } = await supabase.from("crm_wa_flows").insert({
        user_id: userId, name: copyName(flow.name, existingNames),
        trigger_text: flow.trigger_text, flow_trigger_type: flow.flow_trigger_type, trigger_once: flow.trigger_once,
        product_id: flow.product_id ?? null, final_action: flow.final_action,
        sequence_id, country_sequences,
        // Borrador: nunca se dispara hasta publicarse. is_active nace encendido como en cualquier flujo nuevo.
        is_active: true, status: "draft", draft_step: 1, duplicated_from: flow.id,
      }).select().single();
      if (error) throw error;
      return data as CrmWaFlow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa_flows"] });
      qc.invalidateQueries({ queryKey: ["wa_sequences"] });
    },
  });
};

export const useDuplicateWaAutomation = () => {
  const { user } = useCurrentUser();
  const { ownerUserId } = useStaffPermissions();
  const uid = ownerUserId ?? user?.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ automation, existingNames }: { automation: CrmWaAutomation; existingNames: string[] }) => {
      if (!uid) throw new Error("No user");
      const sequence_id = await copySequence(uid, automation.sequence_id, await sequenceNames(uid));
      const { data, error } = await supabase.from("crm_wa_automations").insert({
        user_id: uid, name: copyName(automation.name, existingNames),
        trigger_type: automation.trigger_type, trigger_inactivity_hours: automation.trigger_inactivity_hours,
        audience_type: automation.audience_type, audience_filters: automation.audience_filters,
        audience_match: automation.audience_match, message_type: automation.message_type,
        parts: automation.parts, message_text: automation.message_text,
        media_type: automation.media_type, media_url: automation.media_url,
        template_id: automation.template_id, template_var_map: automation.template_var_map,
        sequence_id,
        // Apagado y en borrador: no sale hasta que se modifique y se guarde.
        is_active: false, status: "draft", duplicated_from: automation.id,
      }).select().single();
      if (error) throw error;
      return data as CrmWaAutomation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa_automations", uid] });
      qc.invalidateQueries({ queryKey: ["wa_sequences"] });
    },
  });
};
