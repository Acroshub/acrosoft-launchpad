import { Fragment, useState, type ReactNode } from "react";
import { PISCINAS_GUARANTEE_DAYS } from "@/lib/piscinasConfig";

// Piezas compartidas por las 4 páginas del embudo de Piscinas: sprite de iconos SVG, fila de
// confianza, medios de pago e imagen que se oculta sola si el archivo todavía no existe.

/** Sprite de iconos (se inserta una vez por página; se usan con <use href="#i-..."/>). */
export function PiscinasIcons() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <symbol id="i-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></symbol>
      <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><polyline points="3 7 12 13 21 7" /></symbol>
      <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 16 14" /></symbol>
      <symbol id="i-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></symbol>
      <symbol id="i-chat" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4Z" /><line x1="8" y1="9.5" x2="16" y2="9.5" /><line x1="8" y1="12.5" x2="13" y2="12.5" /></symbol>
      <symbol id="i-coin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M14.8 9.3c-.4-1-1.4-1.5-2.8-1.5-1.6 0-2.7.8-2.7 2 0 3 5.6 1.4 5.6 4.4 0 1.2-1.1 2-2.9 2-1.5 0-2.5-.6-3-1.7" /><line x1="12" y1="6.5" x2="12" y2="7.8" /><line x1="12" y1="16.2" x2="12" y2="17.5" /></symbol>
      <symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><line x1="3" y1="12" x2="21" y2="12" /></symbol>
      <symbol id="i-phone" viewBox="0 0 24 24"><path d="M6.5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 5.2 5.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" /></symbol>
      <symbol id="i-megaphone" viewBox="0 0 24 24"><path d="M4 10v4h3l8 4V6L7 10Z" /><path d="M18 9.5a3.5 3.5 0 0 1 0 5" /><path d="M7 14l1 5h2.5l-1-4.2" /></symbol>
      <symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><line x1="3.5" y1="10" x2="20.5" y2="10" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="16" y1="3" x2="16" y2="7" /></symbol>
      <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" /></symbol>
      <symbol id="i-rocket" viewBox="0 0 24 24"><path d="M12 3c3.5 2 5 5.5 5 9l-2 3H9l-2-3c0-3.5 1.5-7 5-9Z" /><circle cx="12" cy="10" r="1.6" /><path d="M9 15l-2.5 3.5M15 15l2.5 3.5M12 15v4" /></symbol>
      <symbol id="i-headset" viewBox="0 0 24 24"><path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2" /><rect x="3.5" y="13" width="3.5" height="6" rx="1.5" /><rect x="17" y="13" width="3.5" height="6" rx="1.5" /><path d="M18.5 19c0 1.5-2 2.5-5 2.5" /></symbol>
      <symbol id="i-eye" viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></symbol>
      <symbol id="i-trend" viewBox="0 0 24 24"><polyline points="3.5 17 9.5 11 13 14.5 20.5 6.5" /><polyline points="15 6.5 20.5 6.5 20.5 12" /></symbol>
      <symbol id="i-key" viewBox="0 0 24 24"><circle cx="8" cy="12" r="3.8" /><path d="M11.8 12H21M17.5 12v3.5M20.5 12v2.5" /></symbol>
      <symbol id="i-wrench" viewBox="0 0 24 24"><path d="M14.5 6.5a4 4 0 0 0 4.9 4.9l-9.2 9.2a2.1 2.1 0 0 1-3-3Z" /><path d="M14.5 6.5 17 9" /></symbol>
      <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 4v11" /><polyline points="7.5 11 12 15.5 16.5 11" /><path d="M5 19.5h14" /></symbol>
      <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3 4.5 6v5.5c0 4.4 3 8 7.5 9.5 4.5-1.5 7.5-5.1 7.5-9.5V6Z" /><polyline points="9 12 11.2 14.2 15.2 10" /></symbol>
      <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></symbol>
      <symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></symbol>
      <symbol id="i-undo" viewBox="0 0 24 24"><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></symbol>
      <symbol id="i-triangle-right" viewBox="0 0 24 24"><path d="M7 4v16l14-8z" fill="currentColor" stroke="none" /></symbol>
      <symbol id="pay-visa" viewBox="0 0 24 24"><path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z" /></symbol>
      <symbol id="pay-mastercard" viewBox="0 0 24 24"><path d="M11.343 18.031c.058.049.12.098.181.146-1.177.783-2.59 1.238-4.107 1.238C3.32 19.416 0 16.096 0 12c0-4.095 3.32-7.416 7.416-7.416 1.518 0 2.931.456 4.105 1.238-.06.051-.12.098-.165.15C9.6 7.489 8.595 9.688 8.595 12c0 2.311 1.001 4.51 2.748 6.031zm5.241-13.447c-1.52 0-2.931.456-4.105 1.238.06.051.12.098.165.15C14.4 7.489 15.405 9.688 15.405 12c0 2.31-1.001 4.507-2.748 6.031-.058.049-.12.098-.181.146 1.177.783 2.588 1.238 4.107 1.238C20.68 19.416 24 16.096 24 12c0-4.094-3.32-7.416-7.416-7.416zM12 6.174c-.096.075-.189.15-.28.231C10.156 7.764 9.169 9.765 9.169 12c0 2.236.987 4.236 2.551 5.595.09.08.185.158.28.232.096-.074.189-.152.28-.232 1.563-1.359 2.551-3.359 2.551-5.595 0-2.235-.987-4.236-2.551-5.595-.09-.08-.184-.156-.28-.231z" /></symbol>
      <symbol id="pay-amex" viewBox="0 0 24 24"><path d="M16.015 14.378c0-.32-.135-.496-.344-.622-.21-.12-.464-.135-.81-.135h-1.543v2.82h.675v-1.027h.72c.24 0 .39.024.478.125.12.13.104.38.104.55v.35h.66v-.555c-.002-.25-.017-.376-.108-.516-.06-.08-.18-.18-.33-.234l.02-.008c.18-.072.48-.297.48-.747zm-.87.407l-.028-.002c-.09.053-.195.058-.33.058h-.81v-.63h.824c.12 0 .24 0 .33.05.098.048.156.147.15.255 0 .12-.045.215-.134.27zM20.297 15.837H19v.6h1.304c.676 0 1.05-.278 1.05-.884 0-.28-.066-.448-.187-.582-.153-.133-.392-.193-.73-.207l-.376-.015c-.104 0-.18 0-.255-.03-.09-.03-.15-.105-.15-.21 0-.09.017-.166.09-.21.083-.046.177-.066.272-.06h1.23v-.602h-1.35c-.704 0-.958.437-.958.84 0 .9.776.855 1.407.87.104 0 .18.015.225.06.046.03.082.106.082.18 0 .077-.035.15-.08.18-.06.053-.15.07-.277.07zM0 0v10.096L.81 8.22h1.75l.225.464V8.22h2.043l.45 1.02.437-1.013h6.502c.295 0 .56.057.756.236v-.23h1.787v.23c.307-.17.686-.23 1.12-.23h2.606l.24.466v-.466h1.918l.254.465v-.466h1.858v3.948H20.87l-.36-.6v.585h-2.353l-.256-.63h-.583l-.27.614h-1.213c-.48 0-.84-.104-1.08-.24v.24h-2.89v-.884c0-.12-.03-.12-.105-.135h-.105v1.036H6.067v-.48l-.21.48H4.69l-.202-.48v.465H2.235l-.256-.624H1.4l-.256.624H0V24h23.786v-7.108c-.27.135-.613.18-.973.18H21.09v-.255c-.21.165-.57.255-.914.255H14.71v-.9c0-.12-.018-.12-.12-.12h-.075v1.022h-1.8v-1.066c-.298.136-.643.15-.928.136h-.214v.915h-2.18l-.54-.617-.57.6H4.742v-3.93h3.61l.518.602.554-.6h2.412c.28 0 .74.03.942.225v-.24h2.177c.202 0 .644.045.903.225v-.24h3.265v.24c.163-.164.508-.24.803-.24h1.89v.24c.194-.15.464-.24.84-.24h1.176V0H0zM21.156 14.955c.004.005.006.012.01.016.01.01.024.01.032.02l-.042-.035zM23.828 13.082h.065v.555h-.065zM23.865 15.03v-.005c-.03-.025-.046-.048-.075-.07-.15-.153-.39-.215-.764-.225l-.36-.012c-.12 0-.194-.007-.27-.03-.09-.03-.15-.105-.15-.21 0-.09.03-.16.09-.204.076-.045.15-.05.27-.05h1.223v-.588h-1.283c-.69 0-.96.437-.96.84 0 .9.78.855 1.41.87.104 0 .18.015.224.06.046.03.076.106.076.18 0 .07-.034.138-.09.18-.045.056-.136.07-.27.07h-1.288v.605h1.287c.42 0 .734-.118.9-.36h.03c.09-.134.135-.3.135-.523 0-.24-.045-.39-.135-.526zM18.597 14.208v-.583h-2.235V16.458h2.235v-.585h-1.57v-.57h1.533v-.584h-1.532v-.51M13.51 8.787h.685V11.6h-.684zM13.126 9.543l-.007.006c0-.314-.13-.5-.34-.624-.217-.125-.47-.135-.81-.135H10.43v2.82h.674v-1.034h.72c.24 0 .39.03.487.12.122.136.107.378.107.548v.354h.677v-.553c0-.25-.016-.375-.11-.516-.09-.107-.202-.19-.33-.237.172-.07.472-.3.472-.75zm-.855.396h-.015c-.09.054-.195.056-.33.056H11.1v-.623h.825c.12 0 .24.004.33.05.09.04.15.128.15.25s-.047.22-.134.266zM15.92 9.373h.632v-.6h-.644c-.464 0-.804.105-1.02.33-.286.3-.362.69-.362 1.11 0 .512.123.833.36 1.074.232.238.645.31.97.31h.78l.255-.627h1.39l.262.627h1.36v-2.11l1.272 2.11h.95l.002.002V8.786h-.684v1.963l-1.18-1.96h-1.02V11.4L18.11 8.744h-1.004l-.943 2.22h-.3c-.177 0-.362-.03-.468-.134-.125-.15-.186-.36-.186-.662 0-.285.08-.51.194-.63.133-.135.272-.165.516-.165zm1.668-.108l.464 1.118v.002h-.93l.466-1.12zM2.38 10.97l.254.628H4V9.393l.972 2.205h.584l.973-2.202.015 2.202h.69v-2.81H6.118l-.807 1.904-.876-1.905H3.343v2.663L2.205 8.787h-.997L.01 11.597h.72l.26-.626h1.39zm-.688-1.705l.46 1.118-.003.002h-.915l.457-1.12zM11.856 13.62H9.714l-.85.923-.825-.922H5.346v2.82H8l.855-.932.824.93h1.302v-.94h.838c.6 0 1.17-.164 1.17-.945l-.006-.003c0-.78-.598-.93-1.128-.93zM7.67 15.853l-.014-.002H6.02v-.557h1.47v-.574H6.02v-.51H7.7l.733.82-.764.824zm2.642.33l-1.03-1.147 1.03-1.108v2.253zm1.553-1.258h-.885v-.717h.885c.24 0 .42.098.42.344 0 .243-.15.372-.42.372zM9.967 9.373v-.586H7.73V11.6h2.237v-.58H8.4v-.564h1.527V9.88H8.4v-.507" /></symbol>
      <symbol id="pay-applepay" viewBox="0 0 24 24"><path d="M2.15 4.318a42.16 42.16 0 0 0-.454.003c-.15.005-.303.013-.452.04a1.44 1.44 0 0 0-1.06.772c-.07.138-.114.278-.14.43-.028.148-.037.3-.04.45A10.2 10.2 0 0 0 0 6.222v11.557c0 .07.002.138.003.207.004.15.013.303.04.452.027.15.072.291.142.429a1.436 1.436 0 0 0 .63.63c.138.07.278.115.43.142.148.027.3.036.45.04l.208.003h20.194l.207-.003c.15-.004.303-.013.452-.04.15-.027.291-.071.428-.141a1.432 1.432 0 0 0 .631-.631c.07-.138.115-.278.141-.43.027-.148.036-.3.04-.45.002-.07.003-.138.003-.208l.001-.246V6.221c0-.07-.002-.138-.004-.207a2.995 2.995 0 0 0-.04-.452 1.446 1.446 0 0 0-1.2-1.201 3.022 3.022 0 0 0-.452-.04 10.448 10.448 0 0 0-.453-.003zm0 .512h19.942c.066 0 .131.002.197.003.115.004.25.01.375.032.109.02.2.05.287.094a.927.927 0 0 1 .407.407.997.997 0 0 1 .094.288c.022.123.028.258.031.374.002.065.003.13.003.197v11.552c0 .065 0 .13-.003.196-.003.115-.009.25-.032.375a.927.927 0 0 1-.5.693 1.002 1.002 0 0 1-.286.094 2.598 2.598 0 0 1-.373.032l-.2.003H1.906c-.066 0-.133-.002-.196-.003a2.61 2.61 0 0 1-.375-.032c-.109-.02-.2-.05-.288-.094a.918.918 0 0 1-.406-.407 1.006 1.006 0 0 1-.094-.288 2.531 2.531 0 0 1-.032-.373 9.588 9.588 0 0 1-.002-.197V6.224c0-.065 0-.131.002-.197.004-.114.01-.248.032-.375.02-.108.05-.199.094-.287a.925.925 0 0 1 .407-.406 1.03 1.03 0 0 1 .287-.094c.125-.022.26-.029.375-.032.065-.002.131-.002.196-.003zm4.71 3.7c-.3.016-.668.199-.88.456-.191.22-.36.58-.316.918.338.03.675-.169.888-.418.205-.258.345-.603.308-.955zm2.207.42v5.493h.852v-1.877h1.18c1.078 0 1.835-.739 1.835-1.812 0-1.07-.742-1.805-1.808-1.805zm.852.719h.982c.739 0 1.161.396 1.161 1.089 0 .692-.422 1.092-1.164 1.092h-.979zm-3.154.3c-.45.01-.83.28-1.05.28-.235 0-.593-.264-.981-.257a1.446 1.446 0 0 0-1.23.747c-.527.908-.139 2.255.374 2.995.249.366.549.769.944.754.373-.014.52-.242.973-.242.454 0 .586.242.98.235.41-.007.667-.366.915-.733.286-.417.403-.82.41-.841-.007-.008-.79-.308-.797-1.209-.008-.754.615-1.113.644-1.135-.352-.52-.9-.578-1.09-.593a1.123 1.123 0 0 0-.092-.002zm8.204.397c-.99 0-1.606.533-1.652 1.256h.777c.072-.358.369-.586.845-.586.502 0 .803.266.803.711v.309l-1.097.064c-.951.054-1.488.484-1.488 1.184 0 .72.548 1.207 1.332 1.207.526 0 1.032-.281 1.264-.727h.019v.659h.788v-2.76c0-.803-.62-1.317-1.591-1.317zm1.94.072l1.446 4.009c0 .003-.073.24-.073.247-.125.41-.33.571-.711.571-.069 0-.206 0-.267-.015v.666c.06.011.267.019.335.019.83 0 1.226-.312 1.568-1.283l1.5-4.214h-.868l-1.012 3.259h-.015l-1.013-3.26zm-1.167 2.189v.316c0 .521-.45.917-1.024.917-.442 0-.731-.228-.731-.579 0-.342.278-.56.769-.593z" /></symbol>
      <symbol id="pay-googlepay" viewBox="0 0 24 24"><path d="M3.963 7.235A3.963 3.963 0 00.422 9.419a3.963 3.963 0 000 3.559 3.963 3.963 0 003.541 2.184c1.07 0 1.97-.352 2.627-.957.748-.69 1.18-1.71 1.18-2.916a4.722 4.722 0 00-.07-.806H3.964v1.526h2.14a1.835 1.835 0 01-.79 1.205c-.356.241-.814.379-1.35.379-1.034 0-1.911-.697-2.225-1.636a2.375 2.375 0 010-1.517c.314-.94 1.191-1.636 2.225-1.636a2.152 2.152 0 011.52.594l1.132-1.13a3.808 3.808 0 00-2.652-1.033zm6.501.55v6.9h.886V11.89h1.465c.603 0 1.11-.196 1.522-.588a1.911 1.911 0 00.635-1.464 1.92 1.92 0 00-.635-1.456 2.125 2.125 0 00-1.522-.598zm2.427.85a1.156 1.156 0 01.823.365 1.176 1.176 0 010 1.686 1.171 1.171 0 01-.877.357H11.35V8.635h1.487a1.156 1.156 0 01.054 0zm4.124 1.175c-.842 0-1.477.308-1.907.925l.781.491c.288-.417.68-.626 1.175-.626a1.255 1.255 0 01.856.323 1.009 1.009 0 01.366.785v.202c-.34-.193-.774-.289-1.3-.289-.617 0-1.11.145-1.479.434-.37.288-.554.677-.554 1.165a1.476 1.476 0 00.525 1.156c.35.308.785.463 1.305.463.61 0 1.098-.27 1.465-.81h.038v.655h.848v-2.909c0-.61-.19-1.09-.568-1.44-.38-.35-.896-.525-1.551-.525zm2.263.154l1.946 4.422-1.098 2.38h.915L24 9.963h-.965l-1.368 3.391h-.02l-1.406-3.39zm-2.146 2.368c.494 0 .88.11 1.156.33 0 .372-.147.696-.44.973a1.413 1.413 0 01-.997.414 1.081 1.081 0 01-.69-.232.708.708 0 01-.293-.578c0-.257.12-.47.363-.647.24-.173.54-.26.9-.26Z" /></symbol>
    </svg>
  );
}

export function Icon({ name }: { name: string }) {
  return <svg className="icon" aria-hidden="true"><use href={`#${name}`} /></svg>;
}

/** Tres señales de confianza en una fila, justo debajo de cada botón de compra del kit. */
export function TrustRow({ items }: { items?: { icon: string; label: string }[] }) {
  const list = items ?? [
    { icon: "i-lock", label: "Pago seguro" },
    { icon: "i-download", label: "Descarga inmediata" },
    { icon: "i-undo", label: `Garantía de ${PISCINAS_GUARANTEE_DAYS} días` },
  ];
  return (
    <ul className="trust-row">
      {list.map((it) => (
        <li key={it.label}><Icon name={it.icon} />{it.label}</li>
      ))}
    </ul>
  );
}

/** Frase honesta de oferta única (la única «escasez» permitida en los upsells: es real). */
export const UNIQUE_OFFER_NOTE = "Esta oferta es única dentro de este proceso: si cierras la página no la volverás a ver.";

/**
 * Presentación visual de 3 pasos (de dónde vienes → lo que hacemos → lo que quieres lograr).
 * Se usa justo antes de la primera tarjeta de decisión de los upsells.
 */
export function Journey({ nodes }: { nodes: { icon: string; label: string }[] }) {
  return (
    <div className="journey" role="list">
      {nodes.map((n, i) => (
        <Fragment key={n.label}>
          {i > 0 && <span className="arrow" aria-hidden="true"><Icon name="i-chevron" /></span>}
          <div className={`node${i === nodes.length - 1 ? " goal" : ""}`} role="listitem">
            <Icon name={n.icon} />
            <span>{n.label}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

/**
 * Tarjeta de decisión del método «El Interrogatorio»: UNA sola decisión — un botón «Sí» grande
 * y, directamente debajo, el enlace «No». Sin otros botones de compra dentro de la tarjeta.
 */
export function DecisionCard({
  id, name, top, aside, price, priceNote, yesLabel, yesHref, onYes, noLabel, noHref, trust, uniqueNote, yesDisabled, yesNote, notice,
}: {
  id?: string;
  name: string;
  /** Contenido sobre el título (p. ej. mockup). */
  top?: ReactNode;
  aside?: ReactNode;
  price: string;
  priceNote: string;
  yesLabel: string;
  yesHref: string;
  onYes: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  noLabel: string;
  noHref: string;
  trust: { icon: string; label: string }[];
  uniqueNote?: boolean;
  /** Cobro en un clic en curso: el botón «Sí» no responde (sin doble clic). */
  yesDisabled?: boolean;
  /** Línea de confianza bajo el botón «Sí». */
  yesNote?: ReactNode;
  /** Mensaje de estado (error / plan de reserva) bajo el botón «Sí». */
  notice?: ReactNode;
}) {
  return (
    <div className="cta-card decision-card" id={id}>
      {top}
      <h2 className="offer-name">{name}</h2>
      {aside}
      <p className="offer-price">{price}<small>{priceNote}</small></p>
      <a href={yesHref} onClick={onYes} className="btn btn-primary btn-yes" data-decision="yes" aria-disabled={yesDisabled || undefined}>{yesLabel}</a>
      {yesNote && <p className="yes-note">{yesNote}</p>}
      {notice && <div className="charge-notice" role="status" aria-live="polite">{notice}</div>}
      <a href={noHref} className="decline-link" data-decision="no">{noLabel}</a>
      <TrustRow items={trust} />
      {uniqueNote && <p className="unique-note"><Icon name="i-shield" />{UNIQUE_OFFER_NOTE}</p>}
    </div>
  );
}

export function PaymentIcons() {
  return (
    <div className="pc-payment">
      <span className="pc-payment-label">Pago 100% seguro procesado por Stripe</span>
      <div className="pc-payment-icons">
        <svg className="pay-icon" aria-hidden="true"><use href="#pay-visa" /></svg>
        <svg className="pay-icon" aria-hidden="true"><use href="#pay-mastercard" /></svg>
        <svg className="pay-icon" aria-hidden="true"><use href="#pay-amex" /></svg>
        <svg className="pay-icon" aria-hidden="true"><use href="#pay-applepay" /></svg>
        <svg className="pay-icon" aria-hidden="true"><use href="#pay-googlepay" /></svg>
      </div>
    </div>
  );
}

/**
 * Imagen de /public/piscinas/<archivo>. Si el archivo todavía no existe (o falla), el bloque entero
 * (`wrapperClass`) desaparece en vez de mostrar una imagen rota.
 */
export function PiscinasImage({
  src, alt, className, wrapperClass, width, height, onMissing,
}: {
  src: string; alt: string; className?: string; wrapperClass?: string; width?: number; height?: number; onMissing?: () => void;
}) {
  const [missing, setMissing] = useState(false);
  if (missing) return null;
  const img = (
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      onError={() => { setMissing(true); onMissing?.(); }}
    />
  );
  return wrapperClass ? <div className={wrapperClass}>{img}</div> : img;
}


export function UsFlag({ className = "us-flag" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 16" width="22" height="15" role="img" aria-label="Estados Unidos">
      <rect width="24" height="16" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={i * (16 / 13)} width="24" height={16 / 13} fill="#B22234" />
      ))}
      <rect width="10.5" height={16 * (7 / 13)} fill="#3C3B6E" />
      {[0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((c) => (
        <circle key={`${r}-${c}`} cx={1.9 + c * 3.2 + (r % 2) * 1.6} cy={1.5 + r * 1.7} r=".5" fill="#fff" />
      )))}
    </svg>
  );
}

export function MxFlag({ className = "us-flag" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 16" width="22" height="15" role="img" aria-label="México">
      <rect width="8" height="16" fill="#006847" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#CE1126" />
      <circle cx="12" cy="8" r="2.2" fill="#8C6B3F" />
      <circle cx="12" cy="8" r="1.2" fill="#2E7D32" />
    </svg>
  );
}

export function LangFlags() {
  return (
    <span className="lang-flags" aria-hidden="true">
      <UsFlag />
      <MxFlag />
    </span>
  );
}
