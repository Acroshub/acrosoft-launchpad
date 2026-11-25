// Documento «Onboarding para Google Ads»: una COPIA editable de las respuestas del formulario «Onboarding Acros», que se abre con un link público
// (/onboarding-google/:token, tabla crm_onboarding_docs, Edge Function onboarding-doc). Editar el documento no cambia la ficha del contacto.

/** Fila de crm_forms con slug «onboarding-acros» (la misma que renderiza /onboarding-acros). */
export const ONBOARDING_FORM_ID = "2b6d1dae-110e-4e23-9442-540210d4d03d";
export const ONBOARDING_DOC_PATH = "/onboarding-google";
/** Mismo tope que valida la Edge Function y el CHECK de la tabla. */
export const ONBOARDING_DOC_MAX_CHARS = 100_000;

export type OnboardingContact = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  custom_fields: unknown;
};

type Values = Record<string, unknown>;

const text = (v: unknown): string => (typeof v === "string" || typeof v === "number" ? String(v).trim() : "");

export const onboardingValues = (contact: OnboardingContact): Values | null => {
  const values = (contact.custom_fields as Record<string, unknown> | null)?.[ONBOARDING_FORM_ID];
  if (!values || typeof values !== "object") return null;
  const filled = Object.values(values as Values).some((v) => (Array.isArray(v) ? v.length > 0 : typeof v === "object" ? !!v : !!text(v)));
  return filled ? (values as Values) : null;
};

/** Últimos 10 dígitos: iguala «+1 781 268 3755» con «(781) 268-3755». Con menos de 8 dígitos no se compara. */
const phoneKey = (phone: string | null): string => {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length < 8 ? "" : digits.slice(-10);
};

/**
 * Contacto del que salen los datos del onboarding. El formulario no pide email, así que cada envío crea un contacto nuevo: quien agendó la cita
 * y quien llenó el onboarding suelen ser dos fichas. Si la ficha de la cita no tiene el formulario, se busca otra de la misma cuenta con el
 * mismo teléfono (la lista viene de la más nueva a la más vieja: gana el envío más reciente).
 */
export const findOnboardingSource = <T extends OnboardingContact>(contact: T, contacts: T[]): T | null => {
  if (onboardingValues(contact)) return contact;
  const key = phoneKey(contact.phone);
  if (!key) return null;
  return contacts.find((c) => c.user_id === contact.user_id && phoneKey(c.phone) === key && !!onboardingValues(c)) ?? null;
};

/** Acceso SaaS vigente: activo y sin vencer (el mismo «Activo» que muestra la ficha). `today` en formato AAAA-MM-DD. */
export const hasActiveSaasAccess = (
  access: { status: string; expires_at?: string | null } | null | undefined,
  today = new Date().toISOString().split("T")[0],
): boolean => access?.status === "active" && !(access.expires_at && access.expires_at < today);

/** Respaldo para envíos anteriores al campo «Nombre» del formulario: sale de la ficha, salvo que la ficha se llame como el negocio. */
export const personName = (businessName: string, ...contacts: OnboardingContact[]): string => {
  const business = businessName.trim().toLowerCase();
  return (
    contacts
      .map((c) => c.name.trim())
      .find((n) => !!n && n !== "Sin nombre" && n.toLowerCase() !== business) ?? ""
  );
};

// ─── Plantilla ────────────────────────────────────────────────────────────────
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const multiline = (s: string) => escapeHtml(s).replace(/\r?\n/g, "<br>");

const ADDRESS_PARTS = [["Calle", "ob-street"], ["Ciudad", "ob-city"], ["Estado", "ob-state"], ["Zip Code", "ob-zip"]] as const;

const line = (label: string, value = "") => `<p><strong>${label}:</strong>&nbsp;${escapeHtml(value)}</p>`;
const block = (label: string, value: string) => `<p><strong>${label}:</strong></p><p>${value ? multiline(value) : "<br>"}</p>`;

const formatBudget = (raw: string): string => {
  const n = Number(raw.replace(/[$,\s]/g, ""));
  return raw && Number.isFinite(n) ? `US$${n.toLocaleString("en-US")} al mes` : raw;
};

/**
 * Lo que falte sale en blanco para completarlo en el documento (landing page y tracking no se preguntan en el formulario).
 * `fallbackName` solo se usa si la respuesta no trae el nombre de la persona.
 */
export const buildOnboardingDocHtml = (values: Values, fallbackName: string): string => {
  const services = (Array.isArray(values["ob-services"]) ? (values["ob-services"] as Values[]) : [])
    .map((s) => text(s?.name))
    .filter(Boolean);

  return [
    "<h1>Onboarding para Google Ads</h1>",
    line("Nombre", text(values["ob-contact-name"]) || fallbackName),
    line("Nombre del negocio", text(values["ob-name"])),
    line("Teléfono del negocio", text(values["ob-phone"])),
    "<p><strong>Dirección del negocio:</strong></p>",
    `<ul>${ADDRESS_PARTS.map(([label, id]) => `<li>${label}:&nbsp;${escapeHtml(text(values[id]))}</li>`).join("")}</ul>`,
    line("EIN", text(values["ob-ein"])),
    block("Zona que atiende", text(values["ob-zone"])),
    line("Idioma", text(values["ob-lang"])),
    "<p><strong>Servicios que quieres promocionar:</strong></p>",
    services.length ? `<ol>${services.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>` : "<p><br></p>",
    "<p><strong>Servicios que <mark>NO</mark> promocionas:</strong></p>",
    `<p>${text(values["ob-negatives"]) ? multiline(text(values["ob-negatives"])) : "<br>"}</p>`,
    line("Presupuesto", formatBudget(text(values["ob-budget"]))),
    block("Landing Page", ""),
    block("Códigos de Tracking", ""),
  ].join("");
};

// ─── Limpieza del HTML ────────────────────────────────────────────────────────
// El documento lo puede editar cualquiera que tenga el link y se pinta en el mismo dominio que el CRM: nada entra al DOM sin pasar por aquí.
// Se reconstruye desde una lista cerrada de etiquetas y no se copia ningún atributo (salvo el href http/mailto de un enlace).
const ALLOWED = new Set(["h1", "h2", "h3", "p", "div", "br", "strong", "b", "em", "i", "u", "s", "mark", "small", "ul", "ol", "li", "a"]);
/** Etiquetas cuyo contenido tampoco se conserva. */
const DROPPED = new Set(["script", "style", "template", "iframe", "frame", "object", "embed", "noscript", "svg", "math", "title", "textarea", "select", "xmp"]);
const SAFE_HREF = /^(https?:\/\/|mailto:)/i;

export const sanitizeDocHtml = (html: string): string => {
  // DOMParser crea un documento inerte: no ejecuta scripts ni descarga recursos mientras se analiza.
  const source = new DOMParser().parseFromString(html, "text/html");
  const out = source.implementation.createHTMLDocument("");

  const copy = (from: Node, to: Node) => {
    from.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        to.appendChild(out.createTextNode(node.textContent ?? ""));
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      const tag = el.localName.toLowerCase();
      if (DROPPED.has(tag)) return;
      if (!ALLOWED.has(tag)) { copy(el, to); return; }
      const clean = out.createElement(tag);
      const href = tag === "a" ? (el.getAttribute("href") ?? "").trim() : "";
      if (SAFE_HREF.test(href)) {
        clean.setAttribute("href", href);
        clean.setAttribute("target", "_blank");
        clean.setAttribute("rel", "noopener noreferrer");
      }
      copy(el, clean);
      to.appendChild(clean);
    });
  };

  copy(source.body, out.body);
  return out.body.innerHTML;
};
