import type { QueryClient } from "@tanstack/react-query";
import type { CrmWaConversation } from "./supabase";

/**
 * Escrituras sobre la caché de conversaciones de WhatsApp.
 *
 * Existe para que nadie tenga que invalidar la lista entera. Con 1.000+
 * conversaciones cada invalidación son ~32 kB de refetch, y marcar como leído
 * se dispara en cada apertura de chat — invalidar ahí devolvía por la ventana
 * el egress que ahorra Realtime.
 *
 * Lo usan tanto los eventos de Realtime (fila completa) como las mutaciones
 * (cambio parcial de una fila ya cacheada).
 */

export const WA_CONV_KEY = "crm_wa_conversations";
export const WA_CONV_ARCHIVED_KEY = "crm_wa_conversations_archived";

/** Mismo orden que las queries: last_message_at desc, los nulos al final. */
export const sortWaConversations = (rows: CrmWaConversation[]): CrmWaConversation[] =>
  [...rows].sort((a, b) => {
    // Centinela 0 y no -Infinity: dos nulos darían NaN y el comparador quedaría
    // indefinido.
    const ta = a.last_message_at ? Date.parse(a.last_message_at) : 0;
    const tb = b.last_message_at ? Date.parse(b.last_message_at) : 0;
    return tb - ta;
  });

/**
 * Las claves son `[nombre, effectiveId]`, y `effectiveId` es siempre el
 * `user_id` por el que filtra la query — así que una lista cacheada solo puede
 * contener filas de ese tenant. Comparar contra `row.user_id` evita escribir en
 * la lista de otro tenant cuando el superadmin tiene varios en caché.
 */
const listsFor = (qc: QueryClient, name: string, userId: string) =>
  qc
    .getQueriesData<CrmWaConversation[]>({ queryKey: [name] })
    .filter(([key]) => key[1] === userId)
    .map(([key]) => key);

/**
 * Coloca una fila completa en la lista que le toca (activas o archivadas) y la
 * saca de la otra: archivar/desarchivar es un UPDATE de `is_archived`, y sin
 * esto la conversación quedaría duplicada en pantalla.
 *
 * Si la lista todavía no está en caché no se siembra nada: el fetch inicial de
 * la query es quien la trae, y escribir aquí dejaría una lista de un solo
 * elemento, como si el resto de chats hubiera desaparecido.
 */
export const applyWaConversationRow = (qc: QueryClient, row: CrmWaConversation) => {
  const targetName = row.is_archived ? WA_CONV_ARCHIVED_KEY : WA_CONV_KEY;
  const otherName = row.is_archived ? WA_CONV_KEY : WA_CONV_ARCHIVED_KEY;

  for (const key of listsFor(qc, otherName, row.user_id)) {
    qc.setQueryData<CrmWaConversation[]>(key, (prev) =>
      prev ? prev.filter((c) => c.id !== row.id) : prev,
    );
  }
  for (const key of listsFor(qc, targetName, row.user_id)) {
    qc.setQueryData<CrmWaConversation[]>(key, (prev) =>
      prev ? sortWaConversations([...prev.filter((c) => c.id !== row.id), row]) : prev,
    );
  }
};

/**
 * Aplica un cambio parcial sobre una conversación ya cacheada. Para las
 * mutaciones, que saben exactamente qué campo tocaron.
 *
 * Si la fila no está en caché no hace nada: significa que la lista aún no se
 * cargó, y el fetch inicial la traerá ya con el cambio aplicado en el servidor.
 * El evento de Realtime llega después con la fila autoritativa y corrige
 * cualquier diferencia.
 */
export const patchWaConversation = (
  qc: QueryClient,
  id: string,
  patch: Partial<CrmWaConversation>,
) => {
  for (const name of [WA_CONV_KEY, WA_CONV_ARCHIVED_KEY]) {
    for (const [, rows] of qc.getQueriesData<CrmWaConversation[]>({ queryKey: [name] })) {
      const hit = rows?.find((c) => c.id === id);
      if (hit) {
        applyWaConversationRow(qc, { ...hit, ...patch });
        return;
      }
    }
  }
};

/** Saca una conversación de ambas listas, sin refetch. */
export const removeWaConversation = (qc: QueryClient, id: string) => {
  for (const name of [WA_CONV_KEY, WA_CONV_ARCHIVED_KEY]) {
    for (const [key] of qc.getQueriesData<CrmWaConversation[]>({ queryKey: [name] })) {
      qc.setQueryData<CrmWaConversation[]>(key, (prev) =>
        prev ? prev.filter((c) => c.id !== id) : prev,
      );
    }
  }
};
