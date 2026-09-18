import { useEffect, useState } from "react";
import { META_PIXEL_ID, initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const SUPPORT_EMAIL = "daniel@acrosoftlabs.com";

type OrderData = {
  productName: string;
  email: string;
  amountTotal: number;
  currency: string;
  download: { filename: string; url: string | null };
};

type LoadState = "loading" | "ok" | "no-session" | "not-found";

function formatAmount(cents: number, currency: string): string {
  return `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

const TyFrances = () => {
  const [state, setState] = useState<LoadState>("loading");
  const [order, setOrder] = useState<OrderData | null>(null);

  useEffect(() => {
    document.title = "Gracias por tu compra | Guía DELF A2";
  }, []);

  useEffect(() => {
    initMetaPixel();
    trackMetaEvent("PageView");
  }, []);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) {
      setState("no-session");
      return;
    }
    fetch(`${FUNCTIONS_URL}/frances-get-order?session_id=${encodeURIComponent(sessionId)}`)
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

  // Purchase se dispara solo una vez por compra confirmada — si el cliente
  // vuelve a este mismo link (para redescargar el ZIP, por ejemplo) no
  // queremos contar una segunda conversión en Meta.
  useEffect(() => {
    if (state !== "ok" || !order) return;
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) return;
    const dedupeKey = `fb_purchase_fired_${sessionId}`;
    // event_id = el propio session_id de Stripe — es el mismo que usa
    // stripe-webhook al mandar este mismo Purchase por Conversions API.
    try {
      if (localStorage.getItem(dedupeKey)) return;
      trackMetaEvent("Purchase", { value: order.amountTotal / 100, currency: order.currency.toUpperCase() }, sessionId);
      localStorage.setItem(dedupeKey, "1");
    } catch {
      // localStorage bloqueado (navegación privada, etc.) — disparamos igual,
      // preferible a perder la conversión por completo.
      trackMetaEvent("Purchase", { value: order.amountTotal / 100, currency: order.currency.toUpperCase() }, sessionId);
    }
  }, [state, order]);

  const download = order?.download;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;500;700;900&display=swap" rel="stylesheet" />
      <noscript>
        <img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} alt="" />
      </noscript>

      <style>{`
:root{
  --navy:#1B2A4A;
  --navy-dark:#12203A;
  --slate:#4A5D7A;
  --gold:#C9932E;
  --gold-deep:#8C6A1E;
  --cream:#FAF6EF;
  --cream-alt:#F1ECDF;
  --ink:#22262E;
  --ink-soft:#5B6270;
  --line:#DED6BC;
  --ok:#3F6B4A;
  --cta:#C1403A;
  --cta-dark:#9C312C;
  --white:#FFFFFF;
  --serif:'Lato', Arial, Helvetica, sans-serif;
  --sans:'Lato', Arial, Helvetica, sans-serif;
  --radius:14px;
  --shadow-soft:0 10px 30px -12px rgba(27,42,74,.25);
  --shadow-lift:0 18px 40px -16px rgba(27,42,74,.35);
  --maxw:1120px;
}
.ty-page *,.ty-page *::before,.ty-page *::after{box-sizing:border-box;}
.ty-page{margin:0;background:var(--cream);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden;min-height:100vh;}
.ty-page img{max-width:100%;display:block;}
.ty-page a{color:inherit;}
.ty-page h1,.ty-page h2,.ty-page h3{font-family:var(--serif);color:var(--navy);margin:0;line-height:1.15;}
.ty-page p{margin:0;}
.ty-page ul{margin:0;padding:0;list-style:none;}
.ty-page .container{max-width:var(--maxw);margin:0 auto;padding:0 20px;}
.ty-page section{padding:clamp(40px,6vw,80px) 0;}

.ty-page .icon{width:22px;height:22px;flex-shrink:0;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}

.ty-page .btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;font-family:var(--sans);font-weight:900;font-size:17px;letter-spacing:.01em;padding:18px 30px;border-radius:8px;text-decoration:none;cursor:pointer;border:2px solid transparent;transition:transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease;min-height:44px;text-align:center;}
.ty-page .btn-primary{background:var(--cta);color:var(--white);box-shadow:var(--shadow-lift);}
.ty-page .btn-primary:hover{background:var(--cta-dark);transform:translateY(-2px);}
.ty-page .btn-primary:active{transform:translateY(0);}
.ty-page .btn-block{width:100%;}
.ty-page .btn[aria-disabled="true"]{opacity:.5;pointer-events:none;}

.ty-page .success-hero{background:var(--navy);color:var(--cream);text-align:center;padding-top:clamp(48px,7vw,76px);padding-bottom:clamp(40px,6vw,60px);}
.ty-page .success-badge{display:inline-flex;align-items:center;justify-content:center;width:60px;height:60px;border-radius:50%;background:var(--gold);margin-bottom:20px;}
.ty-page .success-badge .icon{width:30px;height:30px;color:var(--navy-dark);stroke-width:2.2;}
.ty-page .success-hero h1{color:var(--white);font-size:clamp(26px,4vw,38px);font-weight:700;}
.ty-page .success-hero .sub{margin:16px auto 0;font-size:16.5px;color:#C7D0E0;max-width:56ch;}
.ty-page .success-hero .sub strong{color:var(--white);}

.ty-page .order-card{background:var(--white);border-radius:20px;box-shadow:var(--shadow-lift);border:1px solid var(--line);overflow:hidden;max-width:560px;margin:0 auto;text-align:center;}
.ty-page .order-visual{padding:32px 32px 0;background:var(--cream-alt);}
.ty-page .order-visual img{width:100%;max-width:420px;margin:0 auto;object-fit:contain;}
.ty-page .order-body{padding:24px 32px 32px;}
.ty-page .order-tag{font-size:13px;color:var(--gold-deep);font-weight:700;text-transform:uppercase;letter-spacing:.04em;}
.ty-page .order-name{margin-top:8px;font-size:21px;font-weight:700;color:var(--navy);}
.ty-page .order-meta{margin-top:16px;display:flex;flex-direction:column;gap:6px;font-size:14.5px;color:var(--ink-soft);}
.ty-page .order-meta strong{color:var(--navy);}
.ty-page .order-cta{margin-top:22px;}
.ty-page .order-email-note{margin-top:14px;font-size:13.5px;color:var(--ink-soft);display:flex;gap:8px;align-items:flex-start;text-align:left;}
.ty-page .order-email-note .icon{width:16px;height:16px;color:var(--ok);margin-top:2px;flex-shrink:0;}

.ty-page .state-box{max-width:520px;margin:60px auto;text-align:center;padding:0 20px;}
.ty-page .state-box h2{font-size:22px;font-weight:700;}
.ty-page .state-box p{margin-top:12px;font-size:15px;color:var(--ink-soft);line-height:1.6;}
.ty-page .spinner{width:34px;height:34px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--cta);animation:ty-spin 0.8s linear infinite;margin:0 auto 20px;}
@keyframes ty-spin{to{transform:rotate(360deg);}}

.ty-page footer{background:#0A0A0A;padding:24px 0;text-align:center;}
.ty-page footer p{font-size:12px;color:#9CA3AF;}
      `}</style>

      <div className="ty-page">
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <symbol id="ty-i-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></symbol>
          <symbol id="ty-i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><polyline points="3 7 12 13 21 7" /></symbol>
          <symbol id="ty-i-download" viewBox="0 0 24 24"><path d="M12 3v12" /><polyline points="7 10 12 15 17 10" /><path d="M4 19h16" /></symbol>
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
            <p>Si acabas de pagar, revisa tu correo — ahí te llega un link directo a tu compra. Si el problema sigue, escríbenos a <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "var(--cta)", fontWeight: 700 }}>{SUPPORT_EMAIL}</a>.</p>
          </div>
        )}

        {state === "not-found" && (
          <div className="state-box">
            <h2>No pudimos encontrar esa compra</h2>
            <p>El enlace puede haber expirado o ser incorrecto. Escríbenos a <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "var(--cta)", fontWeight: 700 }}>{SUPPORT_EMAIL}</a> con tu comprobante de pago y te lo resolvemos al toque.</p>
          </div>
        )}

        {state === "ok" && order && (
          <>
            <header className="success-hero">
              <div className="container">
                <span className="success-badge"><svg className="icon" aria-hidden="true"><use href="#ty-i-check" /></svg></span>
                <h1>¡Gracias por tu compra!</h1>
                <p className="sub">Ya puedes descargar tus ebooks abajo. También te enviamos todo a <strong>{order.email}</strong> por si prefieres verlo después.</p>
              </div>
            </header>

            <section>
              <div className="container">
                <div className="order-card">
                  <div className="order-visual">
                    <img src="/frances/imagenes/mockup-pack-completo-v2.webp" alt="Mockup del pack completo: guía DELF A2 + celular + los 4 bonos" />
                  </div>
                  <div className="order-body">
                    <p className="order-tag">Compra confirmada</p>
                    <h2 className="order-name">{order.productName}</h2>
                    <div className="order-meta">
                      <span>Total pagado: <strong>{formatAmount(order.amountTotal, order.currency)}</strong></span>
                      <span>Enviado a: <strong>{order.email}</strong></span>
                    </div>
                    <div className="order-cta">
                      {download?.url ? (
                        <a href={download.url} className="btn btn-primary btn-block" download={download.filename}>
                          <svg className="icon" aria-hidden="true"><use href="#ty-i-download" /></svg>
                          Descargar Ebooks
                        </a>
                      ) : (
                        <span className="btn btn-primary btn-block" aria-disabled="true">Preparando tu descarga…</span>
                      )}
                    </div>
                    <p className="order-email-note">
                      <svg className="icon" aria-hidden="true"><use href="#ty-i-mail" /></svg>
                      También te lo enviamos por correo — revisa tu bandeja (y spam) si no lo ves enseguida.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <footer>
              <p>¿Algún problema con tu descarga? Escríbenos a {SUPPORT_EMAIL}</p>
            </footer>
          </>
        )}
      </div>
    </>
  );
};

export default TyFrances;
