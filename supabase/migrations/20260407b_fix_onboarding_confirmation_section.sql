-- Patch: marca sec-8 como isConfirmation en Onboarding Oficial v3
-- Corre este SQL en Supabase > SQL Editor si ya habías aplicado el migration anterior

UPDATE crm_forms
SET sections = (
  SELECT jsonb_agg(
    CASE
      WHEN sec->>'id' = 'sec-8'
      THEN sec || '{"isConfirmation": true}'::jsonb
      ELSE sec
    END
  )
  FROM jsonb_array_elements(sections) AS sec
)
WHERE id = 'b733e0c5-60d4-414d-896a-5ce459b07eaf';
