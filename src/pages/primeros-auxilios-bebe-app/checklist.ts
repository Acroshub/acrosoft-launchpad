// Checklist de casa segura por habitación. ARCHIVO DE CONTENIDO.
import type { Stage } from "./types";

export interface CheckItem {
  id: string;
  text: string;
  stages: Stage[];
}
export interface Room {
  id: string;
  title: string;
  items: CheckItem[];
}

const ALL: Stage[] = ["0-3", "3-6", "6-12"];
const MOVING: Stage[] = ["3-6", "6-12"];
const CRAWL: Stage[] = ["6-12"];

export const ROOMS: Room[] = [
  {
    id: "dormitorio",
    title: "Dormitorio y cuna",
    items: [
      { id: "dor-boca-arriba", text: "Duerme boca arriba, en superficie firme y plana.", stages: ALL },
      { id: "dor-cuna-vacia", text: "La cuna está despejada: sin almohadas, peluches, protectores ni cobijas sueltas.", stages: ALL },
      { id: "dor-sin-sofa", text: "Nunca duerme en sofás ni sillones, ni contigo con almohadas y cobijas sueltas.", stages: ALL },
      { id: "dor-barrotes", text: "Los barrotes de la cuna están firmes y el colchón ajusta sin dejar huecos.", stages: ALL },
      { id: "dor-colchon-bajo", text: "El colchón está en la posición más baja cuando empieza a sentarse o a pararse.", stages: CRAWL },
      { id: "dor-cortinas", text: "Cordones de cortinas y cables fuera de su alcance, lejos de la cuna.", stages: ALL },
      { id: "dor-mueble", text: "Muebles y cómodas están fijados a la pared.", stages: CRAWL },
    ],
  },
  {
    id: "cambiador",
    title: "Cambiador",
    items: [
      { id: "cam-mano", text: "Siempre una mano sobre el bebé; nunca lo dejas solo, ni un segundo.", stages: ALL },
      { id: "cam-todo", text: "Tienes pañales y toallitas a mano antes de empezar, sin alejarte.", stages: ALL },
      { id: "cam-polvo", text: "Cremas, tijeras y bolsas fuera de su alcance.", stages: MOVING },
      { id: "cam-suelo", text: "Si ya rueda mucho, cambia en el suelo sobre una manta.", stages: MOVING },
    ],
  },
  {
    id: "bano",
    title: "Baño",
    items: [
      { id: "ban-agua", text: "Compruebas la temperatura del agua con tu muñeca o codo antes de meterlo.", stages: ALL },
      { id: "ban-nunca", text: "Nunca lo dejas solo en la bañera, ni con muy poca agua.", stages: ALL },
      { id: "ban-calentador", text: "El calentador de agua tiene una temperatura segura, no quema.", stages: ALL },
      { id: "ban-medicinas", text: "Medicinas, cosméticos y limpiadores guardados bajo llave.", stages: MOVING },
      { id: "ban-tapa", text: "Tapa del inodoro y cubeta sin agua, fuera de su alcance.", stages: CRAWL },
    ],
  },
  {
    id: "cocina",
    title: "Cocina",
    items: [
      { id: "coc-mangos", text: "Mangos de ollas hacia adentro y usas los fogones de atrás.", stages: ALL },
      { id: "coc-caliente", text: "No cargas al bebé mientras cocinas o tomas algo caliente.", stages: ALL },
      { id: "coc-limpiadores", text: "Limpiadores y detergentes bajo llave o en lugar alto.", stages: MOVING },
      { id: "coc-cuchillos", text: "Cuchillos, bolsas plásticas y objetos pequeños fuera de su alcance.", stages: MOVING },
      { id: "coc-silla", text: "En la silla alta usa siempre el arnés; nunca lo dejas solo comiendo.", stages: CRAWL },
      { id: "coc-trozos", text: "Alimentos duros, redondos o pegajosos fuera de su alcance.", stages: CRAWL },
    ],
  },
  {
    id: "sala",
    title: "Sala y espacios de juego",
    items: [
      { id: "sal-enchufes", text: "Enchufes con protectores y cables recogidos.", stages: CRAWL },
      { id: "sal-esquinas", text: "Esquinas de mesas protegidas.", stages: CRAWL },
      { id: "sal-pequenos", text: "Piso revisado: sin monedas, pilas, botones ni piezas pequeñas.", stages: MOVING },
      { id: "sal-plantas", text: "Plantas y objetos frágiles fuera de su alcance.", stages: CRAWL },
      { id: "sal-bolso", text: "Tu bolso y los de las visitas fuera de su alcance (medicinas, llaves, monedas).", stages: MOVING },
      { id: "sal-sofa", text: "No lo dejas solo en sofás ni camas, aunque no ruede todavía.", stages: ALL },
    ],
  },
  {
    id: "escaleras",
    title: "Escaleras, puertas y ventanas",
    items: [
      { id: "esc-barrera", text: "Barreras firmes arriba y abajo de las escaleras.", stages: CRAWL },
      { id: "esc-ventanas", text: "Ventanas con seguro o tope y muebles lejos de ellas.", stages: MOVING },
      { id: "esc-balcon", text: "Balcón y terraza cerrados con acceso controlado.", stages: MOVING },
      { id: "esc-puertas", text: "Topes en las puertas para evitar pellizcos en los dedos.", stages: CRAWL },
      { id: "esc-brazos", text: "Al bajar escaleras con él en brazos, tienes una mano libre para el pasamanos.", stages: ALL },
    ],
  },
  {
    id: "auto",
    title: "Auto y salidas",
    items: [
      { id: "aut-silla", text: "Usas silla para auto adecuada a su edad y peso, bien instalada y mirando hacia atrás.", stages: ALL },
      { id: "aut-solo", text: "Nunca lo dejas solo en el auto, ni un momento.", stages: ALL },
      { id: "aut-cochecito", text: "Frenos del cochecito puestos y arnés abrochado.", stages: ALL },
      { id: "aut-sol", text: "Lo proteges del sol y compruebas que las hebillas del asiento no estén calientes.", stages: MOVING },
    ],
  },
  {
    id: "emergencia",
    title: "Preparación para emergencias",
    items: [
      { id: "eme-numeros", text: "Los números de emergencia están en la app y pegados en el refrigerador.", stages: ALL },
      { id: "eme-hoja", text: "Quienes lo cuidan (niñera, abuelos) saben qué hacer y dónde están los números.", stages: ALL },
      { id: "eme-botiquin", text: "Tienes un botiquín básico completo y revisado.", stages: ALL },
      { id: "eme-curso", text: "Tienes pendiente o ya hiciste un curso presencial de primeros auxilios pediátricos.", stages: ALL },
    ],
  },
];

export function itemsForStage(room: Room, stage: Stage): CheckItem[] {
  return room.items.filter((i) => i.stages.includes(stage));
}
