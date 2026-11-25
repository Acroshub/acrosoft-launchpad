-- «Onboarding Acros» (/onboarding-acros) pide además el nombre de la persona, la dirección del negocio y el EIN.
-- El formulario vive en crm_forms (no en el código). Orden en la pestaña «Negocio»: Nombre → Nombre del negocio → Teléfono →
-- Dirección del negocio (Calle, Ciudad, Estado, Zip Code) → EIN → Horario → Zona.
-- «Nombre» va primero a propósito: crm-form-public nombra el contacto con el primer campo de texto cuya etiqueta contiene «nombre».
-- El EIN es opcional (hay negocios que no tienen). El Zip es texto: en Massachusetts empiezan por 0.
-- Idempotente: no hace nada si los campos ya están.
WITH nuevos (ord, campo) AS (
  VALUES
    (0.5, '{"id":"ob-contact-name","type":"text","label":"Nombre","required":true,"sectionId":"s-negocio","placeholder":"Tu nombre y apellido"}'::jsonb),
    (2.1, '{"id":"ob-h-address","type":"heading","label":"Dirección del negocio","required":false,"sectionId":"s-negocio"}'::jsonb),
    (2.2, '{"id":"ob-street","type":"text","label":"Calle","required":true,"sectionId":"s-negocio","placeholder":"Ej: 123 Main St"}'::jsonb),
    (2.3, '{"id":"ob-city","type":"text","label":"Ciudad","required":true,"sectionId":"s-negocio","placeholder":"Ej: Dallas"}'::jsonb),
    (2.4, '{"id":"ob-state","type":"text","label":"Estado","required":true,"sectionId":"s-negocio","placeholder":"Ej: Texas"}'::jsonb),
    (2.5, '{"id":"ob-zip","type":"text","label":"Zip Code","required":true,"sectionId":"s-negocio","placeholder":"Ej: 75201"}'::jsonb),
    (2.6, '{"id":"ob-ein","type":"text","label":"EIN (opcional)","helpText":"El número de identificación federal de tu negocio (9 dígitos). Si no tienes, déjalo en blanco.","required":false,"sectionId":"s-negocio","placeholder":"12-3456789"}'::jsonb)
)
UPDATE public.crm_forms AS f
SET fields = (
  SELECT jsonb_agg(x.campo ORDER BY x.ord)
  FROM (
    SELECT t.ord::numeric AS ord, t.campo FROM jsonb_array_elements(f.fields::jsonb) WITH ORDINALITY AS t (campo, ord)
    UNION ALL
    SELECT n.ord, n.campo FROM nuevos n
  ) x
)
WHERE f.slug = 'onboarding-acros'
  AND f.user_id = public.get_admin_user_id()
  AND NOT f.fields::jsonb @> '[{"id":"ob-contact-name"}]'::jsonb;
