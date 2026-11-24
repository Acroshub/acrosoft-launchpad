-- Split test de /website-tree: la landing normal y la gamificada se reparten el tráfico 50/50.
--
-- Cada visitante se cuenta UNA vez (visitor_id = uuid guardado en su navegador) con la versión que le tocó. Los leads
-- NO viven aquí: quedan en crm_contacts con la etiqueta website-tree-v-normal / website-tree-v-game (ver website-tree-request).
-- Solo escribe la Edge Function con service role: RLS activado y SIN policies = ni anon ni authenticated leen ni escriben.
CREATE TABLE IF NOT EXISTS public.website_tree_split_visits (
  visitor_id    uuid PRIMARY KEY,
  variant       text NOT NULL CHECK (variant IN ('normal', 'game')),
  first_seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.website_tree_split_visits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.website_tree_split_visits FROM anon, authenticated;

-- Resultado del test por versión: visitantes únicos, contactos que dejaron sus datos (paso 1), pedidos completos y sus tasas.
-- Se consulta desde el SQL editor / service role; no se expone a anon ni authenticated
-- (security_invoker: respeta el RLS de quien la consulta).
CREATE OR REPLACE VIEW public.website_tree_split_stats WITH (security_invoker = true) AS
WITH versions(variant) AS (VALUES ('normal'), ('game')),
visits AS (
  SELECT variant, count(*) AS visitantes FROM public.website_tree_split_visits GROUP BY variant
),
leads AS (
  SELECT v.variant,
         count(*) AS contactos,
         count(*) FILTER (WHERE 'website-tree' = ANY (c.tags)) AS pedidos_completos
  FROM versions v
  JOIN public.crm_contacts c ON ('website-tree-v-' || v.variant) = ANY (c.tags) AND c.user_id = public.get_admin_user_id()
  GROUP BY v.variant
)
SELECT v.variant,
       coalesce(vi.visitantes, 0)       AS visitantes,
       coalesce(l.contactos, 0)         AS contactos_paso_1,
       coalesce(l.pedidos_completos, 0) AS pedidos_completos,
       round(100.0 * coalesce(l.contactos, 0) / nullif(vi.visitantes, 0), 1)         AS pct_paso_1,
       round(100.0 * coalesce(l.pedidos_completos, 0) / nullif(vi.visitantes, 0), 1) AS pct_pedido_completo
FROM versions v
LEFT JOIN visits vi USING (variant)
LEFT JOIN leads l USING (variant)
ORDER BY v.variant;

REVOKE ALL ON public.website_tree_split_stats FROM anon, authenticated;
