/**
 * Límites de caracteres de los campos que viajan al prompt del agente IA.
 *
 * Cada valor tiene un trigger espejo en la base de datos que lo valida solo
 * cuando el campo cambia — el contenido guardado antes del límite sigue
 * funcionando. Si cambiás un número acá, cambiá también el trigger
 * correspondiente (migración `limite_caracteres_descripciones_y_prompt`).
 */

/** Descripción de productos y servicios — `crm_products` / `crm_services`. */
export const DESCRIPTION_MAX_CHARS = 1000;

/** Prompt personalizado del agente — `crm_ai_agent_config.system_prompt`. */
export const AGENT_PROMPT_MAX_CHARS = 7000;
