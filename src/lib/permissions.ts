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
  | "dashboard"
  | "ventas"
  | "calendarios"
  | "formularios"
  | "contactos"
  | "pipeline"
  | "recordatorios";

export type Action = "read" | "edit" | "create" | "delete";

type PermKey = `perm_${Section}`;

/** Map section name → crm_staff column */
export const SECTION_TO_KEY: Record<Section, PermKey> = {
  mi_negocio_datos:    "perm_mi_negocio_datos",
  mi_negocio_personal: "perm_mi_negocio_personal",
  servicios:           "perm_servicios",
  dashboard:           "perm_dashboard",
  ventas:              "perm_ventas",
  calendarios:         "perm_calendarios",
  formularios:         "perm_formularios",
  contactos:           "perm_contactos",
  pipeline:            "perm_pipeline",
  recordatorios:       "perm_recordatorios",
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

type ItemSection = "calendarios" | "formularios" | "pipeline"
type ItemKey = `perm_${ItemSection}_items`

const ITEM_KEY: Record<ItemSection, ItemKey> = {
  calendarios: "perm_calendarios_items",
  formularios:  "perm_formularios_items",
  pipeline:     "perm_pipeline_items",
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
    // Principal sees everything
    return new Set(["overview", "business", "calendar", "forms", "contacts", "pipeline", "ventas", "reminders", "settings"]);
  }

  const can = buildPermChecker(staffRecord);
  const visible = new Set<string>();

  if (can("dashboard",        "read")) visible.add("overview");
  if (can("mi_negocio_datos", "read") || can("mi_negocio_personal", "read") || can("servicios", "read"))
    visible.add("business");
  if (can("calendarios",  "read")) visible.add("calendar");
  if (can("formularios",  "read")) visible.add("forms");
  if (can("contactos",     "read")) visible.add("contacts");
  if (can("pipeline",     "read")) visible.add("pipeline");
  if (can("ventas",       "read")) visible.add("ventas");
  if (can("recordatorios","read")) visible.add("reminders");
  // Staff cannot access settings (can't create more staff)

  return visible;
}
