/**
 * Staff Permission System
 *
 * Staff members log in with their own Supabase Auth account.
 * Their permissions are stored in the crm_staff table under the principal's user_id.
 *
 * Usage:
 *   const { can } = useStaffPermissions();
 *   if (!can("contactos", "read")) return null;
 */

import type { CrmStaff, StaffPermission, StaffItemPermission } from "@/lib/supabase";

export type Section =
  | "mi_negocio_datos"
  | "mi_negocio_personal"
  | "servicios"
  | "productos_fisicos"
  | "productos_digitales"
  | "dashboard"
  | "ventas_reporte"
  | "ventas_registrar"
  | "calendarios"
  | "formularios"
  | "contactos"
  | "recordatorios"
  | "agente_ia";

export type Action = "read" | "edit" | "create" | "delete";

type PermKey = `perm_${Section}`;

/** Map section name → crm_staff column */
export const SECTION_TO_KEY: Record<Section, PermKey> = {
  mi_negocio_datos:     "perm_mi_negocio_datos",
  mi_negocio_personal:  "perm_mi_negocio_personal",
  servicios:            "perm_servicios",
  productos_fisicos:    "perm_productos_fisicos",
  productos_digitales:  "perm_productos_digitales",
  dashboard:            "perm_dashboard",
  ventas_reporte:       "perm_ventas_reporte",
  ventas_registrar:     "perm_ventas_registrar",
  calendarios:          "perm_calendarios",
  formularios:          "perm_formularios",
  contactos:            "perm_contactos",
  recordatorios:        "perm_recordatorios",
  agente_ia:            "perm_agente_ia",
};

/**
 * Returns a `can(section, action)` function for the given staff record.
 * If staffRecord is null (user is the Principal), all actions are allowed.
 */
export function buildPermChecker(staffRecord: CrmStaff | null) {
  return function can(section: Section, action: Action): boolean {
    // Principal users have unrestricted access
    if (!staffRecord) return true;

    const key = SECTION_TO_KEY[section];
    const perm = staffRecord[key] as StaffPermission | undefined;
    if (!perm) return false;
    return !!(perm as Record<string, boolean>)[action];
  };
}

export type ItemSection = "calendarios" | "formularios" | "servicios" | "productos_fisicos" | "productos_digitales"
type ItemKey = `perm_${ItemSection}_items`

const ITEM_KEY: Record<ItemSection, ItemKey> = {
  calendarios: "perm_calendarios_items",
  formularios:  "perm_formularios_items",
  servicios: "perm_servicios_items",
  productos_fisicos: "perm_productos_fisicos_items",
  productos_digitales: "perm_productos_digitales_items",
}

/**
 * Returns which IDs a staff member can access for a given section.
 * - null  → no item-level restriction (section perm applies globally)
 * - string[] → only these IDs are accessible
 */
export function getAllowedItemIds(
  staffRecord: CrmStaff | null,
  section: ItemSection,
): string[] | null {
  if (!staffRecord) return null
  const items = staffRecord[ITEM_KEY[section]] as Record<string, StaffItemPermission> | null
  if (items === null || items === undefined) return null
  return Object.keys(items).filter(id => items[id].read)
}

/**
 * Check if a staff member can perform an action on a specific item.
 */
export function canAccessItem(
  staffRecord: CrmStaff | null,
  section: ItemSection,
  itemId: string,
  action: "read" | "edit",
): boolean {
  if (!staffRecord) return true
  const items = staffRecord[ITEM_KEY[section]] as Record<string, StaffItemPermission> | null
  if (items === null || items === undefined) {
    return buildPermChecker(staffRecord)(section as Section, action)
  }
  const perm = items[itemId]
  if (!perm) return false
  return !!perm[action]
}

/**
 * Derive the nav sections visible to a staff member.
 * Returns a Set of View ids that should be shown in the sidebar.
 */
export function visibleNavItems(staffRecord: CrmStaff | null): Set<string> {
  if (!staffRecord) {
    return new Set(["overview", "servicios", "productos_fisicos", "productos_digitales", "business", "calendar", "forms", "contacts", "ventas_reporte", "ventas_registrar", "ventas_historial", "ventas_renovaciones", "ventas_stripe", "settings", "soporte", "tutoriales", "agente_ia", "comunicaciones", "push_notificaciones"]);
  }

  const can = buildPermChecker(staffRecord);
  const visible = new Set<string>();

  if (can("dashboard",        "read")) visible.add("overview");
  if (can("mi_negocio_datos", "read") || can("mi_negocio_personal", "read"))
    visible.add("business");
  if (can("servicios", "read")) visible.add("servicios");
  if (can("productos_fisicos", "read")) visible.add("productos_fisicos");
  if (can("productos_digitales", "read")) visible.add("productos_digitales");
  // Cursos: solo el principal lo ve (filtrado adicional al entrar al hub de Productos Digitales) — staff no accede
  if (can("calendarios",  "read")) visible.add("calendar");
  if (can("formularios",  "read")) visible.add("forms");
  if (can("contactos",     "read")) visible.add("contacts");
  if (can("ventas_reporte",   "read")) { visible.add("ventas_reporte"); visible.add("ventas_historial"); }
  if (can("ventas_registrar", "read")) { visible.add("ventas_registrar"); visible.add("ventas_renovaciones"); }
  if (can("agente_ia",    "read")) visible.add("agente_ia");
  // Soporte es visible para todo el staff (sin permiso específico requerido)
  visible.add("soporte");
  // Videos: solo el principal lo ve (filtrado adicional en Crm.tsx por isSaasClient)
  // Comunicaciones, Stripe y Notificaciones Push: solo el admin de Acrosoft (filtrado adicional en Crm.tsx) — staff no accede

  return visible;
}
