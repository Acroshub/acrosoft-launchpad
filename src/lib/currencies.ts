export interface Currency {
  code: string;
  symbol: string;
  flag: string;
  name: string;
}

// Fuente de verdad única para todas las monedas soportadas
export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$",     flag: "🇺🇸", name: "Dólar (USD)" },
  { code: "BOB", symbol: "Bs",    flag: "🇧🇴", name: "Boliviano (BOB)" },
  { code: "PEN", symbol: "S/",    flag: "🇵🇪", name: "Sol (PEN)" },
  { code: "CLP", symbol: "CLP$",  flag: "🇨🇱", name: "Peso chileno (CLP)" },
  { code: "VES", symbol: "Bs",    flag: "🇻🇪", name: "Bolívar (VES)" },
  { code: "MXN", symbol: "MX$",   flag: "🇲🇽", name: "Peso mexicano (MXN)" },
  { code: "ARS", symbol: "ARS$",  flag: "🇦🇷", name: "Peso argentino (ARS)" },
  { code: "COP", symbol: "COP$",  flag: "🇨🇴", name: "Peso colombiano (COP)" },
  { code: "BRL", symbol: "R$",    flag: "🇧🇷", name: "Real brasileño (BRL)" },
  { code: "EUR", symbol: "€",     flag: "🇪🇺", name: "Euro (EUR)" },
  { code: "GBP", symbol: "£",     flag: "🇬🇧", name: "Libra (GBP)" },
];

export const CURRENCY_MAP: Record<string, Currency> = Object.fromEntries(
  CURRENCIES.map(c => [c.code, c]),
);

export function getCurrencySymbol(code: string): string {
  return CURRENCY_MAP[code?.toUpperCase()]?.symbol ?? code ?? "$";
}

export function getCurrencyFlag(code: string): string {
  return CURRENCY_MAP[code?.toUpperCase()]?.flag ?? "";
}

export function getCurrencyName(code: string): string {
  return CURRENCY_MAP[code?.toUpperCase()]?.name ?? code;
}

export function formatAmount(amount: number, currency?: string | null, decimals = 2): string {
  const sym = getCurrencySymbol((currency ?? "USD").toUpperCase());
  return `${sym}${Number(amount).toFixed(decimals)}`;
}

/**
 * Detecta la moneda por prefijo telefónico.
 * Retorna null si no se reconoce el prefijo.
 */
export function getCurrencyFromPhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-().]/g, "");
  // El orden importa: prefijos más largos primero para evitar falsos positivos
  const prefixMap: [string, string][] = [
    ["+593", "USD"],  // Ecuador
    ["+591", "BOB"],  // Bolivia
    ["+598", "USD"],  // Uruguay
    ["+595", "USD"],  // Paraguay
    ["+599", "USD"],  // Antillas Holandesas
    ["+596", "EUR"],  // Martinica
    ["+597", "USD"],  // Surinam
    ["+58",  "VES"],  // Venezuela
    ["+57",  "COP"],  // Colombia
    ["+56",  "CLP"],  // Chile
    ["+55",  "BRL"],  // Brasil
    ["+54",  "ARS"],  // Argentina
    ["+53",  "USD"],  // Cuba
    ["+52",  "MXN"],  // México
    ["+51",  "PEN"],  // Perú
    ["+1",   "USD"],  // EE.UU. / Canadá
    ["+44",  "GBP"],  // Reino Unido
    ["+49",  "EUR"],  // Alemania
    ["+34",  "EUR"],  // España
    ["+33",  "EUR"],  // Francia
  ];
  for (const [prefix, currency] of prefixMap) {
    if (cleaned.startsWith(prefix)) return currency;
  }
  return null;
}

/** Devuelve "🇧🇴 Bs 250.00" */
export function formatAmountWithFlag(amount: number, currency?: string | null, decimals = 2): string {
  const code = (currency ?? "USD").toUpperCase();
  const flag = getCurrencyFlag(code);
  const sym  = getCurrencySymbol(code);
  return `${flag} ${sym}${Number(amount).toFixed(decimals)}`;
}
