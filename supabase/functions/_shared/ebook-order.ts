// Lógica pura de una compra de ebook (sin red ni base de datos): a qué producto
// corresponde una sesión de Stripe, cómo se accede a su plataforma, y el email
// de confirmación. Vive acá y no en stripe-webhook para poder probarla.

import {
  DEFAULT_PRODUCT_SLUG,
  EBOOK_CATALOG,
  type EbookProduct,
  type EnvGetter,
} from "./ebook-catalog.ts";

const denoEnv: EnvGetter = (name) => Deno.env.get(name);

export type CheckoutSessionRef = {
  metadata?: Record<string, string> | null;
  client_reference_id?: string | null;
  payment_link?: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * client_reference_id = "<producto>" o "<producto>_<uuid>". El uuid es el id de la
 * fila de checkout_attribution que la landing guardó al hacer clic (user agent,
 * IP, fbp, fbc): permite mandar a Meta datos del navegador del comprador.
 * Se corta en el primer "_" a propósito: aunque lo que siga esté malformado, el
 * producto se reconoce igual.
 */
export function parseClientReference(ref: string | null | undefined): { slug: string; attributionId: string | null } | null {
  const clean = ref?.trim();
  if (!clean) return null;
  const [slug, rest] = clean.split("_", 2);
  if (!slug) return null;
  return { slug, attributionId: rest && UUID.test(rest) ? rest.toLowerCase() : null };
}

/**
 * A qué producto corresponde la sesión, en este orden:
 *  1. metadata.product_slug (si el Payment Link lo trae; un slug desconocido lo rechaza el llamador)
 *  2. client_reference_id — la landing lo agrega al link (?client_reference_id=toefl-b2_<uuid>)
 *  3. el id del Payment Link, si está listado en el secret del producto
 *  4. delf-a2, porque los links de DELF no llevan ninguna de las anteriores
 */
export function resolveProductSlug(
  session: CheckoutSessionRef,
  env: EnvGetter = denoEnv,
  catalog: Record<string, EbookProduct> = EBOOK_CATALOG,
): string {
  const fromMetadata = session.metadata?.product_slug?.trim();
  if (fromMetadata) return fromMetadata;

  const ref = parseClientReference(session.client_reference_id)?.slug;
  if (ref && Object.hasOwn(catalog, ref)) return ref;

  const link = session.payment_link?.trim();
  if (link) {
    for (const [slug, product] of Object.entries(catalog)) {
      const ids = product.paymentLinkIdsEnv ? env(product.paymentLinkIdsEnv) : undefined;
      if (ids && ids.split(",").map((s) => s.trim()).includes(link)) return slug;
    }
  }
  return DEFAULT_PRODUCT_SLUG;
}

export type PlatformAccess = { name: string; path: string; password: string | null };

/** Acceso a la plataforma del producto; null si el producto no trae ninguna. password=null si el secret no está configurado. */
export function platformAccess(product: EbookProduct, env: EnvGetter = denoEnv): PlatformAccess | null {
  if (!product.platform) return null;
  const password = env(product.platform.passwordEnv)?.trim() || null;
  return { name: product.platform.name, path: product.platform.path, password };
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildConfirmationEmailHtml(params: {
  productName: string;
  thankYouUrl: string;
  amountLabel: string;
  /** Solo se muestra si trae contraseña: un bloque con el link pero sin contraseña confunde más de lo que ayuda. */
  platform?: { name: string; url: string; password: string | null } | null;
}): string {
  const { productName, thankYouUrl, amountLabel, platform } = params;

  const platformBlock = platform?.password
    ? `
        <div style="margin:0 0 24px;padding:20px;background:#FAF6EF;border:1px solid #DED6BC;border-radius:10px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#8C6A1E;letter-spacing:.08em;text-transform:uppercase;">Bono 1 · ${escapeHtml(platform.name)}</p>
          <p style="margin:0 0 14px;font-size:14.5px;color:#22262E;line-height:1.55;">Tu plataforma de práctica: audios con voz real, simulacro cronometrado, sala de Writing y plantillas. Entra con esta contraseña:</p>
          <p style="margin:0 0 16px;text-align:center;"><span style="display:inline-block;background:#FFFFFF;border:1px dashed #C9932E;border-radius:8px;padding:12px 20px;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:700;letter-spacing:.04em;color:#1B2A4A;">${escapeHtml(platform.password)}</span></p>
          <div style="text-align:center;"><a href="${platform.url}" style="display:inline-block;background:#1B2A4A;color:#FFFFFF;font-weight:700;font-size:15px;padding:14px 24px;border-radius:8px;text-decoration:none;">Abrir la plataforma</a></div>
        </div>`
    : "";

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#FAF6EF;padding:32px 16px;">
    <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #DED6BC;">
      <div style="background:#1B2A4A;padding:28px 28px 24px;text-align:center;">
        <p style="margin:0;color:#C9932E;font-weight:700;font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;">Compra confirmada</p>
        <h1 style="margin:10px 0 0;color:#FFFFFF;font-size:22px;font-family:Georgia,serif;">¡Gracias por tu compra!</h1>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 16px;font-size:15px;color:#22262E;line-height:1.6;">Tu pago de <strong>${amountLabel}</strong> por <strong>${productName}</strong> fue aprobado. Ya puedes descargar tus archivos${platformBlock ? " y entrar a tu plataforma de práctica" : ""}.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${thankYouUrl}" style="display:inline-block;background:#C1403A;color:#FFFFFF;font-weight:900;font-size:16px;padding:16px 28px;border-radius:8px;text-decoration:none;">Ver mi compra y descargar</a>
        </div>${platformBlock}
        <p style="margin:0;font-size:13px;color:#5B6270;line-height:1.5;">Guarda este correo — este mismo enlace te sirve para volver a descargar tus archivos cuando quieras${platformBlock ? ", y aquí queda tu contraseña de la plataforma" : ""}.</p>
      </div>
    </div>
  </div>`;
}
