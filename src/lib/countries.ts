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
