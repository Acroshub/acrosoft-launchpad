-- B15-3: Seguimiento de costos de Claude IA por cuenta

CREATE TABLE IF NOT EXISTS crm_ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES crm_wa_conversations(id) ON DELETE SET NULL,
  model text NOT NULL,
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  cost_usd numeric(10,6) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_ai_usage_log_user_created_idx ON crm_ai_usage_log(user_id, created_at DESC);

ALTER TABLE crm_ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_read" ON crm_ai_usage_log
  FOR SELECT USING ((auth.jwt() ->> 'email') = 'e.daniel.acero.r@gmail.com');

-- RPC para vista agregada por cuenta (SECURITY DEFINER bypassa RLS)
CREATE OR REPLACE FUNCTION get_ai_usage_by_account(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  business_name text,
  contact_email text,
  total_calls bigint,
  total_input bigint,
  total_output bigint,
  total_cost numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.user_id,
    bp.business_name,
    bp.contact_email,
    count(*)::bigint,
    coalesce(sum(l.input_tokens), 0)::bigint,
    coalesce(sum(l.output_tokens), 0)::bigint,
    coalesce(sum(l.cost_usd), 0)
  FROM crm_ai_usage_log l
  LEFT JOIN crm_business_profile bp ON bp.user_id = l.user_id
  WHERE
    (p_from IS NULL OR l.created_at >= p_from)
    AND (p_to IS NULL OR l.created_at <= p_to)
  GROUP BY l.user_id, bp.business_name, bp.contact_email
  ORDER BY coalesce(sum(l.cost_usd), 0) DESC;
$$;
