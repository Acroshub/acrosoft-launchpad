-- Notificación push por cada mensaje que llega al Agente IA. Default true: se activa
-- solo cuando el usuario ya tiene notificaciones push activadas (si no tiene ninguna
-- suscripción, simplemente no hay a quién enviarle nada); se puede apagar puntualmente
-- para esta funcionalidad sin afectar el resto de notificaciones push.
alter table crm_ai_agent_config
  add column if not exists notify_on_new_message boolean not null default true;
