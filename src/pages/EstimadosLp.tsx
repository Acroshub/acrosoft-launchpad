import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { EST_CSS, EST_FONT_HREF } from "@/components/estimados/estimadosStyles";
import { saveCheckoutAttribution } from "@/lib/checkoutAttribution";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import { addNoindex, registerAbSession, trackAbClick } from "@/lib/piscinasFunnel";
import { sendProductServerEvent } from "@/lib/productServerEvents";
import { uuid } from "@/lib/uuid";
import {
  ESTIMADOS_AB_CHECKOUT_SESSION_KEY,
  ESTIMADOS_AB_EXPERIMENT,
  ESTIMADOS_CONTENT_NAME,
  ESTIMADOS_GUARANTEE_DAYS,
  ESTIMADOS_IMG as IMG,
  ESTIMADOS_LIST_PRICE,
  ESTIMADOS_PAYMENT_LINK,
  ESTIMADOS_PIXEL_ID,
  ESTIMADOS_PRICE,
  ESTIMADOS_PRODUCT_SLUG,
  estimadosCheckoutUrl,
  estimadosEventParams,
} from "@/lib/estimadosConfig";

// Landing de «Kit de 50 anuncios virales para negocios de tree services» — /estimados-lp. Diseño y orden de secciones
// adaptados de landings de referencia que ya venden (no de la estructura de /toefl): franja de confianza, hero centrado
// con imagen «versus», «lo que ya probaste», oferta con mockup del bundle, 3 pasos, galería en movimiento,
// momentos del cliente, garantía, FAQ y cierre con CTA sticky móvil. Prototipo original: carpeta «Kit Clientes Tree Services»/Landing.
//
// Pixel de Meta y Payment Link: PENDIENTES (vacíos en estimadosConfig.ts). Con el pixel vacío no se dispara ningún evento;
// con el link vacío el botón solo registra el clic. Copy sin testimonios, cifras de resultados ni escasez inventados.

const PAGE_TITLE = "Kit de 50 anuncios virales para negocios de tree services | Anuncios listos en español e inglés";

/** La página nace con noindex (como el prototipo). Pasar a false cuando Daniel decida publicarla en buscadores. */
const NOINDEX = true;
/**
 * Franja superior con 5 avatares y «4.5 estrellas». OJO: hoy no existe ninguna calificación real de este kit y los rostros
 * son generados por IA; mostrarla puede leerse como reseñas falsas (FTC / políticas de Meta). Apagar con false o reemplazar
 * por una calificación real antes de pautar tráfico. Ver Landing/NOTAS.md del prototipo.
 */
const SHOW_RATING_STRIP = true;

const price = ESTIMADOS_PRICE;
const listPrice = ESTIMADOS_LIST_PRICE;
const showListPrice = listPrice !== null && listPrice > price;
const days = ESTIMADOS_GUARANTEE_DAYS;

const ES_ADS = [
  { n: 5, alt: "Anuncio de ejemplo: el precio de tener el árbol más grande de la cuadra" },
  { n: 2, alt: "Anuncio de ejemplo: revisas ventanas y techo antes de la tormenta, ¿y el árbol?" },
  { n: 10, alt: "Anuncio de ejemplo: lo que nadie te cuenta sobre los tocones" },
  { n: 33, alt: "Anuncio de ejemplo: una forma de podar que deja pasar el viento" },
  { n: 40, alt: "Anuncio de ejemplo: quitar árboles es nuestro trabajo diario, para que tú no tengas que arriesgarte" },
  { n: 32, alt: "Anuncio de ejemplo: hay una razón por la que dos estimados del mismo árbol cuestan tan distinto" },
  { n: 1, alt: "Anuncio de ejemplo: hay una rama sobre tu techo que parece inofensiva, hasta la próxima tormenta" },
];
const EN_ADS = [
  { n: 5, alt: "Example ad: the price of having the biggest tree on the block" },
  { n: 2, alt: "Example ad: you check windows and roof before the storm, what about the tree?" },
  { n: 10, alt: "Example ad: here's what nobody tells you about tree stumps" },
  { n: 33, alt: "Example ad: there's a way to prune that lets the wind pass through the tree" },
  { n: 40, alt: "Example ad: removing trees is our daily work, so you don't have to take the risk" },
  { n: 32, alt: "Example ad: there's a reason two estimates for the same tree cost so differently" },
  { n: 1, alt: "Example ad: there's a branch over your roof that looks harmless, until the next storm" },
];

const NOTS = [
  { t: "Publicar la foto del trabajo terminado", d: "No le da al cliente una razón para escribirte hoy." },
  { t: "Boostear una publicación", d: "La ve gente que hoy no necesita un árbol." },
  { t: "Repartir volantes y poner letreros", d: "Sin oferta ni seguimiento, se tiran." },
  { t: "Comprar leads compartidos", d: "Pagas y otros competidores llaman antes que tú." },
];

const MOMENTS = [
  { lbl: "Cuando aún no ve el riesgo", n: 12, q: "Hay una rama sobre tu techo que parece inofensiva, hasta la próxima tormenta." },
  { lbl: "Cuando ya siente el problema", n: 16, q: "Cada vez que oyes viento fuerte, miras ese árbol y contienes la respiración." },
  { lbl: "Cuando ya busca quién lo resuelva", n: 22, q: "Quita ese árbol sin que te toque limpiar ni una rama." },
];

const FAQ = [
  { q: "¿Sirve para poda, remoción y tocones?", a: "Sí. Hay anuncios de poda, remoción de árboles, tocones, ramas sobre el techo, preparación para la temporada de tormentas y estimados. Si tu especialidad es otra, por ejemplo palmas, puedes cambiar el texto con la guía." },
  { q: "¿Necesito saber de marketing o diseño?", a: "No. Los anuncios ya vienen hechos: les pones tu logo, tu ciudad y tu teléfono y los publicas desde el celular." },
  { q: "¿Cuánto tiempo me toma?", a: "Personaliza en 2 minutos. Te guiamos paso a paso para que lo hagas desde cualquier celular." },
  { q: "¿Viene en inglés?", a: "Sí. Los mismos 50 anuncios en español y en inglés. En total son 100 anuncios." },
  { q: "¿Tengo que pagar anuncios?", a: "No. Puedes publicarlos gratis en tu página y en tu perfil. Pagar para que los vea más gente es opcional, pero sí recomendamos altamente que lo hagas. Si necesitas ayuda para pagar anuncios, te ayudamos." },
  { q: "¿Cómo los edito?", a: "Te incluimos una guía fácil de seguir, para que edites en 2 minutos usando cualquier celular y ChatGPT." },
  { q: "¿Y si no tengo licencia o seguro en mi negocio?", a: "Tenemos una tabla que te ayuda a saber si puedes publicar un anuncio que mencione una licencia o seguro. Si no tienes, igual puedes editarlo siguiendo nuestra guía de edición." },
];

const BUNDLE_ALT = "Kit de 50 anuncios virales: una caja de la que salen los anuncios, la guía para personalizar con tu logo y la tabla de promesas";

function Icons() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <symbol id="est-i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></symbol>
        <symbol id="est-i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></symbol>
        <symbol id="est-i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></symbol>
        <symbol id="est-i-phone" viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="19" rx="2.4" /><path d="M11 18.5h2" /></symbol>
        <symbol id="est-i-lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></symbol>
        <symbol id="est-i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3.5 3.5 3.5 14.5 0 18M12 3c-3.5 3.5-3.5 14.5 0 18" /></symbol>
        <symbol id="est-i-bolt" viewBox="0 0 24 24"><path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" /></symbol>
        <symbol id="est-i-shield" viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></symbol>
        <symbol id="est-pay-visa" viewBox="0 0 24 24"><path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z" /></symbol>
        <symbol id="est-pay-mastercard" viewBox="0 0 24 24"><path d="M11.343 18.031c.058.049.12.098.181.146-1.177.783-2.59 1.238-4.107 1.238C3.32 19.416 0 16.096 0 12c0-4.095 3.32-7.416 7.416-7.416 1.518 0 2.931.456 4.105 1.238-.06.051-.12.098-.165.15C9.6 7.489 8.595 9.688 8.595 12c0 2.311 1.001 4.51 2.748 6.031zm5.241-13.447c-1.52 0-2.931.456-4.105 1.238.06.051.12.098.165.15C14.4 7.489 15.405 9.688 15.405 12c0 2.31-1.001 4.507-2.748 6.031-.058.049-.12.098-.181.146 1.177.783 2.588 1.238 4.107 1.238C20.68 19.416 24 16.096 24 12c0-4.094-3.32-7.416-7.416-7.416zM12 6.174c-.096.075-.189.15-.28.231C10.156 7.764 9.169 9.765 9.169 12c0 2.236.987 4.236 2.551 5.595.09.08.185.158.28.232.096-.074.189-.152.28-.232 1.563-1.359 2.551-3.359 2.551-5.595 0-2.235-.987-4.236-2.551-5.595-.09-.08-.184-.156-.28-.231z" /></symbol>
        <symbol id="est-pay-amex" viewBox="0 0 24 24"><path d="M16.015 14.378c0-.32-.135-.496-.344-.622-.21-.12-.464-.135-.81-.135h-1.543v2.82h.675v-1.027h.72c.24 0 .39.024.478.125.12.13.104.38.104.55v.35h.66v-.555c-.002-.25-.017-.376-.108-.516-.06-.08-.18-.18-.33-.234l.02-.008c.18-.072.48-.297.48-.747zm-.87.407l-.028-.002c-.09.053-.195.058-.33.058h-.81v-.63h.824c.12 0 .24 0 .33.05.098.048.156.147.15.255 0 .12-.045.215-.134.27zM20.297 15.837H19v.6h1.304c.676 0 1.05-.278 1.05-.884 0-.28-.066-.448-.187-.582-.153-.133-.392-.193-.73-.207l-.376-.015c-.104 0-.18 0-.255-.03-.09-.03-.15-.105-.15-.21 0-.09.017-.166.09-.21.083-.046.177-.066.272-.06h1.23v-.602h-1.35c-.704 0-.958.437-.958.84 0 .9.776.855 1.407.87.104 0 .18.015.225.06.046.03.082.106.082.18 0 .077-.035.15-.08.18-.06.053-.15.07-.277.07zM0 0v10.096L.81 8.22h1.75l.225.464V8.22h2.043l.45 1.02.437-1.013h6.502c.295 0 .56.057.756.236v-.23h1.787v.23c.307-.17.686-.23 1.12-.23h2.606l.24.466v-.466h1.918l.254.465v-.466h1.858v3.948H20.87l-.36-.6v.585h-2.353l-.256-.63h-.583l-.27.614h-1.213c-.48 0-.84-.104-1.08-.24v.24h-2.89v-.884c0-.12-.03-.12-.105-.135h-.105v1.036H6.067v-.48l-.21.48H4.69l-.202-.48v.465H2.235l-.256-.624H1.4l-.256.624H0V24h23.786v-7.108c-.27.135-.613.18-.973.18H21.09v-.255c-.21.165-.57.255-.914.255H14.71v-.9c0-.12-.018-.12-.12-.12h-.075v1.022h-1.8v-1.066c-.298.136-.643.15-.928.136h-.214v.915h-2.18l-.54-.617-.57.6H4.742v-3.93h3.61l.518.602.554-.6h2.412c.28 0 .74.03.942.225v-.24h2.177c.202 0 .644.045.903.225v-.24h3.265v.24c.163-.164.508-.24.803-.24h1.89v.24c.194-.15.464-.24.84-.24h1.176V0H0zM21.156 14.955c.004.005.006.012.01.016.01.01.024.01.032.02l-.042-.035zM23.828 13.082h.065v.555h-.065zM23.865 15.03v-.005c-.03-.025-.046-.048-.075-.07-.15-.153-.39-.215-.764-.225l-.36-.012c-.12 0-.194-.007-.27-.03-.09-.03-.15-.105-.15-.21 0-.09.03-.16.09-.204.076-.045.15-.05.27-.05h1.223v-.588h-1.283c-.69 0-.96.437-.96.84 0 .9.78.855 1.41.87.104 0 .18.015.224.06.046.03.076.106.076.18 0 .07-.034.138-.09.18-.045.056-.136.07-.27.07h-1.288v.605h1.287c.42 0 .734-.118.9-.36h.03c.09-.134.135-.3.135-.523 0-.24-.045-.39-.135-.526zM18.597 14.208v-.583h-2.235V16.458h2.235v-.585h-1.57v-.57h1.533v-.584h-1.532v-.51M13.51 8.787h.685V11.6h-.684zM13.126 9.543l-.007.006c0-.314-.13-.5-.34-.624-.217-.125-.47-.135-.81-.135H10.43v2.82h.674v-1.034h.72c.24 0 .39.03.487.12.122.136.107.378.107.548v.354h.677v-.553c0-.25-.016-.375-.11-.516-.09-.107-.202-.19-.33-.237.172-.07.472-.3.472-.75zm-.855.396h-.015c-.09.054-.195.056-.33.056H11.1v-.623h.825c.12 0 .24.004.33.05.09.04.15.128.15.25s-.047.22-.134.266zM15.92 9.373h.632v-.6h-.644c-.464 0-.804.105-1.02.33-.286.3-.362.69-.362 1.11 0 .512.123.833.36 1.074.232.238.645.31.97.31h.78l.255-.627h1.39l.262.627h1.36v-2.11l1.272 2.11h.95l.002.002V8.786h-.684v1.963l-1.18-1.96h-1.02V11.4L18.11 8.744h-1.004l-.943 2.22h-.3c-.177 0-.362-.03-.468-.134-.125-.15-.186-.36-.186-.662 0-.285.08-.51.194-.63.133-.135.272-.165.516-.165zm1.668-.108l.464 1.118v.002h-.93l.466-1.12zM2.38 10.97l.254.628H4V9.393l.972 2.205h.584l.973-2.202.015 2.202h.69v-2.81H6.118l-.807 1.904-.876-1.905H3.343v2.663L2.205 8.787h-.997L.01 11.597h.72l.26-.626h1.39zm-.688-1.705l.46 1.118-.003.002h-.915l.457-1.12zM11.856 13.62H9.714l-.85.923-.825-.922H5.346v2.82H8l.855-.932.824.93h1.302v-.94h.838c.6 0 1.17-.164 1.17-.945l-.006-.003c0-.78-.598-.93-1.128-.93zM7.67 15.853l-.014-.002H6.02v-.557h1.47v-.574H6.02v-.51H7.7l.733.82-.764.824zm2.642.33l-1.03-1.147 1.03-1.108v2.253zm1.553-1.258h-.885v-.717h.885c.24 0 .42.098.42.344 0 .243-.15.372-.42.372zM9.967 9.373v-.586H7.73V11.6h2.237v-.58H8.4v-.564h1.527V9.88H8.4v-.507" /></symbol>
        <symbol id="est-pay-applepay" viewBox="0 0 24 24"><path d="M2.15 4.318a42.16 42.16 0 0 0-.454.003c-.15.005-.303.013-.452.04a1.44 1.44 0 0 0-1.06.772c-.07.138-.114.278-.14.43-.028.148-.037.3-.04.45A10.2 10.2 0 0 0 0 6.222v11.557c0 .07.002.138.003.207.004.15.013.303.04.452.027.15.072.291.142.429a1.436 1.436 0 0 0 .63.63c.138.07.278.115.43.142.148.027.3.036.45.04l.208.003h20.194l.207-.003c.15-.004.303-.013.452-.04.15-.027.291-.071.428-.141a1.432 1.432 0 0 0 .631-.631c.07-.138.115-.278.141-.43.027-.148.036-.3.04-.45.002-.07.003-.138.003-.208l.001-.246V6.221c0-.07-.002-.138-.004-.207a2.995 2.995 0 0 0-.04-.452 1.446 1.446 0 0 0-1.2-1.201 3.022 3.022 0 0 0-.452-.04 10.448 10.448 0 0 0-.453-.003zm0 .512h19.942c.066 0 .131.002.197.003.115.004.25.01.375.032.109.02.2.05.287.094a.927.927 0 0 1 .407.407.997.997 0 0 1 .094.288c.022.123.028.258.031.374.002.065.003.13.003.197v11.552c0 .065 0 .13-.003.196-.003.115-.009.25-.032.375a.927.927 0 0 1-.5.693 1.002 1.002 0 0 1-.286.094 2.598 2.598 0 0 1-.373.032l-.2.003H1.906c-.066 0-.133-.002-.196-.003a2.61 2.61 0 0 1-.375-.032c-.109-.02-.2-.05-.288-.094a.918.918 0 0 1-.406-.407 1.006 1.006 0 0 1-.094-.288 2.531 2.531 0 0 1-.032-.373 9.588 9.588 0 0 1-.002-.197V6.224c0-.065 0-.131.002-.197.004-.114.01-.248.032-.375.02-.108.05-.199.094-.287a.925.925 0 0 1 .407-.406 1.03 1.03 0 0 1 .287-.094c.125-.022.26-.029.375-.032.065-.002.131-.002.196-.003zm4.71 3.7c-.3.016-.668.199-.88.456-.191.22-.36.58-.316.918.338.03.675-.169.888-.418.205-.258.345-.603.308-.955zm2.207.42v5.493h.852v-1.877h1.18c1.078 0 1.835-.739 1.835-1.812 0-1.07-.742-1.805-1.808-1.805zm.852.719h.982c.739 0 1.161.396 1.161 1.089 0 .692-.422 1.092-1.164 1.092h-.979zm-3.154.3c-.45.01-.83.28-1.05.28-.235 0-.593-.264-.981-.257a1.446 1.446 0 0 0-1.23.747c-.527.908-.139 2.255.374 2.995.249.366.549.769.944.754.373-.014.52-.242.973-.242.454 0 .586.242.98.235.41-.007.667-.366.915-.733.286-.417.403-.82.41-.841-.007-.008-.79-.308-.797-1.209-.008-.754.615-1.113.644-1.135-.352-.52-.9-.578-1.09-.593a1.123 1.123 0 0 0-.092-.002zm8.204.397c-.99 0-1.606.533-1.652 1.256h.777c.072-.358.369-.586.845-.586.502 0 .803.266.803.711v.309l-1.097.064c-.951.054-1.488.484-1.488 1.184 0 .72.548 1.207 1.332 1.207.526 0 1.032-.281 1.264-.727h.019v.659h.788v-2.76c0-.803-.62-1.317-1.591-1.317zm1.94.072l1.446 4.009c0 .003-.073.24-.073.247-.125.41-.33.571-.711.571-.069 0-.206 0-.267-.015v.666c.06.011.267.019.335.019.83 0 1.226-.312 1.568-1.283l1.5-4.214h-.868l-1.012 3.259h-.015l-1.013-3.26zm-1.167 2.189v.316c0 .521-.45.917-1.024.917-.442 0-.731-.228-.731-.579 0-.342.278-.56.769-.593z" /></symbol>
        <symbol id="est-pay-googlepay" viewBox="0 0 24 24"><path d="M3.963 7.235A3.963 3.963 0 00.422 9.419a3.963 3.963 0 000 3.559 3.963 3.963 0 003.541 2.184c1.07 0 1.97-.352 2.627-.957.748-.69 1.18-1.71 1.18-2.916a4.722 4.722 0 00-.07-.806H3.964v1.526h2.14a1.835 1.835 0 01-.79 1.205c-.356.241-.814.379-1.35.379-1.034 0-1.911-.697-2.225-1.636a2.375 2.375 0 010-1.517c.314-.94 1.191-1.636 2.225-1.636a2.152 2.152 0 011.52.594l1.132-1.13a3.808 3.808 0 00-2.652-1.033zm6.501.55v6.9h.886V11.89h1.465c.603 0 1.11-.196 1.522-.588a1.911 1.911 0 00.635-1.464 1.92 1.92 0 00-.635-1.456 2.125 2.125 0 00-1.522-.598zm2.427.85a1.156 1.156 0 01.823.365 1.176 1.176 0 010 1.686 1.171 1.171 0 01-.877.357H11.35V8.635h1.487a1.156 1.156 0 01.054 0zm4.124 1.175c-.842 0-1.477.308-1.907.925l.781.491c.288-.417.68-.626 1.175-.626a1.255 1.255 0 01.856.323 1.009 1.009 0 01.366.785v.202c-.34-.193-.774-.289-1.3-.289-.617 0-1.11.145-1.479.434-.37.288-.554.677-.554 1.165a1.476 1.476 0 00.525 1.156c.35.308.785.463 1.305.463.61 0 1.098-.27 1.465-.81h.038v.655h.848v-2.909c0-.61-.19-1.09-.568-1.44-.38-.35-.896-.525-1.551-.525zm2.263.154l1.946 4.422-1.098 2.38h.915L24 9.963h-.965l-1.368 3.391h-.02l-1.406-3.39zm-2.146 2.368c.494 0 .88.11 1.156.33 0 .372-.147.696-.44.973a1.413 1.413 0 01-.997.414 1.081 1.081 0 01-.69-.232.708.708 0 01-.293-.578c0-.257.12-.47.363-.647.24-.173.54-.26.9-.26Z" /></symbol>
      </defs>
    </svg>
  );
}

const Ic = ({ id }: { id: string }) => (
  <svg className="est-ic" aria-hidden="true"><use href={`#est-i-${id}`} /></svg>
);

function TrustRow() {
  return (
    <ul className="est-trust">
      <li><Ic id="lock" />Pago seguro</li>
      <li><Ic id="globe" />En español y en inglés</li>
      <li><Ic id="bolt" />Fácil y rápido de editar</li>
      <li><Ic id="shield" /><span>Garantía de {days} días</span></li>
    </ul>
  );
}

function PayRow() {
  const items: Array<[string, string]> = [["visa", "Visa"], ["mastercard", "Mastercard"], ["amex", "American Express"], ["applepay", "Apple Pay"], ["googlepay", "Google Pay"]];
  return (
    <div className="est-pay">
      <span className="est-pay-label">Pago seguro procesado por Stripe</span>
      <div className="est-pay-icons">
        {items.map(([id, label]) => (
          <svg key={id} className="est-pay-icon" aria-label={label} role="img"><use href={`#est-pay-${id}`} /></svg>
        ))}
      </div>
    </div>
  );
}

function Bundle() {
  return (
    <picture className="est-bundle">
      <source srcSet={`${IMG}/mockup-bundle.webp`} type="image/webp" />
      <img src={`${IMG}/mockup-bundle.png`} width={1100} height={800} alt={BUNDLE_ALT} />
    </picture>
  );
}

function AdRow({ ads, lang, dir }: { ads: typeof ES_ADS; lang: "es" | "en"; dir: "left" | "right" }) {
  // El mismo grupo dos veces: la animación recorre exactamente un grupo (50 %), así el bucle no tiene salto.
  return (
    <div className="est-marq">
      <div className={`est-track est-track--${dir}`}>
        {ads.map((a) => (
          <div className="est-ad" key={`a${a.n}`}>
            <img src={`${IMG}/ads/${lang}-${String(a.n).padStart(2, "0")}.jpg`} width={432} height={576} loading="lazy" alt={a.alt} lang={lang} />
          </div>
        ))}
        {ads.map((a) => (
          <div className="est-ad est-dup" key={`b${a.n}`} aria-hidden="true">
            <img src={`${IMG}/ads/${lang}-${String(a.n).padStart(2, "0")}.jpg`} width={432} height={576} loading="lazy" alt="" />
          </div>
        ))}
      </div>
    </div>
  );
}

const EstimadosLp = () => {
  const abSessionIdRef = useRef<string | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [stickyVisible, setStickyVisible] = useState(false);

  // Registra la visita en ab_sessions (insert-only para anon).
  useEffect(() => {
    abSessionIdRef.current = registerAbSession(ESTIMADOS_AB_EXPERIMENT, String(price));
  }, []);

  useEffect(() => {
    document.title = PAGE_TITLE;
    return NOINDEX ? addNoindex() : undefined;
  }, []);

  // PageView + ViewContent al cargar la landing. Con PIXEL_ID vacío no hace nada.
  useEffect(() => {
    if (!ESTIMADOS_PIXEL_ID) return;
    initMetaPixel(ESTIMADOS_PIXEL_ID);
    trackMetaEvent("PageView", undefined, undefined, ESTIMADOS_PIXEL_ID);
    // Mismo event_id en navegador y servidor (Conversions API): Meta cuenta un solo ViewContent.
    const eventId = uuid();
    trackMetaEvent("ViewContent", estimadosEventParams(price), eventId, ESTIMADOS_PIXEL_ID);
    void sendProductServerEvent({ product: ESTIMADOS_PRODUCT_SLUG, event: "ViewContent", eventId, waitForFbpMs: 1500 });
  }, []);

  // Barra fija móvil: aparece cuando el hero ya quedó arriba de la pantalla. Se calcula al hacer scroll (y al cargar, por si la
  // página abre ya desplazada) en vez de usar un IntersectionObserver: un observador sobre un marcador sin altura solo avisa si
  // el marcador cruza la pantalla, y un salto brusco de scroll lo puede saltar de largo.
  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setStickyVisible(trigger.getBoundingClientRect().top < 0);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // InitiateCheckout y clic en ab_sessions al hacer clic en CUALQUIER botón de compra (incluida la barra fija), antes de salir a Stripe.
  // El href es el link real (Ctrl/Cmd-clic funciona solo); un clic normal se intercepta para registrar el evento y guardar la atribución
  // de Meta. Con el link vacío solo se registra el clic y no se navega. Nada de tracking impide pagar.
  const paymentLink: string = ESTIMADOS_PAYMENT_LINK;
  const checkoutHref = paymentLink ? estimadosCheckoutUrl(paymentLink) : "#";

  const handleCheckoutClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    const opensElsewhere = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
    if (!opensElsewhere) e.preventDefault();

    try {
      if (ESTIMADOS_PIXEL_ID) {
        const eventId = uuid();
        trackMetaEvent("InitiateCheckout", estimadosEventParams(price), eventId, ESTIMADOS_PIXEL_ID);
        void sendProductServerEvent({ product: ESTIMADOS_PRODUCT_SLUG, event: "InitiateCheckout", eventId });
      }
      const sid = abSessionIdRef.current;
      if (sid) {
        try { localStorage.setItem(ESTIMADOS_AB_CHECKOUT_SESSION_KEY, sid); } catch { /* no crítico */ }
        trackAbClick(sid);
      }
    } catch { /* no crítico */ }

    if (opensElsewhere || !paymentLink) return;

    // Cookies de Meta del comprador → checkout_attribution; su id viaja a Stripe en client_reference_id y el
    // webhook lo usa en la Conversions API. Máximo 800 ms de espera (y 250 ms para que salgan pixel y ab_track).
    let attributionId: string | undefined;
    try {
      attributionId = uuid();
      await Promise.all([saveCheckoutAttribution(attributionId), new Promise((resolve) => setTimeout(resolve, 250))]);
    } catch {
      attributionId = undefined;
    }
    window.location.href = estimadosCheckoutUrl(paymentLink, attributionId);
  };

  const buy = (label: ReactNode) => (
    <a className="est-btn" href={checkoutHref} onClick={handleCheckoutClick}>
      {label}<Ic id="arrow" />
    </a>
  );

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={EST_FONT_HREF} rel="stylesheet" />
      {ESTIMADOS_PIXEL_ID && (
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${ESTIMADOS_PIXEL_ID}&ev=PageView&noscript=1`} alt="" />
        </noscript>
      )}
      <style>{EST_CSS}</style>

      <div className="est-page" data-product={ESTIMADOS_PRODUCT_SLUG} aria-label={ESTIMADOS_CONTENT_NAME}>
        <Icons />

        {SHOW_RATING_STRIP && (
          <div className="est-top-proof">
            <img src={`${IMG}/rating-strip.png`} alt="Calificación de 4.5 sobre 5 estrellas. Experiencia con profesionales de todo el mundo" width={540} height={73} />
          </div>
        )}

        {/* ============ 1. HERO ============ */}
        <header className="est-hero est-hero--center">
          <div className="est-wrap">
            <span className="est-eyebrow">Para dueños de tree service en EE.UU.</span>
            <h1>Consigue <span className="est-hl">más clientes</span> para tu negocio de tree service</h1>
            <p className="est-sub">Con <b>50 anuncios virales validados</b> para Facebook e Instagram</p>

            <div className="est-nokno">
              <Ic id="phone" />
              <p>Aunque no sepas nada de <b>marketing, diseño, redes sociales ni tecnología</b></p>
            </div>

            <picture className="est-hero-pic">
              <source srcSet={`${IMG}/hero.webp`} type="image/webp" />
              <img src={`${IMG}/hero.jpg`} width={1500} height={1000} alt="Versus: a la izquierda, un dueño de tree service preocupado, con la agenda vacía y el alcance de sus redes bajando. A la derecha, otro dueño sonriendo, con la agenda llena, el alcance subiendo y el kit de 50 anuncios virales" />
            </picture>

            <div className="est-cta">
              {buy(<span>Quiero los 50 anuncios US${price}</span>)}
              <TrustRow />
            </div>
          </div>
        </header>
        <div ref={triggerRef} />

        {/* ============ 2. LO QUE YA PROBASTE ============ */}
        <section className="est-sec">
          <div className="est-wrap">
            <h2 className="est-long">Lo que seguramente ya probaste, <span className="est-hl">pero no te trajo más clientes</span></h2>
            <div className="est-nots">
              {NOTS.map((n) => (
                <div className="est-not" key={n.t}>
                  <span className="est-x"><Ic id="x" /></span>
                  <div><h3>{n.t}</h3><p>{n.d}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ 3. OFERTA ============ */}
        <section className="est-sec est-sec--offer" id="est-oferta">
          <div className="est-wrap">
            <div className="est-offer-card">
              <span className="est-offer-tag">Entonces, ¿qué sí funciona?</span>
              <h2 className="est-product">Kit de 50 <span className="est-hl">anuncios virales</span> para negocios de tree services</h2>
              <p className="est-tagline">Para llenar tu calendario de estimados y tener más clientes recurrentemente.</p>

              <Bundle />

              <p className="est-inc-label">Dentro del kit</p>
              <div className="est-items">
                <div className="est-it"><span className="est-ck"><Ic id="check" /></span><div><b>50 anuncios en español y en inglés</b><span>Formatos virales ya validados para Facebook e Instagram.</span></div></div>
                <div className="est-it"><span className="est-ck"><Ic id="check" /></span><div><b>Guía para personalizar con tu logo y tu marca</b>
                  <ul className="est-sublist"><li><strong>Rápido</strong> (menos de 2 minutos)</li><li><strong>Fácil</strong> (desde el celular)</li><li><strong>Gratis</strong> (sin contratar diseñador)</li></ul></div></div>
                <div className="est-it"><span className="est-ck"><Ic id="check" /></span><div><b>Tabla de promesas</b><span>Qué debes poder cumplir antes de usar cada anuncio.</span></div></div>
              </div>

              <div className="est-price-card">
                <p className="est-amount-label">Pago único</p>
                <div className="est-amount">{showListPrice && <s>US${listPrice}</s>}US${price}</div>
                <div className="est-cta" style={{ marginTop: 14 }}>
                  {buy(<>Sí, quiero los 50 anuncios </>)}
                  <TrustRow />
                  <PayRow />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ 4. LISTOS EN 3 PASOS ============ */}
        <section className="est-sec">
          <div className="est-wrap">
            <h2>Listos en 3 pasos</h2>
            <div className="est-steps">
              <div className="est-step"><span className="est-n">1</span><div><b>Elige tu anuncio viral</b></div></div>
              <div className="est-step"><span className="est-n">2</span><div><b>Ponle tu logo, fácil y rápido desde el celular</b></div></div>
              <div className="est-step"><span className="est-n">3</span><div><b>Publícalo y Promociónalo</b></div></div>
            </div>
          </div>
        </section>

        {/* ============ 5. GALERÍA ============ */}
        <section className="est-sec" style={{ paddingTop: 20 }}>
          <div className="est-wrap">
            <h2>Algunos de los anuncios a los que vas a acceder</h2>
            <p>Son decenas de variaciones y estilos de posts virales con más de 5K likes en cada post, señal de que capta la atención de los usuarios.</p>
            <div className="est-gal">
              <span className="est-lab">Español</span>
              <AdRow ads={ES_ADS} lang="es" dir="right" />
              <span className="est-lab">English</span>
              <AdRow ads={EN_ADS} lang="en" dir="left" />
            </div>
            <div className="est-cta" style={{ marginTop: 6 }}>
              {buy(<span>Quiero estos anuncios · US${price}</span>)}
            </div>
          </div>
        </section>

        {/* ============ 6. UN ANUNCIO PARA CADA MOMENTO ============ */}
        <section className="est-sec est-sec--night">
          <div className="est-wrap">
            <h2>Un anuncio para cada momento de tu cliente</h2>
            <div className="est-when">
              {MOMENTS.map((m) => (
                <div className="est-w" key={m.lbl}>
                  <div className="est-top"><span className="est-lbl">{m.lbl}</span><span className="est-num">{m.n}<small>anuncios</small></span></div>
                  <q>{m.q}</q>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ 7. GARANTÍA ============ */}
        <section className="est-sec">
          <div className="est-wrap">
            <div className="est-guar">
              <div className="est-seal"><span><b>{days}</b>días</span></div>
              <div>
                <h2>Garantía de {days} días</h2>
                <p>Descarga el kit, personaliza tus anuncios, publícalos. Si después de {days} días de publicar constantemente no ves una mejora, haremos nuevos diseños virales y personalizados solo para ti. Gratis. Sin objeciones.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ 8. PREGUNTAS FRECUENTES ============ */}
        <section className="est-sec est-sec--cool">
          <div className="est-wrap">
            <h2>Preguntas frecuentes</h2>
            <div className="est-faq">
              {FAQ.map((f) => (
                <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
              ))}
            </div>
          </div>
        </section>

        {/* ============ 9. CIERRE ============ */}
        <section className="est-sec est-final">
          <div className="est-wrap">
            <h2>Tus anuncios con tu logo <span className="est-hl">publicados esta semana</span></h2>
            <ul className="est-checks">
              <li><Ic id="check" />Tendrás tu primer anuncio con tu logo</li>
              <li><Ic id="check" />Tus clientes sentirán que sí les hablas con tus anuncios</li>
              <li><Ic id="check" />Atenderás a clientes en español y en inglés</li>
              <li><Ic id="check" />Dejarás de pensar qué publicar</li>
            </ul>

            <Bundle />

            <div className="est-cta">
              {buy(<span>Quiero empezar hoy · US${price}</span>)}
              <TrustRow />
              <PayRow />
            </div>
          </div>
        </section>

        {/* Barra fija móvil */}
        <div className={`est-sticky${stickyVisible ? " est-is-visible" : ""}`}>
          <div className="est-p">US${price}<small>pago único</small></div>
          {buy(<span>Quiero los 50 anuncios</span>)}
        </div>
      </div>
    </>
  );
};

export default EstimadosLp;
