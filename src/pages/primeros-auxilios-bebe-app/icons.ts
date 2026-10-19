import { Flame, FlaskConical, Moon, ShieldAlert, Thermometer, Wind } from "lucide-react";
import type { CardIcon } from "./cards";

export const ICONS: Record<CardIcon, typeof Wind> = {
  wind: Wind,
  head: ShieldAlert,
  flame: Flame,
  thermometer: Thermometer,
  flask: FlaskConical,
  bed: Moon,
};
