-- ── Subidas rotas: Storage v1.71 hace INSERT … RETURNING * ────────────────────
--
-- Desde la migración interna "object-versioning-core" (storage 1.71.0), el
-- servicio de Storage sube con:
--
--   INSERT INTO storage.objects (...) VALUES (...)
--   ON CONFLICT (name, bucket_id) DO UPDATE SET ...
--   RETURNING *
--
-- En Postgres, un INSERT … RETURNING sobre una tabla con RLS aplica también las
-- policies de SELECT a la fila devuelta. Si el bucket sólo tiene policy INSERT,
-- la escritura pasa el WITH CHECK pero el RETURNING falla con
-- "new row violates row-level security policy" (42501) → el cliente ve
-- "Error al subir …".
--
-- Buckets afectados (INSERT sin SELECT): form-uploads, payment-qr,
-- product-images, chat-attachments, video-thumbnails.
-- Los que ya tenían SELECT (payment-proofs, product-deliverables,
-- support-attachments, master-docs, wa-media) nunca se rompieron.
--
-- Cada policy SELECT de aquí es el espejo exacto de la policy INSERT que ya
-- existía: no amplía a quién se le permite escribir ni leer archivos, sólo
-- devuelve visible la fila que el propio usuario acaba de escribir.

-- ── SELECT espejo: product-images ────────────────────────────────────────────
drop policy if exists "owner_read_product_images" on storage.objects;
create policy "owner_read_product_images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'product-images'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
  );

-- ── SELECT espejo: payment-qr ────────────────────────────────────────────────
drop policy if exists "owner_read_payment_qr" on storage.objects;
create policy "owner_read_payment_qr"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-qr'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
  );

-- ── SELECT espejo: chat-attachments ──────────────────────────────────────────
drop policy if exists "owner_read_chat_attachments" on storage.objects;
create policy "owner_read_chat_attachments"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
  );

-- ── SELECT espejo: video-thumbnails (misma condición que "Admin upload") ─────
drop policy if exists "admin_read_video_thumbnails" on storage.objects;
create policy "admin_read_video_thumbnails"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'video-thumbnails'
    and (select auth.email()) = 'e.daniel.acero.r@gmail.com'
  );

-- ── SELECT: form-uploads ─────────────────────────────────────────────────────
-- La policy INSERT (auth_upload_form_uploads) permite a cualquier usuario
-- autenticado escribir en cualquier ruta del bucket. NO la copiamos tal cual en
-- SELECT: eso permitiría a un tenant *enumerar* las rutas de los demás
-- (wa-sequences/<otro-uid>/…, agent-photos, cursos). Se acota a los objetos
-- propios — o a los del principal, si quien mira es staff activo suyo.
drop policy if exists "owner_read_form_uploads" on storage.objects;
create policy "owner_read_form_uploads"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'form-uploads'
    and (
      owner_id = (select auth.uid())::text
      or exists (
        select 1 from public.crm_staff s
         where s.staff_user_id = (select auth.uid())
           and s.status = 'active'
           and s.owner_user_id::text = storage.objects.owner_id
      )
    )
  );

-- ── SELECT: form-uploads para visitantes anónimos (adjuntos de formularios) ──
-- FormRenderer sube a submissions/… con la clave anon. Necesita ver su propia
-- fila para el RETURNING, pero no debe poder listar los adjuntos de los demás,
-- así que la ventana se limita a la fila recién creada.
drop policy if exists "anon_read_own_form_submission" on storage.objects;
create policy "anon_read_own_form_submission"
  on storage.objects for select to anon
  using (
    bucket_id = 'form-uploads'
    and (storage.foldername(name))[1] = 'submissions'
    and created_at > now() - interval '10 seconds'
  );

-- ── UPDATE: form-uploads (reemplazar un archivo ya existente) ────────────────
-- Portadas y adjuntos de cursos usan rutas fijas (course-thumbnails/<id>.ext,
-- course-attachments/<id>.ext) con upsert: true. Al reemplazarlos el
-- ON CONFLICT DO UPDATE necesita policy UPDATE; sin ella daba el mismo 42501.
drop policy if exists "owner_update_form_uploads" on storage.objects;
create policy "owner_update_form_uploads"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'form-uploads'
    and (
      owner_id = (select auth.uid())::text
      or exists (
        select 1 from public.crm_staff s
         where s.staff_user_id = (select auth.uid())
           and s.status = 'active'
           and s.owner_user_id::text = storage.objects.owner_id
      )
    )
  )
  with check (bucket_id = 'form-uploads');

-- ── Fix aparte: owner_read_wa_media comparaba contra la columna equivocada ────
-- Decía (storage.foldername(s.name))[1] — s.name es el NOMBRE del empleado en
-- crm_staff, no la ruta del objeto — así que la rama de staff nunca era cierta y
-- ningún miembro del equipo podía abrir la multimedia de WhatsApp del principal.
drop policy if exists "owner_read_wa_media" on storage.objects;
create policy "owner_read_wa_media"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'wa-media'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.crm_staff s
         where s.owner_user_id::text = (storage.foldername(storage.objects.name))[1]
           and s.staff_user_id = (select auth.uid())
           and s.status = 'active'
           and (s.perm_agente_ia ->> 'read')::boolean = true
      )
    )
  );
