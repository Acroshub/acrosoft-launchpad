import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

/**
 * GET /functions/v1/vendor-landing-data?slug=<vendor_slug>
 *
 * Public endpoint — no auth required.
 * Returns only the public-safe data needed to render a vendor's landing page.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim();

  if (!slug) return respond({ error: "slug requerido" }, 400);

  const { data: vendor, error } = await supabase
    .from("crm_vendors")
    .select("id, name, slug, status, landing_calendar_id")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) return respond({ error: "Error interno" }, 500);
  if (!vendor) return respond(null, 404);

  return respond({
    name:                vendor.name,
    slug:                vendor.slug,
    landing_calendar_id: vendor.landing_calendar_id,
  });
});
