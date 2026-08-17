-- Lectura de la multimedia ENTRANTE de WhatsApp (bucket wa-media).
-- Las rutas son {tenant_user_id}/{conversation_id}/{wa_message_id}.ext, así que el
-- primer segmento identifica al dueño.
--
-- Refleja el mismo criterio que la policy de lectura de crm_wa_messages: el dueño,
-- o su staff con perm_agente_ia.read. Necesaria para que createSignedUrl funcione
-- (firmar exige SELECT sobre el objeto).
CREATE POLICY "owner_read_wa_media" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'wa-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM crm_staff s
        WHERE s.owner_user_id::text = (storage.foldername(name))[1]
          AND s.staff_user_id = auth.uid()
          AND s.status = 'active'
          AND (s.perm_agente_ia ->> 'read')::boolean = true
      )
    )
  );
