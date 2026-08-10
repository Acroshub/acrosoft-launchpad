-- Fix: get_ai_usage_by_account() failed on every call with
-- "ERROR: 42702: column reference ... is ambiguous" — the RETURNS TABLE
-- output columns `email` and `user_id` (added by fix_ai_usage_reports_admin_guard)
-- collide with bare, unqualified references to those same names inside the
-- `admin` and `total_cost_all` CTEs. Also casts au.email (varchar(255) in
-- auth.users) to text to match the declared OUT column type. Panel
-- Ajustes → Costos IA showed "Sin datos" for any date range because the
-- frontend swallows the RPC error and just renders an empty rows array.

CREATE OR REPLACE FUNCTION public.get_ai_usage_by_account(
  p_from timestamp with time zone,
  p_to timestamp with time zone
)
RETURNS TABLE(
  user_id uuid, business_name text, email text,
  total_calls bigint, total_input bigint, total_output bigint,
  total_cache_read bigint, total_cache_creation bigint, total_cost numeric,
  revenue_usd numeric, revenue_has_data boolean,
  margin_cost_usd numeric, covered_by_admin_usd numeric,
  is_admin_account boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_acrosoft_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH admin AS (
    SELECT au_admin.id FROM auth.users au_admin
    WHERE au_admin.email = 'e.daniel.acero.r@gmail.com' LIMIT 1
  ),
  fx_bob AS (
    SELECT rate FROM crm_fx_rates WHERE currency_pair = 'BOB_USD'
  ),
  total_revenue AS (
    SELECT
      ca.client_user_id AS biz_user_id,
      SUM(
        CASE
          WHEN s.currency = 'USD' THEN s.amount
          WHEN s.currency = 'BOB' THEN s.amount / NULLIF((SELECT rate FROM fx_bob), 0)
          ELSE NULL
        END
      ) AS revenue_usd
    FROM crm_sales s
    JOIN crm_client_accounts ca ON ca.contact_id = s.contact_id
    WHERE s.user_id = (SELECT id FROM admin)
      AND s.is_paid = true
      AND ca.client_user_id IS NOT NULL
    GROUP BY ca.client_user_id
  ),
  total_cost_all AS (
    SELECT l2.user_id AS biz_user_id, COALESCE(SUM(l2.cost_usd), 0) AS cost_usd
    FROM crm_ai_usage_log l2
    GROUP BY l2.user_id
  ),
  filtered AS (
    SELECT
      l.user_id,
      COUNT(*)                                          AS total_calls,
      COALESCE(SUM(l.input_tokens), 0)::bigint          AS total_input,
      COALESCE(SUM(l.output_tokens), 0)::bigint         AS total_output,
      COALESCE(SUM(l.cache_read_tokens), 0)::bigint     AS total_cache_read,
      COALESCE(SUM(l.cache_creation_tokens), 0)::bigint AS total_cache_creation,
      COALESCE(SUM(l.cost_usd), 0)                      AS total_cost
    FROM crm_ai_usage_log l
    WHERE l.created_at BETWEEN p_from AND p_to
    GROUP BY l.user_id
  ),
  all_accounts AS (
    SELECT DISTINCT l.user_id FROM crm_ai_usage_log l
  )
  SELECT
    ab.user_id, bp.business_name, au.email::text,
    COALESCE(f.total_calls, 0)             AS total_calls,
    COALESCE(f.total_input, 0)             AS total_input,
    COALESCE(f.total_output, 0)            AS total_output,
    COALESCE(f.total_cache_read, 0)        AS total_cache_read,
    COALESCE(f.total_cache_creation, 0)    AS total_cache_creation,
    COALESCE(f.total_cost, 0)              AS total_cost,
    tr.revenue_usd,
    (tr.revenue_usd IS NOT NULL AND tr.revenue_usd > 0) AS revenue_has_data,
    COALESCE(tc.cost_usd, 0)               AS margin_cost_usd,
    GREATEST(0, COALESCE(tc.cost_usd, 0) - COALESCE(tr.revenue_usd, 0)) AS covered_by_admin_usd,
    (ab.user_id = (SELECT id FROM admin)) AS is_admin_account
  FROM all_accounts ab
  LEFT JOIN crm_business_profile bp ON bp.user_id = ab.user_id
  LEFT JOIN auth.users au ON au.id = ab.user_id
  LEFT JOIN filtered f ON f.user_id = ab.user_id
  LEFT JOIN total_revenue tr ON tr.biz_user_id = ab.user_id
  LEFT JOIN total_cost_all tc ON tc.biz_user_id = ab.user_id
  ORDER BY total_cost DESC NULLS LAST;
END;
$function$;
