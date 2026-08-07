import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const BCB_URL = "https://www.bcb.gob.bo/tiposDeCambioHistorico/index.php";

/**
 * La tabla histórica del BCB (bolivianos por 1 USD) es HTML plano generado en
 * servidor, sin JS: una fila por día del mes, 24 celdas de datos (12 meses ×
 * VENTA/COMPRA), separador decimal coma, celdas vacías como &nbsp;. Se agrega
 * un año por página (?anio=YYYY). Verificado con curl directo — sin bloqueos
 * de user-agent ni contenido cargado por JS.
 */
async function fetchLatestVenta(year: number, month1to12: number): Promise<{ rate: number; day: number } | null> {
  const res = await fetch(`${BCB_URL}?anio=${year}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AcrosoftFXBot/1.0; +https://acrosoft.com)" },
  });
  if (!res.ok) throw new Error(`BCB respondió ${res.status}`);
  const html = await res.text();

  // Índice (0-based) de la celda VENTA de este mes dentro de las 24 celdas de datos.
  const ventaCellIndex = (month1to12 - 1) * 2;

  const rowRe = /<tr><td class='textoDatos'>(\d{1,2})<\/td>((?:<td class='textoDatos'>[^<]*<\/td>){24})<\/tr>/g;
  let best: { rate: number; day: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html))) {
    const day = Number(m[1]);
    const cells = [...m[2].matchAll(/<td class='textoDatos'>([^<]*)<\/td>/g)].map(c => c[1].trim());
    const raw = cells[ventaCellIndex];
    if (!raw || raw === "&nbsp;" || raw === "") continue;
    const rate = Number(raw.replace(",", "."));
    if (!Number.isFinite(rate) || rate <= 0) continue;
    if (!best || day > best.day) best = { rate, day };
  }
  return best;
}

Deno.serve(async () => {
  try {
    // Fecha de Bolivia (UTC-4) — determina de qué mes/año leer la tabla.
    const bolivia = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const year = bolivia.getUTCFullYear();
    const month = bolivia.getUTCMonth() + 1;

    let result = await fetchLatestVenta(year, month);
    if (!result) {
      // El mes recién empezó y aún no hay cotizaciones — usar el mes anterior.
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      result = await fetchLatestVenta(prevYear, prevMonth);
    }
    if (!result) throw new Error("no se encontró ninguna cotización reciente en la tabla del BCB");

    const { error } = await supabase.from("crm_fx_rates").upsert({
      currency_pair: "BOB_USD",
      rate: result.rate,
      source: `BCB — Valor Referencial del Dólar (venta), bcb.gob.bo/tiposDeCambioHistorico, día ${result.day}/${month}/${year}`,
      updated_at: new Date().toISOString(),
    }, { onConflict: "currency_pair" });
    if (error) throw error;

    console.log(`[update-fx-rate] BOB_USD = ${result.rate} (día ${result.day}/${month}/${year})`);
    return new Response(JSON.stringify({ ok: true, rate: result.rate, day: result.day, month, year }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[update-fx-rate] error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
