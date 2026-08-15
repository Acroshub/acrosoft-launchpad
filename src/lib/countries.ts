// Lista maestra de países soportados: moneda → país
// Fuente única de verdad para todos los selectores de países del sistema.
// Los selectores muestran solo los países cuya moneda está configurada en crm_prices del usuario.

export type CountryOption = {
  currency: string  // código de moneda (BOB, USD, ARS…)
  code: string      // código ISO 3166-1 alpha-2 (BO, US, AR…)
  dial: string      // prefijo telefónico con + (+591, +1…)
  dialRaw: string   // prefijo sin + para matching de números WhatsApp
  flag: string      // emoji bandera
  name: string      // nombre en español
}

export const ALL_COUNTRY_OPTIONS: CountryOption[] = [
  { currency: "BOB", code: "BO", dial: "+591", dialRaw: "591", flag: "🇧🇴", name: "Bolivia" },
  { currency: "ARS", code: "AR", dial: "+54",  dialRaw: "54",  flag: "🇦🇷", name: "Argentina" },
  { currency: "CLP", code: "CL", dial: "+56",  dialRaw: "56",  flag: "🇨🇱", name: "Chile" },
  { currency: "COP", code: "CO", dial: "+57",  dialRaw: "57",  flag: "🇨🇴", name: "Colombia" },
  { currency: "MXN", code: "MX", dial: "+52",  dialRaw: "52",  flag: "🇲🇽", name: "México" },
  { currency: "PEN", code: "PE", dial: "+51",  dialRaw: "51",  flag: "🇵🇪", name: "Perú" },
  { currency: "PYG", code: "PY", dial: "+595", dialRaw: "595", flag: "🇵🇾", name: "Paraguay" },
  { currency: "UYU", code: "UY", dial: "+598", dialRaw: "598", flag: "🇺🇾", name: "Uruguay" },
  { currency: "VES", code: "VE", dial: "+58",  dialRaw: "58",  flag: "🇻🇪", name: "Venezuela" },
  { currency: "BRL", code: "BR", dial: "+55",  dialRaw: "55",  flag: "🇧🇷", name: "Brasil" },
  { currency: "EUR", code: "ES", dial: "+34",  dialRaw: "34",  flag: "🇪🇸", name: "España" },
  { currency: "GBP", code: "GB", dial: "+44",  dialRaw: "44",  flag: "🇬🇧", name: "Reino Unido" },
  { currency: "CAD", code: "CA", dial: "+1",   dialRaw: "1",   flag: "🇨🇦", name: "Canadá" },
  // USD cubre varios países; se listan por separado para que el usuario asigne secuencias distintas
  { currency: "USD", code: "US", dial: "+1",   dialRaw: "1",   flag: "🇺🇸", name: "Estados Unidos" },
  { currency: "USD", code: "EC", dial: "+593", dialRaw: "593", flag: "🇪🇨", name: "Ecuador" },
]

// ─── Países para enrutar flujos por el teléfono del contacto ─────────────────
// Lista aparte de ALL_COUNTRY_OPTIONS a propósito: esa se filtra por las monedas en las que el
// usuario cobra (útil para precios), pero a QUIÉN le habla un flujo no tiene nada que ver con eso
// — un negocio que cobra solo en COP igual recibe mensajes de México o España.
//
// ⚠️ `code` y `dialRaw` deben coincidir EXACTAMENTE con COUNTRY_PREFIX_MAP de
// `supabase/functions/ai-agent/index.ts`: `code` es lo que se guarda en
// `crm_wa_flows.country_sequences` y lo que el runtime compara contra el teléfono del contacto.
// Si se agrega un país acá y no allá, el flujo nunca se dispara para ese país (y al revés).
export type RoutingCountry = { code: string; dialRaw: string; flag: string; name: string }

export const FLOW_COUNTRY_OPTIONS: RoutingCountry[] = [
  // Latinoamérica y España primero: es de donde viene la mayoría de los contactos
  { code: "MX", dialRaw: "52",  flag: "🇲🇽", name: "México" },
  { code: "CO", dialRaw: "57",  flag: "🇨🇴", name: "Colombia" },
  { code: "AR", dialRaw: "54",  flag: "🇦🇷", name: "Argentina" },
  { code: "CL", dialRaw: "56",  flag: "🇨🇱", name: "Chile" },
  { code: "PE", dialRaw: "51",  flag: "🇵🇪", name: "Perú" },
  { code: "EC", dialRaw: "593", flag: "🇪🇨", name: "Ecuador" },
  { code: "BO", dialRaw: "591", flag: "🇧🇴", name: "Bolivia" },
  { code: "VE", dialRaw: "58",  flag: "🇻🇪", name: "Venezuela" },
  { code: "UY", dialRaw: "598", flag: "🇺🇾", name: "Uruguay" },
  { code: "PY", dialRaw: "595", flag: "🇵🇾", name: "Paraguay" },
  { code: "BR", dialRaw: "55",  flag: "🇧🇷", name: "Brasil" },
  { code: "GT", dialRaw: "502", flag: "🇬🇹", name: "Guatemala" },
  { code: "SV", dialRaw: "503", flag: "🇸🇻", name: "El Salvador" },
  { code: "HN", dialRaw: "504", flag: "🇭🇳", name: "Honduras" },
  { code: "NI", dialRaw: "505", flag: "🇳🇮", name: "Nicaragua" },
  { code: "CR", dialRaw: "506", flag: "🇨🇷", name: "Costa Rica" },
  { code: "PA", dialRaw: "507", flag: "🇵🇦", name: "Panamá" },
  { code: "CU", dialRaw: "53",  flag: "🇨🇺", name: "Cuba" },
  { code: "ES", dialRaw: "34",  flag: "🇪🇸", name: "España" },
  { code: "US", dialRaw: "1",   flag: "🇺🇸", name: "USA / Canadá" },
  // Resto del mundo
  { code: "GB", dialRaw: "44",  flag: "🇬🇧", name: "Reino Unido" },
  { code: "PT", dialRaw: "351", flag: "🇵🇹", name: "Portugal" },
  { code: "FR", dialRaw: "33",  flag: "🇫🇷", name: "Francia" },
  { code: "DE", dialRaw: "49",  flag: "🇩🇪", name: "Alemania" },
  { code: "IT", dialRaw: "39",  flag: "🇮🇹", name: "Italia" },
  { code: "NL", dialRaw: "31",  flag: "🇳🇱", name: "Países Bajos" },
  { code: "AU", dialRaw: "61",  flag: "🇦🇺", name: "Australia" },
  { code: "NZ", dialRaw: "64",  flag: "🇳🇿", name: "Nueva Zelanda" },
  { code: "JP", dialRaw: "81",  flag: "🇯🇵", name: "Japón" },
  { code: "KR", dialRaw: "82",  flag: "🇰🇷", name: "Corea del Sur" },
  { code: "CN", dialRaw: "86",  flag: "🇨🇳", name: "China" },
  { code: "IN", dialRaw: "91",  flag: "🇮🇳", name: "India" },
  { code: "AE", dialRaw: "971", flag: "🇦🇪", name: "Emiratos Árabes" },
  { code: "IL", dialRaw: "972", flag: "🇮🇱", name: "Israel" },
  { code: "SA", dialRaw: "966", flag: "🇸🇦", name: "Arabia Saudita" },
  { code: "EG", dialRaw: "20",  flag: "🇪🇬", name: "Egipto" },
  { code: "ZA", dialRaw: "27",  flag: "🇿🇦", name: "Sudáfrica" },
  { code: "NG", dialRaw: "234", flag: "🇳🇬", name: "Nigeria" },
]

export const FLOW_COUNTRY_BY_CODE: Record<string, RoutingCountry> = Object.fromEntries(
  FLOW_COUNTRY_OPTIONS.map(c => [c.code, c])
)

// Lookups rápidos
export const COUNTRY_BY_CODE: Record<string, CountryOption> = Object.fromEntries(
  ALL_COUNTRY_OPTIONS.map(c => [c.code, c])
)

export const COUNTRIES_BY_CURRENCY: Record<string, CountryOption[]> = ALL_COUNTRY_OPTIONS.reduce(
  (acc, c) => {
    if (!acc[c.currency]) acc[c.currency] = [];
    acc[c.currency].push(c);
    return acc;
  },
  {} as Record<string, CountryOption[]>
)
