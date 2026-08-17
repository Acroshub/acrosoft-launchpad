/**
 * URLs firmadas para la multimedia ENTRANTE de WhatsApp (bucket privado wa-media).
 *
 * Contexto: `crm_wa_messages.media_url` mezcla dos orígenes.
 *   · Entrante  → bucket `wa-media`, PRIVADO. Solo lo ve el CRM, así que se firma.
 *   · Saliente  → `chat-attachments` / `form-uploads`, que DEBEN seguir siendo
 *                 públicos porque Meta descarga el archivo por URL para entregarlo.
 *
 * Por eso no se puede firmar todo a ciegas: hay que distinguir por la URL guardada.
 * Las de wa-media conservan el formato "…/object/public/wa-media/…" que escribió el
 * webhook — se dejó igual a propósito para no migrar datos históricos. Ese string
 * ya no resuelve por sí solo (el bucket es privado); funciona como identificador
 * del que se extrae la ruta para firmarla.
 */

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

const WA_MEDIA_MARKER = "/storage/v1/object/public/wa-media/";

/** Vida de la URL firmada. Suficiente para una sesión larga de bandeja. */
const SIGNED_TTL_SECONDS = 2 * 60 * 60;
/** Se refirma con este margen antes de caducar, para que nada expire en pantalla. */
const REFRESH_MARGIN_MS = 10 * 60 * 1000;

type CacheEntry = { signedUrl: string; expiresAt: number };

// Caché por ruta: una conversación puede tener decenas de adjuntos y no tiene
// sentido pedir una firma nueva en cada render.
const cache = new Map<string, CacheEntry>();
// Peticiones en vuelo: evita firmar la misma ruta N veces si varios componentes
// la piden a la vez (galería + burbuja + menú contextual).
const inflight = new Map<string, Promise<string | null>>();

export function isWaMediaUrl(url: string | null | undefined): boolean {
  return !!url && url.includes(WA_MEDIA_MARKER);
}

/** Extrae la ruta dentro del bucket a partir de la URL guardada. */
export function waMediaPath(url: string): string | null {
  const i = url.indexOf(WA_MEDIA_MARKER);
  if (i === -1) return null;
  const raw = url.slice(i + WA_MEDIA_MARKER.length).split("?")[0];
  if (!raw) return null;
  try { return decodeURIComponent(raw); } catch { return raw; }
}

/**
 * Devuelve una URL utilizable para `url`:
 *   · si no es de wa-media → la misma URL, sin tocar
 *   · si lo es → una URL firmada (de caché si sigue vigente)
 *   · null si la firma falla (objeto borrado, o sin permiso sobre ese tenant)
 */
export async function resolveWaMediaUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (!isWaMediaUrl(url)) return url;

  const path = waMediaPath(url);
  if (!path) return null;

  const hit = cache.get(path);
  if (hit && hit.expiresAt - REFRESH_MARGIN_MS > Date.now()) return hit.signedUrl;

  const pending = inflight.get(path);
  if (pending) return pending;

  const task = (async () => {
    try {
      const { data, error } = await supabase.storage
        .from("wa-media")
        .createSignedUrl(path, SIGNED_TTL_SECONDS);
      if (error || !data?.signedUrl) return null;
      cache.set(path, {
        signedUrl: data.signedUrl,
        expiresAt: Date.now() + SIGNED_TTL_SECONDS * 1000,
      });
      return data.signedUrl;
    } catch {
      return null;
    } finally {
      inflight.delete(path);
    }
  })();

  inflight.set(path, task);
  return task;
}

/**
 * Hook de render. Para URLs públicas devuelve el valor de inmediato (sin parpadeo);
 * para las de wa-media devuelve null hasta que llega la firma.
 *
 * `pending` distingue "todavía firmando" de "no se pudo firmar", para poder mostrar
 * un placeholder en vez de un hueco roto.
 */
export function useWaMediaUrl(url: string | null | undefined): {
  src: string | null;
  pending: boolean;
} {
  const immediate = !url || !isWaMediaUrl(url) ? (url ?? null) : null;
  const [src, setSrc] = useState<string | null>(immediate);
  const [pending, setPending] = useState(immediate === null && !!url);

  useEffect(() => {
    if (!url || !isWaMediaUrl(url)) {
      setSrc(url ?? null);
      setPending(false);
      return;
    }

    // Si ya está en caché y vigente, se resuelve sin pasar por estado "pending".
    const path = waMediaPath(url);
    const hit = path ? cache.get(path) : undefined;
    if (hit && hit.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
      setSrc(hit.signedUrl);
      setPending(false);
      return;
    }

    let alive = true;
    setPending(true);
    resolveWaMediaUrl(url).then(resolved => {
      if (!alive) return;
      setSrc(resolved);
      setPending(false);
    });
    return () => { alive = false; };
  }, [url]);

  return { src, pending };
}
