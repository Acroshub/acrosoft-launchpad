-- ── SEC-9 · Storage bucket MIME type hardening ───────────────────────────────

-- form-uploads: remove image/svg+xml — SVGs can embed JavaScript (XSS vector)
UPDATE storage.buckets
   SET allowed_mime_types = ARRAY[
     'image/jpeg', 'image/png', 'image/webp', 'image/gif',
     'application/pdf'
   ]
 WHERE id = 'form-uploads';

-- master-docs: restrict to markdown/plain text only
-- (generate-master-doc uploads text/markdown; plain text as safe fallback)
UPDATE storage.buckets
   SET allowed_mime_types = ARRAY['text/markdown', 'text/plain']
 WHERE id = 'master-docs';
