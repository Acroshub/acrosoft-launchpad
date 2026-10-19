/** Ruta base de la webapp. */
export const APP_ROOT = "/primeros-auxilios-bebe-app";
/**
 * Carpeta pública con los bytes cifrados. NO se llama igual que la ruta de la app
 * para no chocar con ella (un directorio estático en public/ ocultaría la ruta SPA).
 */
export const DATA_BASE = "/primeros-auxilios-bebe-pack";
export const KEY_STORAGE = "primeros_auxilios_bebe_app_key_v1";
export const STATE_PREFIX = "pab_";

export const DISCLAIMER =
  "No sustituye un curso presencial de primeros auxilios ni la consulta médica ni a los servicios de emergencia.";
export const PENDING_REVIEW_LABEL = "Contenido pendiente de revisión profesional";
