// Tarjetas de emergencia. ARCHIVO DE CONTENIDO: edita aquí los textos.
//
// - Pasos cortos y generales, basados en guías reconocidas (Cruz Roja, AAP, OMS).
// - SIN dosis de medicamentos y SIN diagnóstico. No añadir cantidades de fármacos.
// - `pendingReview: true` muestra una marca visible en la tarjeta ("Contenido pendiente de
//   revisión profesional"). Quítala solo cuando un profesional de salud haya revisado esa tarjeta.

import type { Stage } from "./types";

export type CardIcon = "wind" | "head" | "flame" | "thermometer" | "flask" | "bed";

export interface EmergencyCard {
  id: string;
  title: string;
  /** Frase corta para la lista de inicio. */
  short: string;
  icon: CardIcon;
  /** Etapas en las que esta emergencia es más probable (ordena la lista de inicio). */
  stages: Stage[];
  see: string[];
  doNow: string[];
  callWhen: string[];
  avoid?: string[];
  /** Una línea extra según la etapa del bebé. */
  stageNotes: Partial<Record<Stage, string>>;
  sources: string;
  /** Marca visible "Contenido pendiente de revisión profesional". */
  pendingReview?: boolean;
}

export const CARDS: EmergencyCard[] = [
  {
    id: "atragantamiento",
    title: "Atragantamiento",
    short: "No puede llorar, toser ni respirar",
    icon: "wind",
    stages: ["0-3", "3-6", "6-12"],
    pendingReview: true,
    see: [
      "No puede llorar, toser ni hacer ruido, o la tos es muy débil.",
      "Abre la boca pero no sale aire; la cara se pone morada o azulada.",
      "Si tose fuerte y llora, está sacando el objeto solo: no lo toques.",
    ],
    doNow: [
      "Grita pidiendo ayuda y haz que alguien llame a emergencias. Si estás solo, sigue con los pasos y llama cuando puedas.",
      "Sostén al bebé boca abajo sobre tu antebrazo, apoyado en tu muslo, con la cabeza más baja que el cuerpo y la mandíbula sujeta con los dedos.",
      "Da 5 golpes firmes con la base de la mano entre los omóplatos.",
      "Voltéalo boca arriba, también apoyado en tu antebrazo y con la cabeza baja. Con dos dedos en el centro del pecho, da 5 compresiones.",
      "Repite 5 golpes y 5 compresiones hasta que expulse el objeto o llore.",
      "Si queda sin responder y no respira: pide que llamen a emergencias y empieza la reanimación (RCP) del lactante tal como te indique el operador o como aprendiste en un curso.",
    ],
    callWhen: [
      "Llama a emergencias de inmediato si no puede respirar, si pierde el conocimiento o si el objeto no sale.",
      "Aunque lo expulse, llévalo a revisión médica si tuvo morado, tos que sigue o dificultad para respirar.",
    ],
    avoid: [
      "No metas los dedos a ciegas en su boca.",
      "No lo cuelgues de los pies ni lo sacudas.",
      "No le des agua.",
    ],
    stageNotes: {
      "0-3": "A esta edad el riesgo viene sobre todo de la leche y de la regurgitación: mantén la cabeza ligeramente elevada después de comer.",
      "3-6": "Empieza a llevarse todo a la boca: revisa el suelo y lo que alcanza tu bolso.",
      "6-12": "Es la etapa de más riesgo: comida y objetos pequeños. Mantén lejos monedas, pilas, globos y trozos duros.",
    },
    sources: "Cruz Roja, AAP.",
  },
  {
    id: "caidas-cabeza",
    title: "Caídas y golpes en la cabeza",
    short: "Se cayó o se golpeó la cabeza",
    icon: "head",
    stages: ["0-3", "3-6", "6-12"],
    see: [
      "Llanto fuerte que se calma pronto, un chichón o un enrojecimiento: suele ser leve, pero obsérvalo.",
      "Señales de alarma: no despierta o está muy adormilado, vómitos repetidos, convulsiones, llanto que no se calma.",
      "También: sangrado que no para, bulto blando que crece, líquido o sangre por nariz u oídos, movimientos o miradas raras.",
    ],
    doNow: [
      "Mantén la calma, levántalo con cuidado sosteniendo cabeza y cuello y consuélalo.",
      "Si sangra, presiona con un paño limpio sin frotar. Para el chichón, un paño frío envuelto, unos minutos.",
      "Si hay sospecha de lesión de cuello o espalda, no lo muevas más de lo necesario y llama a emergencias.",
      "Durante las siguientes horas obsérvalo: que coma, juegue y reaccione como siempre.",
    ],
    callWhen: [
      "Llama a emergencias si pierde el conocimiento, convulsiona, no responde normal o tiene alguna señal de alarma.",
      "Consulta pronto al pediatra si fue una caída de altura, es menor de 3 meses o tienes dudas.",
    ],
    avoid: ["No lo dejes dormir sin vigilancia si te preocupa su estado: comprueba que responde cuando lo llamas o lo tocas."],
    stageNotes: {
      "0-3": "Si se cayó de brazos, cambiador o sofá, llama o consulta el mismo día aunque parezca estar bien.",
      "3-6": "Empieza a rodar: nunca lo dejes solo en cama o cambiador, ni un segundo.",
      "6-12": "Escaleras, sillita y andador son las causas más comunes: usa barreras y arneses siempre.",
    },
    sources: "AAP, Cruz Roja.",
  },
  {
    id: "quemaduras",
    title: "Quemaduras",
    short: "Líquido caliente, estufa o plancha",
    icon: "flame",
    stages: ["3-6", "6-12", "0-3"],
    see: [
      "Piel roja, con ampollas, o blanca o negruzca, tras líquido caliente, estufa, plancha, sol o electricidad.",
      "Llanto intenso; a veces menos dolor en quemaduras profundas, que son más graves.",
    ],
    doNow: [
      "Aleja al bebé de la fuente de calor y apaga la fuente si puedes hacerlo con seguridad.",
      "Pon la zona bajo agua fresca (no helada) corriente durante varios minutos.",
      "Quita con cuidado ropa y pañal de la zona si no están pegados a la piel; quita anillos o pulseras.",
      "Cubre sin apretar con un paño limpio o una gasa que no suelte pelusas.",
    ],
    callWhen: [
      "Llama a emergencias si la quemadura es grande, en cara, manos, genitales o articulaciones, si es profunda, por electricidad o por químicos, o si le cuesta respirar.",
      "En un bebé, consulta siempre aunque parezca pequeña.",
    ],
    avoid: [
      "No uses hielo, pasta de dientes, mantequilla ni remedios caseros.",
      "No revientes las ampollas.",
    ],
    stageNotes: {
      "0-3": "Comprueba la temperatura del agua del baño con tu muñeca o codo, y no lo cargues mientras tomas algo caliente.",
      "3-6": "Una taza caliente al alcance de sus manos al estar en tus brazos es la causa más frecuente: no bebas líquidos calientes con el bebé cargado.",
      "6-12": "Al gatear llega a la estufa, a la plancha y a los cables: usa protectores y mantén los mangos hacia adentro.",
    },
    sources: "Cruz Roja, AAP, OMS.",
  },
  {
    id: "fiebre",
    title: "Fiebre y señales de alarma",
    short: "Cuándo esperar y cuándo llamar ya",
    icon: "thermometer",
    stages: ["0-3", "3-6", "6-12"],
    see: [
      "Fiebre: temperatura de 38 °C o más tomada con un termómetro.",
      "Señales de alarma: respira rápido o con esfuerzo, se ve morado o muy pálido, está muy decaído o difícil de despertar, no come ni moja pañales, manchas en la piel que no desaparecen al presionar, llanto inconsolable, rigidez de cuello o convulsiones.",
    ],
    doNow: [
      "Toma la temperatura y anota la hora y el valor.",
      "Viste al bebé con ropa ligera y mantén la habitación fresca, sin abrigarlo de más.",
      "Ofrece líquidos o pecho/leche con frecuencia.",
      "Llama al pediatra o a la línea de salud y cuéntale lo que anotaste. Es el profesional quien indica qué medicamento dar y en qué cantidad.",
    ],
    callWhen: [
      "Menor de 3 meses con 38 °C o más: llama al pediatra o ve a urgencias de inmediato, aunque se vea bien.",
      "Llama a emergencias con cualquier señal de alarma de arriba, convulsión o si no responde con normalidad.",
      "Si la fiebre dura más de un día o dos, o tienes dudas, consulta.",
    ],
    avoid: [
      "No des medicamentos por tu cuenta sin indicación del profesional.",
      "No lo bañes con agua fría ni con alcohol.",
    ],
    stageNotes: {
      "0-3": "En esta etapa la fiebre siempre se consulta el mismo día. No esperes a ver si baja.",
      "3-6": "La fiebre después de una vacuna o con los dientes saliendo puede ocurrir, pero consúltalo y vigila las señales de alarma.",
      "6-12": "Observa cómo se comporta: si juega y toma líquidos es buena señal; si está apagado, llama.",
    },
    sources: "AAP, OMS.",
  },
  {
    id: "intoxicacion",
    title: "Intoxicación por ingestión",
    short: "Se tragó algo que no debía",
    icon: "flask",
    stages: ["6-12", "3-6", "0-3"],
    see: [
      "Sospechas que tragó medicinas, limpiadores, pilas de botón, imanes, plantas u otros productos.",
      "Olor químico en la boca, manchas o quemaduras en labios, vómitos, mucho sueño, dificultad para respirar o convulsiones.",
    ],
    doNow: [
      "Quita el producto de su alcance y sácale de la boca lo que se vea fácilmente.",
      "Llama enseguida al centro de toxicología o a emergencias de tu país y sigue sus instrucciones.",
      "Ten a mano el envase o la etiqueta: nombre del producto, qué cantidad cree que tragó y hace cuánto.",
      "Si hay pila de botón o imanes, ve a urgencias de inmediato, aunque parezca estar bien.",
    ],
    callWhen: [
      "Llama de inmediato aunque se vea bien: algunos efectos tardan en aparecer.",
      "Llama a emergencias si está muy dormido, convulsiona o le cuesta respirar.",
    ],
    avoid: [
      "No provoques el vómito.",
      "No le des leche, agua ni remedios caseros, salvo que te lo indique el centro de toxicología.",
    ],
    stageNotes: {
      "0-3": "Aún no alcanza nada, pero guarda desde ya medicinas y productos de limpieza en alto y bajo llave.",
      "3-6": "Pronto llegará a cajones y bolsos: revisa lo que hay al alcance del suelo.",
      "6-12": "Gatea y se lleva todo a la boca: bajo llave medicinas, limpiadores, cosméticos y pilas.",
    },
    sources: "Cruz Roja, AAP.",
  },
  {
    id: "sofocacion",
    title: "Sofocación",
    short: "Cara tapada, no respira bien al dormir",
    icon: "bed",
    stages: ["0-3", "3-6", "6-12"],
    see: [
      "Algo le tapa la nariz o la boca: cobija, almohada, peluche o cuerpo de un adulto.",
      "No responde, está pálido o morado, o no se le ve respirar.",
    ],
    doNow: [
      "Retira de inmediato lo que le cubre la cara y sácalo de ahí.",
      "Estimúlalo: palmadas suaves en la planta de los pies o en la espalda, y háblale.",
      "Si no respira o no responde: pide que llamen a emergencias y empieza la reanimación (RCP) del lactante tal como te indique el operador o como aprendiste en un curso.",
    ],
    callWhen: [
      "Llama a emergencias si no respira, está morado o no responde.",
      "Si reacciona pero se asustó, estuvo morado un momento o lo ves raro, consulta el mismo día.",
    ],
    avoid: ["No lo dejes dormir en sofás, sillones ni contigo en una cama con almohadas y cobijas sueltas."],
    stageNotes: {
      "0-3": "Para dormir: siempre boca arriba, en superficie firme y sin almohadas, peluches ni cobijas sueltas.",
      "3-6": "Aunque ruede solo, mantén la cuna despejada: sin peluches, protectores acolchados ni cobijas pesadas.",
      "6-12": "Cuidado con bolsas plásticas, cordones de cortinas y cables: son riesgos de asfixia.",
    },
    sources: "AAP, OMS.",
  },
];

export function getCard(id: string | undefined): EmergencyCard | undefined {
  return CARDS.find((c) => c.id === id);
}
