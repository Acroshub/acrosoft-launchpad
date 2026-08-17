-- PASO FINAL de la privatización de wa-media. Ejecutar SOLO cuando el frontend
-- con URLs firmadas (src/lib/wa-media.ts) ya esté desplegado en producción.
--
-- Motivo del orden: createSignedUrl funciona igual con el bucket público, así que
-- el frontend nuevo es compatible con los dos estados. El frontend VIEJO, en
-- cambio, pinta la URL pública tal cual — si se privatiza antes de desplegar, la
-- multimedia entrante de la bandeja se ve rota hasta que salga el deploy.
--
-- Secuencia sin caídas:
--   1. Desplegar el frontend con la capa de URLs firmadas
--   2. Comprobar que la bandeja sigue mostrando imágenes y documentos
--   3. Ejecutar esta migración
--   4. Volver a comprobar la bandeja (debe seguir igual) y que la URL pública ya no resuelve
--
-- Reversible al instante: UPDATE storage.buckets SET public = true WHERE id = 'wa-media';

UPDATE storage.buckets SET public = false WHERE id = 'wa-media';
