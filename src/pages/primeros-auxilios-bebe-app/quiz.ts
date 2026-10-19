// Banco de preguntas del quiz semanal. ARCHIVO DE CONTENIDO.
// Cada semana la app elige 5 según la etapa. Sin dosis ni diagnóstico.
import type { Stage } from "./types";

export interface QuizQuestion {
  id: string;
  stages: Stage[];
  question: string;
  options: string[];
  /** Índice de la opción correcta en `options`. */
  answer: number;
  explain: string;
}

const ALL: Stage[] = ["0-3", "3-6", "6-12"];

export const QUESTIONS: QuizQuestion[] = [
  { id: "q-atr-1", stages: ["3-6", "6-12"], question: "Tu bebé de 8 meses no puede toser ni llorar y se pone morado. ¿Qué haces primero?", options: ["Le doy agua", "Pido ayuda y le doy 5 golpes en la espalda y 5 compresiones en el pecho", "Espero a ver si se le pasa"], answer: 1, explain: "Es un atragantamiento grave. Pide ayuda, alterna golpes en la espalda y compresiones en el pecho y llama a emergencias." },
  { id: "q-atr-2", stages: ["3-6", "6-12"], question: "Tose fuerte y llora después de atragantarse. ¿Qué haces?", options: ["Le meto el dedo en la boca", "Lo dejo toser y lo vigilo de cerca", "Le doy golpes fuertes en la espalda de inmediato"], answer: 1, explain: "Si tose con fuerza, está sacando el objeto solo. No interfieras; actúa si deja de toser o de respirar." },
  { id: "q-atr-3", stages: ["6-12"], question: "¿Cuál de estos alimentos o cosas es más riesgoso para atragantarse a esta edad?", options: ["Puré suave", "Uva entera, frutos secos duros o monedas", "Una cuchara de silicona"], answer: 1, explain: "Redondos, duros o muy pequeños pueden tapar la vía aérea. Mantenlos fuera de su alcance." },
  { id: "q-caida-1", stages: ["3-6", "6-12"], question: "Tu bebé se cayó de la cama y está llorando, pero se calma pronto. ¿Qué haces?", options: ["Lo observo de cerca durante las siguientes horas y consulto si hay señales de alarma", "Lo dejo dormir sin mirarlo", "Le doy un medicamento por mi cuenta"], answer: 0, explain: "Observa cómo come, juega y reacciona. Llama si hay vómitos repetidos, adormilamiento, convulsiones o llanto que no se calma." },
  { id: "q-caida-2", stages: ALL, question: "¿Cuál es una señal de alarma tras un golpe en la cabeza?", options: ["Un chichón pequeño que se calma", "Vómitos repetidos o mucho sueño difícil de despertar", "Llorar un rato"], answer: 1, explain: "Vómitos repetidos, adormilamiento extremo, convulsiones o líquido por nariz u oídos requieren atención urgente." },
  { id: "q-caida-3", stages: ["0-3", "3-6"], question: "En el cambiador, ¿cuál es la regla más importante?", options: ["Tener siempre una mano sobre el bebé", "Cambiarlo rápido mientras busco el pañal", "Confiar en que aún no rueda"], answer: 0, explain: "Los bebés pueden rodar de pronto. Ten todo a mano y nunca te alejes." },
  { id: "q-que-1", stages: ["3-6", "6-12"], question: "Se derramó un líquido caliente sobre su brazo. ¿Qué haces primero?", options: ["Pongo hielo", "Agua fresca corriente varios minutos", "Mantequilla o pasta de dientes"], answer: 1, explain: "Agua fresca (no helada) enfría la piel. No uses hielo ni remedios caseros." },
  { id: "q-que-2", stages: ALL, question: "Al tomar algo caliente, ¿dónde debe estar tu bebé?", options: ["En mis brazos, es rápido", "Lejos de mí, en un lugar seguro", "Sobre mis piernas, con la taza a un lado"], answer: 1, explain: "Las tazas calientes cerca del bebé en brazos son una causa frecuente de quemaduras." },
  { id: "q-fie-1", stages: ["0-3"], question: "Un bebé de 2 meses tiene 38 °C o más. ¿Qué haces?", options: ["Espero a ver si baja", "Llamo al pediatra o voy a urgencias de inmediato", "Lo abrigo bien para que sude"], answer: 1, explain: "En menores de 3 meses la fiebre siempre se consulta de inmediato, aunque se vea bien." },
  { id: "q-fie-2", stages: ALL, question: "¿Cuál de estas es una señal de alarma?", options: ["Respira rápido y con esfuerzo, o se ve morado", "Quiere jugar un rato", "Tiene hipo"], answer: 0, explain: "La dificultad para respirar, el color morado, el decaimiento o las manchas que no desaparecen al presionar requieren ayuda urgente." },
  { id: "q-fie-3", stages: ["3-6", "6-12"], question: "Antes de llamar al pediatra por la fiebre, ¿qué conviene anotar?", options: ["Hora y valor de la temperatura, y cómo se comporta", "Nada, él lo averigua", "Solo el nombre del bebé"], answer: 0, explain: "Datos claros ayudan a decidir rápido. El profesional te indicará qué medicamento dar y en qué cantidad." },
  { id: "q-int-1", stages: ["3-6", "6-12"], question: "Sospechas que tragó un producto de limpieza. ¿Qué haces?", options: ["Le provoco el vómito", "Llamo de inmediato al centro de toxicología o emergencias y tengo el envase a mano", "Le doy leche"], answer: 1, explain: "No provoques el vómito. Llama enseguida y sigue las instrucciones; ten el envase a mano." },
  { id: "q-int-2", stages: ["6-12"], question: "Si tragó una pila de botón o un imán, ¿qué debes hacer?", options: ["Esperar si se ve bien", "Ir a urgencias de inmediato aunque se vea bien", "Darle mucha agua"], answer: 1, explain: "Pueden causar daños graves en poco tiempo, aunque no haya síntomas al principio." },
  { id: "q-sof-1", stages: ALL, question: "¿Cómo debe dormir un bebé para reducir el riesgo de sofocación?", options: ["Boca arriba, en superficie firme y sin objetos sueltos", "Boca abajo, con almohada", "En el sofá contigo"], answer: 0, explain: "Boca arriba, colchón firme y cuna despejada. Sin almohadas, peluches ni cobijas sueltas." },
  { id: "q-sof-2", stages: ["0-3", "3-6"], question: "Encuentras una cobija cubriéndole la cara. ¿Qué haces primero?", options: ["La retiro de inmediato y lo estimulo", "Llamo a alguien por mensaje", "Espero a que se mueva"], answer: 0, explain: "Retira lo que le tapa, estimúlalo y, si no responde o no respira, llama a emergencias." },
  { id: "q-gen-1", stages: ALL, question: "Cuando llamas a emergencias, ¿qué debes poder decir?", options: ["Dónde estás, qué pasó y la edad del bebé", "Solo mi nombre", "Que prefiero no llamar"], answer: 0, explain: "Dirección exacta, qué ocurrió y la edad del bebé. No cuelgues hasta que te lo indiquen." },
  { id: "q-gen-2", stages: ALL, question: "¿Esta app sustituye un curso de primeros auxilios?", options: ["Sí, es suficiente", "No: es un apoyo para los primeros segundos; conviene un curso presencial", "Solo en bebés pequeños"], answer: 1, explain: "No sustituye un curso presencial ni la consulta médica ni a los servicios de emergencia." },
  { id: "q-gen-3", stages: ALL, question: "Vas a dejar al bebé con otra persona. ¿Qué conviene?", options: ["Dejarle una hoja con números y pasos básicos", "Nada, ya sabrá", "Solo darle mi número"], answer: 0, explain: "Una hoja con números y cuándo llamar ayuda a que cualquier cuidador actúe rápido." },
];
