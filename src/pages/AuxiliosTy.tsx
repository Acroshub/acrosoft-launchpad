import { useEffect, useState } from "react";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import { AUXILIOS_PIXEL_ID } from "@/lib/auxiliosConfig";
import { copyText } from "./toefl-lab/format";

// Thank-you de «Primeros Auxilios del Bebé» — /auxilios-ty?session_id=…
// Muestra el resumen de la compra y el acceso a la app (link + contraseña). El ebook y los 3 bonos
// están dentro de la app (pestaña Biblioteca). Dispara Purchase una sola vez por compra confirmada.

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const IMG = "/auxilios/imagenes";

type OrderData = {
  productName: string;
  email: string;
  amountTotal: number;
  currency: string;
  /** custom_data del Purchase para el pixel: el mismo que manda stripe-webhook por Conversions API (valor, moneda, producto y orden). */
  tracking: Record<string, unknown>;
  /** null si el servidor no tiene la contraseña configurada. */
  platform: { name: string; path: string; password: string } | null;
};

type LoadState = "loading" | "ok" | "no-session" | "not-found";

function formatAmount(cents: number, currency: string): string {
  return `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

const AuxiliosTy = () => {
  const [state, setState] = useState<LoadState>("loading");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

  useEffect(() => {
    document.title = "Gracias por tu compra | Primeros Auxilios del Bebé";
    // Página privada: muestra los datos de una compra y la contraseña de la app.
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  useEffect(() => {
    if (!AUXILIOS_PIXEL_ID) return;
    initMetaPixel(AUXILIOS_PIXEL_ID);
    trackMetaEvent("PageView", undefined, undefined, AUXILIOS_PIXEL_ID);
  }, []);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) {
      setState("no-session");
      return;
    }
    fetch(`${FUNCTIONS_URL}/auxilios-get-order?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: OrderData) => {
        setOrder(data);
        setState("ok");
      })
      .catch(() => setState("not-found"));
  }, []);

  // Purchase solo se dispara una vez por compra CONFIRMADA: la página solo llega a "ok" si el webhook de Stripe
  // ya registró la orden (get-order devuelve 404 si no). Si el cliente vuelve a este link para ver su contraseña,
  // no se cuenta una segunda conversión. event_id = session_id de Stripe y value = el mismo que manda stripe-webhook
  // por Conversions API: así Meta deduplica las dos señales de la misma compra.
  useEffect(() => {
    if (!AUXILIOS_PIXEL_ID || state !== "ok" || !order) return;
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) return;
    const dedupeKey = `fb_purchase_fired_${sessionId}`;
    try {
      if (localStorage.getItem(dedupeKey)) return;
      trackMetaEvent("Purchase", order.tracking, sessionId, AUXILIOS_PIXEL_ID);
      localStorage.setItem(dedupeKey, "1");
    } catch {
      // localStorage bloqueado (navegación privada): disparamos igual, mejor que perder la conversión.
      trackMetaEvent("Purchase", order.tracking, sessionId, AUXILIOS_PIXEL_ID);
    }
  }, [state, order]);

  // Marca como comprada la sesión del A/B de /auxilios-lp que hizo clic en comprar, para medir qué versión vende más
  // (ab_stats.purchases). Solo llega aquí con la orden confirmada por el webhook de Stripe. El id lo guarda la landing
  // al hacer clic y se borra al usarlo, así recargar esta página no cuenta dos veces.
  useEffect(() => {
    if (state !== "ok" || !order) return;
    try {
      const sid = localStorage.getItem("auxilios_ab_checkout_session");
      if (!sid) return;
      localStorage.removeItem("auxilios_ab_checkout_session");
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/ab_track_purchase`, {
        method: "POST",
        headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string, "Content-Type": "application/json" },
        body: JSON.stringify({ p_id: sid }),
        keepalive: true,
      }).catch(() => { /* no crítico */ });
    } catch { /* no crítico */ }
  }, [state, order]);

  const platform = order?.platform ?? null;
  const platformUrl = platform ? `${window.location.origin}${platform.path}` : null;

  const copyPassword = async () => {
    if (!platform) return;
    if (await copyText(platform.password)) {
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2200);
    }
  };

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
      {AUXILIOS_PIXEL_ID && (
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${AUXILIOS_PIXEL_ID}&ev=PageView&noscript=1`} alt="" />
        </noscript>
      )}

      <style>{`
:root{
  --teal:#0F4C5C;--teal-dark:#0B3A47;--teal-soft:#E3F0F0;--coral:#E4572E;--cta:#B93C1A;--cta-dark:#9A3115;
  --peach:#FFE6DD;--mint:#DCF1E4;--cream:#FFF9F4;--cream-alt:#F7EFE4;--ink:#1E2A32;--ink-soft:#5C6770;--line:#EBE2D6;--ok:#2F7D55;--white:#FFFFFF;
  --sans:'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
  --radius:22px;
  --shadow-soft:0 1px 2px rgba(30,42,50,.04),0 10px 30px -12px rgba(30,42,50,.16);
  --shadow-lift:0 2px 4px rgba(30,42,50,.06),0 22px 44px -18px rgba(30,42,50,.28);
  --maxw:1080px;
}
.ty-page *,.ty-page *::before,.ty-page *::after{box-sizing:border-box;}
.ty-page{margin:0;background:var(--cream);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden;min-height:100vh;}
.ty-page img{max-width:100%;display:block;}
.ty-page h1,.ty-page h2{font-family:var(--sans);color:var(--ink);margin:0;line-height:1.15;letter-spacing:-.02em;font-weight:800;}
.ty-page p{margin:0;}
.ty-page .container{max-width:var(--maxw);margin:0 auto;padding:0 20px;}
.ty-page section{padding:clamp(36px,6vw,72px) 0;}
.ty-page :focus-visible{outline:3px solid var(--teal);outline-offset:3px;}
.ty-page .icon{width:22px;height:22px;flex-shrink:0;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}

.ty-page .btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;font-family:var(--sans);font-weight:800;font-size:17px;padding:18px 30px;border-radius:999px;text-decoration:none;cursor:pointer;border:0;transition:transform 160ms ease,background-color 160ms ease;min-height:56px;}
.ty-page .btn-block{width:100%;}
.ty-page .btn-primary{background:var(--cta);color:var(--white);box-shadow:0 12px 26px -8px rgba(185,60,26,.55);}
.ty-page .btn-primary:hover{background:var(--cta-dark);transform:translateY(-2px);}
.ty-page .btn-teal{background:var(--teal);color:var(--white);box-shadow:0 12px 26px -10px rgba(15,76,92,.6);}
.ty-page .btn-teal:hover{background:var(--teal-dark);transform:translateY(-2px);}

.ty-page .success-hero{background:linear-gradient(180deg,var(--teal) 0%,var(--teal-dark) 100%);color:var(--cream);text-align:center;padding-top:clamp(44px,7vw,72px);padding-bottom:clamp(36px,6vw,56px);}
.ty-page .success-badge{display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:22px;background:var(--mint);margin-bottom:18px;}
.ty-page .success-badge .icon{width:32px;height:32px;color:var(--ok);stroke-width:2.4;}
.ty-page .success-hero h1{color:var(--white);font-size:clamp(26px,4vw,38px);}
.ty-page .success-hero .sub{margin:14px auto 0;font-size:16.5px;color:#CFE3E3;max-width:52ch;}
.ty-page .success-hero .sub strong{color:var(--white);}

.ty-page .platform-card{margin:0 auto;max-width:560px;background:var(--white);border-radius:28px;box-shadow:var(--shadow-lift);padding:30px 28px 30px;text-align:center;}
.ty-page .order-tag{font-size:12.5px;color:var(--cta);font-weight:800;text-transform:uppercase;letter-spacing:.06em;}
.ty-page .order-name{margin-top:8px;font-size:22px;}
.ty-page .platform-desc{margin-top:10px;font-size:15px;color:var(--ink-soft);}
.ty-page .pw-row{margin:20px 0 20px;display:flex;align-items:stretch;justify-content:center;gap:10px;flex-wrap:wrap;}
.ty-page .pw-code{flex:1 1 220px;max-width:340px;display:flex;align-items:center;justify-content:center;padding:14px 16px;background:var(--cream);border:2px dashed var(--coral);border-radius:16px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:19px;font-weight:700;letter-spacing:.04em;color:var(--teal);word-break:break-all;}
.ty-page .pw-copy{min-height:48px;padding:0 22px;border-radius:999px;border:2px solid var(--teal);background:var(--white);color:var(--teal);font-family:var(--sans);font-weight:800;font-size:15px;cursor:pointer;transition:background-color 160ms ease,color 160ms ease;}
.ty-page .pw-copy:hover{background:var(--teal);color:var(--white);}
.ty-page .order-note{margin-top:16px;font-size:13.5px;color:var(--ink-soft);display:flex;gap:8px;align-items:flex-start;justify-content:center;text-align:left;}
.ty-page .order-note .icon{width:16px;height:16px;color:var(--ok);margin-top:2px;}
.ty-page .order-visual{padding:26px 28px 0;margin:-30px -28px 20px;background:linear-gradient(180deg,var(--peach),var(--white));border-radius:28px 28px 0 0;}
.ty-page .order-visual img{width:100%;max-width:340px;margin:0 auto;object-fit:contain;}
.ty-page .order-meta{margin-top:14px;display:flex;flex-direction:column;gap:4px;font-size:14.5px;color:var(--ink-soft);}
.ty-page .order-meta strong{color:var(--ink);}
.ty-page .next-steps{margin:22px auto 0;max-width:560px;display:grid;gap:12px;}
.ty-page .next-step{display:flex;gap:14px;align-items:flex-start;background:var(--white);border-radius:var(--radius);box-shadow:var(--shadow-soft);padding:16px 18px;}
.ty-page .next-step span.n{flex-shrink:0;width:32px;height:32px;border-radius:50%;background:var(--teal);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;}
.ty-page .next-step p{font-size:15px;}

.ty-page .state-box{max-width:520px;margin:60px auto;text-align:center;padding:0 20px;}
.ty-page .state-box h2{font-size:22px;}
.ty-page .state-box p{margin-top:12px;font-size:15px;color:var(--ink-soft);}
.ty-page .spinner{width:34px;height:34px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--cta);animation:ty-spin .8s linear infinite;margin:0 auto 20px;}
@keyframes ty-spin{to{transform:rotate(360deg);}}
@media (prefers-reduced-motion: reduce){.ty-page .spinner{animation-duration:3s;}}

.ty-page footer{background:#10181D;padding:24px 0;text-align:center;}
.ty-page footer p{font-size:12px;color:#9AA5AD;max-width:70ch;margin:0 auto;padding:0 20px;}
      `}</style>

      <div className="ty-page">
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <symbol id="ty-i-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></symbol>
          <symbol id="ty-i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><polyline points="3 7 12 13 21 7" /></symbol>
        </svg>

        {state === "loading" && (
          <div className="state-box">
            <div className="spinner" />
            <h2>Cargando tu compra…</h2>
          </div>
        )}

        {state === "no-session" && (
          <div className="state-box">
            <h2>No encontramos ninguna compra en este enlace</h2>
            <p>Si acabas de pagar, revisa tu correo: ahí te llega un link directo a tu compra y a tu acceso.</p>
          </div>
        )}

        {state === "not-found" && (
          <div className="state-box">
            <h2>Aún no vemos esa compra</h2>
            <p>A veces el pago tarda unos segundos en confirmarse. Recarga esta página en un minuto. Si el enlace sigue sin abrir, usa el link del correo de confirmación de tu compra.</p>
          </div>
        )}

        {state === "ok" && order && (
          <>
            <header className="success-hero">
              <div className="container">
                <span className="success-badge"><svg className="icon" aria-hidden="true"><use href="#ty-i-check" /></svg></span>
                <h1>¡Gracias por tu compra!</h1>
                <p className="sub">Tu acceso ya está listo. También lo enviamos a <strong>{order.email}</strong>.</p>
              </div>
            </header>

            <section>
              <div className="container">
                <div className="platform-card">
                  <div className="order-visual">
                    <img src={`${IMG}/mockup-bundle.webp`} alt="Ebook, app y 3 bonos de Primeros Auxilios del Bebé" width={1024} height={1024} />
                  </div>
                  <p className="order-tag">Compra confirmada</p>
                  <h2 className="order-name">{order.productName}</h2>
                  <div className="order-meta">
                    <span>Total pagado: <strong>{formatAmount(order.amountTotal, order.currency)}</strong></span>
                  </div>

                  {platform && platformUrl ? (
                    <>
                      <p className="platform-desc" style={{ marginTop: 22 }}>Tu contraseña de acceso:</p>
                      <div className="pw-row">
                        <code className="pw-code" aria-label="Contraseña de la app">{platform.password}</code>
                        <button type="button" className="pw-copy" onClick={copyPassword}>
                          {passwordCopied ? "¡Copiada!" : "Copiar"}
                        </button>
                      </div>
                      <a href={platformUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-block">Abrir mi app</a>
                      <p className="order-note">
                        <svg className="icon" aria-hidden="true"><use href="#ty-i-mail" /></svg>
                        Guarda este link y esta contraseña. También te los enviamos por correo (revisa spam si no lo ves).
                      </p>
                    </>
                  ) : (
                    <p className="platform-desc" style={{ marginTop: 22 }}>Estamos preparando tu acceso. Recarga esta página en un minuto o usa el link del correo de confirmación.</p>
                  )}
                </div>

                {platform && (
                  <div className="next-steps">
                    <div className="next-step"><span className="n">1</span><p>Abre la app e ingresa tu contraseña.</p></div>
                    <div className="next-step"><span className="n">2</span><p>Elige la edad de tu bebé: las tarjetas se ordenan para ti.</p></div>
                    <div className="next-step"><span className="n">3</span><p>Tu ebook y tus 3 bonos están en la pestaña <strong>Biblioteca</strong>.</p></div>
                  </div>
                )}
              </div>
            </section>

            <footer>
              <p>Material educativo: no sustituye un curso de primeros auxilios, la consulta médica ni a los servicios de emergencia. Ante una emergencia real, llama a emergencias de tu país.</p>
            </footer>
          </>
        )}
      </div>
    </>
  );
};

export default AuxiliosTy;
