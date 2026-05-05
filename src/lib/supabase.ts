import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ─── CRM Types ────────────────────────────────────────────────

export type CrmContact = {
  id: string
  created_at: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  stage: string | null   // pipeline column name, or null if not in any pipeline
  tags: string[]
  notes: string | null
  custom_fields: Json
  master_doc_url?: string | null
  pipeline_position?: Record<string, number> | null
}

export type CrmPipeline = {
  id: string
  created_at: string
  user_id: string
  name: string
  type: 'contacts' | 'tasks'
  column_names: string[]
}

export type CrmTask = {
  id: string
  created_at: string
  user_id: string
  pipeline_id: string
  contact_id: string | null
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | null
  stage: string
  position: number
}

export type CrmAppointment = {
  id: string
  created_at: string
  user_id: string
  contact_id: string | null
  calendar_id: string | null
  date: string          // 'YYYY-MM-DD'
  hour: number          // 0-23
  minute: number        // 0-59
  duration_min: number
  service: string | null
  status: 'confirmed' | 'cancelled'
  notes: string | null
  google_event_id: string | null
  terms_accepted_at?: string | null
}

export type CrmBlockedSlot = {
  id: string
  created_at: string
  user_id: string
  calendar_id: string
  type: 'hours' | 'fullday' | 'range'
  date: string | null
  start_hour: number | null
  start_minute: number | null
  end_hour: number | null
  end_minute: number | null
  range_start: string | null
  range_end: string | null
  reason: string | null
}

export type CrmPipelineDeal = {
  id: string
  created_at: string
  user_id: string
  contact_id: string | null
  title: string
  stage: string
  value: number
  currency: string
  notes: string | null
  custom_fields: Json
}

export type CrmForm = {
  id: string
  created_at: string
  user_id: string
  name: string
  fields: Json[]
  sections?: Json[]
  multi_page?: boolean
  show_confirmation_step?: boolean
  confirmation_message?: string | null
  submit_label: string
  success_action: 'popup' | 'redirect'
  success_message: string | null
  success_image: 'icon' | 'logo'
  redirect_url: string | null
  slug: string | null
  auto_tags: string[]
  facebook_pixel_id?: string | null
  pipeline_ids?: string[]
  reminder_rules?: Json[]
  is_basic_form?: boolean
  language: string
}

export type CrmFormSubmission = {
  id: string
  created_at: string
  form_id: string
  data: Json
}

export type CrmCalendarConfig = {
  id: string
  created_at: string
  user_id: string
  contact_id: string | null
  name: string | null
  description: string | null
  duration_min: number
  buffer_min: number
  slug: string | null
  linked_form_id: string | null
  availability: Json
  google_token: Json | null
  google_calendar_id: string | null
  reminder_rules?: Json[]
  min_advance_hours: number
  max_future_days: number
  schedule_interval: number
  timezone: string
  language: string
}

export type CrmService = {
  id: string
  created_at: string
  user_id: string
  name: string
  description: string | null
  price: number
  currency: string
  is_recurring: boolean
  recurring_price: number | null
  recurring_interval: string | null
  recurring_label: string | null
  delivery_time: string | null
  benefits: string[] | null
  is_recommended: boolean | null
  active: boolean
  sort_order?: number
  is_saas: boolean
  discount_pct: number
  recurring_discount_pct: number
}

export type CrmSale = {
  id: string
  created_at: string
  user_id: string
  contact_id: string | null
  contact_name: string | null   // snapshot del nombre al momento de la venta
  service_id: string | null
  service_name: string | null
  amount: number
  currency: string
  type: 'initial' | 'recurring'
  notes: string | null
}

export type CrmContactNote = {
  id: string
  created_at: string
  contact_id: string
  user_id: string
  body: string
}

export type CrmBusinessProfile = {
  id: string
  created_at: string
  user_id: string
  first_name: string | null
  last_name: string | null
  contact_email: string | null
  contact_phone: string | null
  role: string | null
  business_name: string | null
  industry: string | null
  city: string | null
  country: string | null
  website: string | null
  whatsapp: string | null
  instagram: string | null
  facebook: string | null
  description: string | null
  logo_url: string | null
  color_primary: string
  color_secondary: string
  color_accent: string
  theme: string
  metrics_order?: Json
  landing_calendar_id?: string | null
  timezone: string
}

export type CrmReminderConfig = {
  id: string
  created_at: string
  user_id: string
  auto_enabled: boolean
  auto_reminder_before_hours: number
  default_type: 'email' | 'whatsapp'
  email_limit_per_month: number
  whatsapp_limit_per_month: number
}

export type CrmReminder = {
  id: string
  created_at: string
  user_id: string
  contact_id: string | null
  appointment_id: string | null
  type: 'email' | 'whatsapp'
  recipient_email: string | null
  recipient_phone: string | null
  scheduled_at: string
  message: string
  status: 'pending' | 'sent' | 'failed' | 'skipped'
  sent_at: string | null
  error: string | null
  is_auto: boolean
  is_personal?: boolean
  staff_id?: string | null
  business_target?: string | null
}

export type CrmContactPipelineMembership = {
  id: string
  created_at: string
  contact_id: string
  pipeline_id: string
  stage: string
  position: number
}

export type CrmClientAccount = {
  id: string
  created_at: string
  admin_user_id: string
  contact_id: string
  client_user_id: string | null
  client_email: string
  status: 'pending' | 'active' | 'disabled'
  disabled_at: string | null
  deleted_at: string | null
}

export type SupportTicket = {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  type: 'ticket' | 'suggestion'
  subject: string
  status: 'open' | 'in_progress' | 'resolved' | 'read'
  client_last_seen_at: string | null
}

export type SupportMessage = {
  id: string
  created_at: string
  ticket_id: string
  sender_id: string | null
  sender_role: 'client' | 'admin'
  content: string
  attachments: string[]
}

export type StaffPermission = {
  read: boolean
  edit?: boolean
  create?: boolean
  delete?: boolean
}

export type StaffItemPermission = { read: boolean; edit: boolean }

export type CrmStaff = {
  id: string
  created_at: string
  owner_user_id: string
  staff_user_id: string | null
  name: string
  email: string
  description: string | null
  status: 'invited' | 'active' | 'inactive'
  perm_mi_negocio_datos: StaffPermission
  perm_mi_negocio_personal: StaffPermission
  perm_servicios: StaffPermission
  perm_dashboard: StaffPermission
  perm_ventas: StaffPermission
  perm_calendarios: StaffPermission
  perm_formularios: StaffPermission
  perm_contactos:     StaffPermission
  perm_pipeline:      StaffPermission
  perm_recordatorios: StaffPermission
  // item-level overrides — null = no restriction (section perm applies to all)
  perm_calendarios_items: Record<string, StaffItemPermission> | null
  perm_formularios_items: Record<string, StaffItemPermission> | null
  perm_pipeline_items:    Record<string, StaffItemPermission> | null
}
