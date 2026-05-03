export interface PhoneCountry {
  code: string;
  name: string;
  dial: string;
  flag: string;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  // Priority — most common for Acrosoft clients
  { code: "BO", name: "Bolivia",      dial: "+591", flag: "🇧🇴" },
  { code: "MX", name: "México",       dial: "+52",  flag: "🇲🇽" },
  { code: "US", name: "USA",          dial: "+1",   flag: "🇺🇸" },
  { code: "ES", name: "España",       dial: "+34",  flag: "🇪🇸" },
  { code: "AR", name: "Argentina",    dial: "+54",  flag: "🇦🇷" },
  { code: "CO", name: "Colombia",     dial: "+57",  flag: "🇨🇴" },
  { code: "CL", name: "Chile",        dial: "+56",  flag: "🇨🇱" },
  // Rest of LATAM alphabetical
  { code: "BR", name: "Brasil",       dial: "+55",  flag: "🇧🇷" },
  { code: "CR", name: "Costa Rica",   dial: "+506", flag: "🇨🇷" },
  { code: "CU", name: "Cuba",         dial: "+53",  flag: "🇨🇺" },
  { code: "DO", name: "Rep. Dom.",    dial: "+1",   flag: "🇩🇴" },
  { code: "EC", name: "Ecuador",      dial: "+593", flag: "🇪🇨" },
  { code: "GT", name: "Guatemala",    dial: "+502", flag: "🇬🇹" },
  { code: "HN", name: "Honduras",     dial: "+504", flag: "🇭🇳" },
  { code: "NI", name: "Nicaragua",    dial: "+505", flag: "🇳🇮" },
  { code: "PA", name: "Panamá",       dial: "+507", flag: "🇵🇦" },
  { code: "PE", name: "Perú",         dial: "+51",  flag: "🇵🇪" },
  { code: "PR", name: "Puerto Rico",  dial: "+1",   flag: "🇵🇷" },
  { code: "PY", name: "Paraguay",     dial: "+595", flag: "🇵🇾" },
  { code: "SV", name: "El Salvador",  dial: "+503", flag: "🇸🇻" },
  { code: "UY", name: "Uruguay",      dial: "+598", flag: "🇺🇾" },
  { code: "VE", name: "Venezuela",    dial: "+58",  flag: "🇻🇪" },
  // Europe & North America
  { code: "CA", name: "Canadá",       dial: "+1",   flag: "🇨🇦" },
  { code: "DE", name: "Alemania",     dial: "+49",  flag: "🇩🇪" },
  { code: "FR", name: "Francia",      dial: "+33",  flag: "🇫🇷" },
  { code: "GB", name: "Reino Unido",  dial: "+44",  flag: "🇬🇧" },
  { code: "IT", name: "Italia",       dial: "+39",  flag: "🇮🇹" },
  { code: "PT", name: "Portugal",     dial: "+351", flag: "🇵🇹" },
];

export const DEFAULT_COUNTRY = PHONE_COUNTRIES[0]; // Bolivia

export function parsePhoneValue(value: string): { dial: string; number: string } {
  if (!value) return { dial: DEFAULT_COUNTRY.dial, number: "" };
  if (value.startsWith("+")) {
    // Longest match first to avoid "+1" matching "+1xxx" before "+593"
    const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
    for (const c of sorted) {
      if (value.startsWith(c.dial)) {
        return { dial: c.dial, number: value.slice(c.dial.length).trim() };
      }
    }
  }
  return { dial: DEFAULT_COUNTRY.dial, number: value };
}
