import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "./useAuth";
import { applyWaConversationRow } from "@/lib/waCache";
import type { CrmWaConversation, CrmWaMessage, WaLastMessage } from "@/lib/supabase";

/**
 * Mantiene la bandeja de WhatsApp al día por Realtime en vez de por polling.
 *
 * Antes la lista de conversaciones y el hilo abierto se refrescaban cada 3s con
 * `select("*")` sin paginar. Con 1.000+ conversaciones eso son ~32 kB cada 3
 * segundos por pestaña abierta — ~300 MB de egress al día, y creciendo solo a
 * medida que el tenant acumula chats. Aquí el costo pasa a ser proporcional a
 * los eventos (unos cientos de bytes por mensaje nuevo), no al tamaño de la
 * tabla, así que deja de crecer con el tenant.
 *
 * Los eventos se aplican parcheando la caché de React Query directamente con la
 * fila que viene en el payload: un mensaje nuevo no dispara ningún refetch.
 */
export const useWaRealtime = (userId?: string) => {
  const { user } = useCurrentUser();
  const effectiveId = userId ?? user?.id;
  const qc = useQueryClient();

  useEffect(() => {
    if (!effectiveId) return;

    const convKey    = ["crm_wa_conversations", effectiveId];
    const archKey    = ["crm_wa_conversations_archived", effectiveId];
    const previewKey = ["wa_last_messages", effectiveId];

    const applyMessage = (row: CrmWaMessage, isInsert: boolean) => {
      // Hilo abierto. Solo se toca si esa conversación ya está cargada; si no,
      // se la traerá entera al abrirla.
      qc.setQueryData<CrmWaMessage[]>(["crm_wa_messages", row.conversation_id], (prev) => {
        if (!prev) return prev;
        const idx = prev.findIndex((m) => m.id === row.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = row;   // UPDATE: típicamente delivery_status o send_error
          return next;
        }
        // La query ordena por created_at asc y un INSERT siempre es el más
        // nuevo, así que va al final.
        return isInsert ? [...prev, row] : prev;
      });

      // Preview de la lista de chats. `crm_wa_conversation_last_message` excluye
      // las notas internas, así que aquí también.
      if (isInsert && !row.is_internal) {
        qc.setQueryData<Record<string, WaLastMessage>>(previewKey, (prev) =>
          prev
            ? {
                ...prev,
                [row.conversation_id]: {
                  conversation_id: row.conversation_id,
                  role: row.role,
                  media_type: row.media_type,
                  content: row.content,
                },
              }
            : prev,
        );
      }
    };

    const channel = supabase
      .channel(`wa-inbox:${effectiveId}`)
      // Conversaciones del tenant: orden de la lista, no leídos, modo, asignación,
      // archivado. Filtrado por user_id para no evaluar RLS contra filas ajenas.
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crm_wa_conversations", filter: `user_id=eq.${effectiveId}` },
        (payload) => {
          // Los DELETE no llegan aquí: con REPLICA IDENTITY por defecto el
          // registro viejo solo trae la PK y no pasa el filtro `user_id`. En la
          // pestaña que borra lo resuelve `useDeleteWaConversation` sacando la
          // fila de la caché; en las demás, el resync al reconectar.
          if (payload.eventType === "DELETE") return;
          applyWaConversationRow(qc, payload.new as CrmWaConversation);
        },
      )
      // Mensajes: sin filtro porque `crm_wa_messages` no tiene user_id — el
      // aislamiento entre tenants lo hace RLS, que Realtime evalúa por
      // suscriptor antes de entregar el evento.
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "crm_wa_messages" },
        (payload) => applyMessage(payload.new as CrmWaMessage, true),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "crm_wa_messages" },
        (payload) => applyMessage(payload.new as CrmWaMessage, false),
      )
      // Los mensajes se pueden borrar desde el menú contextual del chat. El
      // registro viejo solo trae la PK (REPLICA IDENTITY por defecto) y Realtime
      // no evalúa RLS en los DELETE, así que llegan ids de todos los tenants:
      // quitarlos por id es inofensivo porque los ajenos no están en la caché.
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "crm_wa_messages" },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (!id) return;

          const cached = qc.getQueriesData<CrmWaMessage[]>({ queryKey: ["crm_wa_messages"] });
          const wasMine = cached.some(([, rows]) => rows?.some((m) => m.id === id));
          if (!wasMine) return;   // id de otro tenant: no hay nada que quitar

          qc.setQueriesData<CrmWaMessage[]>({ queryKey: ["crm_wa_messages"] }, (prev) =>
            prev ? prev.filter((m) => m.id !== id) : prev,
          );
          // Si el borrado era el último mensaje, el preview de la lista queda
          // desfasado y no se puede recalcular desde el evento: hay que volver a
          // pedir la vista. Es una acción manual y rara.
          qc.invalidateQueries({ queryKey: previewKey });
        },
      )
      .subscribe((status) => {
        // SUBSCRIBED dispara en la suscripción inicial y en cada reconexión:
        // es el momento exacto para recuperar lo que se haya perdido mientras
        // el socket estuvo caído.
        if (status === "SUBSCRIBED") {
          qc.invalidateQueries({ queryKey: convKey });
          qc.invalidateQueries({ queryKey: archKey });
          qc.invalidateQueries({ queryKey: previewKey });
          qc.invalidateQueries({ queryKey: ["crm_wa_messages"] });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveId, qc]);
};
