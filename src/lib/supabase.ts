import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Log instead of throw so React can still mount and show the ErrorBoundary
  console.error('[Acrosoft] Missing Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Check deployment environment settings.')
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key',
)

// Cliente sin sesión para queries públicas (landing pages, booking, formularios).
// Siempre envía requests como 'anon' sin importar quién esté logueado.
export const supabasePublic = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key',
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
)

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
  ai_collected_data?: Record<string, string> | null
  profile_pic_url?: string | null
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
  source: string | null
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
  facebook_pixel_id?: string | null
}

export type CrmGoogleEvent = {
  id: string
  user_id: string
  calendar_config_id: string | null
  google_event_id: string
  title: string | null
  start_at: string
  end_at: string
  synced_at: string
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
  show_on_landing: boolean
}

export type CrmSale = {
  id: string
  created_at: string
  user_id: string
  contact_id: string | null
  contact_name: string | null
  service_id: string | null
  service_name: string | null
  amount: number
  currency: string
  type: 'initial' | 'recurring'
  notes: string | null
  is_vip?: boolean
  vendor_id: string | null
  is_paid: boolean
  paid_at: string | null
  payment_proof_url: string | null
  commission_pct: number
  // Campos de ventas IA / productos
  product_id: string | null
  product_variant_id: string | null
  payment_method_id: string | null
  is_ai_sale: boolean
  status: 'confirmed' | 'pending_review' | 'rejected'
  wa_conversation_id: string | null
  deliverable_sent_at: string | null
  payment_method_type: string | null
  product_name: string | null
}

export type CrmPrice = {
  id: string
  user_id: string
  entity_type: 'product' | 'service' | 'course'
  entity_id: string
  currency: string
  price: number
  sort_order: number
  created_at: string
}

export type CrmEntityFaq = {
  id: string
  user_id: string
  entity_type: 'product' | 'service' | 'course'
  entity_id: string
  question: string
  answer: string
  sort_order: number
  created_at: string
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
  agent_faq: Array<{ q: string; a: string }> | null
  logo_url: string | null
  color_primary: string
  color_secondary: string
  color_accent: string
  theme: string
  metrics_order?: Json
  landing_calendar_id?: string | null
  vip_calendar_id?: string | null
  timezone: string
  slug: string | null
  onboarding_flags?: Record<string, boolean>
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
  channels: { email: boolean; whatsapp: boolean } | null
  recipient_email: string | null
  recipient_phone: string | null
  scheduled_at: string
  subject: string | null
  message: string
  status: 'pending' | 'sent' | 'failed' | 'skipped'
  sent_at: string | null
  error: string | null
  is_auto: boolean
  is_personal?: boolean
  staff_id?: string | null
  business_target?: string | null
  whatsapp_template_id?: string | null
  whatsapp_variable_map?: ReminderWaVarMap | null
}

export type CrmVideoCourse = {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  access_type: 'all' | 'specific'
  access_emails: string[]
  access_tags: string[]
  sort_order: number
  created_at: string
  updated_at: string
}

export type CrmVideoModule = {
  id: string
  course_id: string
  title: string
  description: string | null
  sort_order: number
  created_at: string
}

export type CrmVideo = {
  id: string
  course_id: string
  module_id: string
  title: string
  description: string | null
  bunny_video_id: string
  thumbnail_url: string | null
  duration_seconds: number | null
  sort_order: number
  created_at: string
}

export type CrmCourse = {
  id: string
  user_id: string
  title: string
  description: string | null
  slug: string
  thumbnail_url: string | null
  is_published: boolean
  price: number | null
  currency: string
  created_at: string
  updated_at: string
}

export type CrmCourseModule = {
  id: string
  course_id: string
  user_id: string
  title: string
  sort_order: number
  created_at: string
}

export type CrmCourseLesson = {
  id: string
  course_id: string
  module_id: string | null
  title: string
  content: string | null
  bunny_video_id: string | null
  video_duration_seconds: number | null
  video_status: "none" | "uploading" | "processing" | "ready" | "error"
  attachment_url: string | null
  attachment_name: string | null
  sort_order: number
  created_at: string
}

export type CrmCourseAccess = {
  id: string
  course_id: string
  email: string
  granted_by: string | null
  access_token: string | null
  token_expires_at: string | null
  granted_at: string
  expires_at: string | null
  status: "invited" | "active"
}

export type CrmCourseMagicLink = {
  id: string
  course_access_id: string
  token: string
  used_at: string | null
  expires_at: string
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

export type CrmSaasAccess = {
  id: string
  contact_id: string
  activated_by: string
  plan_id: string | null
  status: 'active' | 'suspended' | 'expired'
  starts_at: string
  expires_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  plan?: { id: string; name: string; price: number; currency: string } | null
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
  phone: string | null
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
  perm_agente_ia: StaffPermission
  // item-level overrides — null = no restriction (section perm applies to all)
  perm_calendarios_items: Record<string, StaffItemPermission> | null
  perm_formularios_items: Record<string, StaffItemPermission> | null
  perm_pipeline_items:    Record<string, StaffItemPermission> | null
}

export type CrmLog = {
  id: string
  created_at: string
  user_id: string
  action: 'create' | 'update' | 'delete'
  entity: string
  entity_id: string | null
  description: string | null
  performed_by_user_id: string | null
}

export type SupportNotificationRecipient = {
  id: string
  email: string
  active: boolean
  created_at: string
}

export type CrmVendor = {
  id: string
  created_at: string
  owner_user_id: string
  vendor_user_id: string | null
  name: string
  email: string
  whatsapp: string | null
  commission_pct: number
  slug: string
  status: 'invited' | 'active' | 'inactive'
  notes: string | null
  landing_calendar_id: string | null
}

export type CrmVendorLinks = {
  id: string
  created_at: string
  owner_user_id: string
  payment_link_title: string
  payment_link: string | null
  onboarding_link_title: string
  onboarding_link: string | null
}

export type CrmMaintenancePayment = {
  id: string
  created_at: string
  owner_user_id: string
  vendor_id: string
  month: string
  amount: number
  commission_pct: number
  commission_amount: number
  is_paid: boolean
  paid_at: string | null
  proof_url: string | null
  notes: string | null
}

export type CrmAIAgentConfig = {
  id: string
  user_id: string
  phone_number_id: string | null
  access_token: string | null
  waba_id: string | null
  app_secret: string | null
  verified_phone: string | null
  webhook_verify_token: string
  agent_name: string
  system_prompt: string | null
  model: string
  can_book_appointments: boolean
  can_create_contacts: boolean
  can_answer_services: boolean
  can_transfer_human: boolean
  active_days: number[]
  active_from: string
  active_until: string
  timezone: string
  off_hours_message: string | null
  session_timeout_minutes: number
  language: string
  is_active: boolean
  schedule: Record<string, { open: boolean; slots: { from: string; to: string }[] }> | null
  notify_on_transfer: boolean
  notify_email: string | null
  created_at: string
  updated_at: string
  // Selección de catálogo y detección de pagos
  products_mode: 'all' | 'selected' | 'none'
  selected_product_ids: string[]
  services_mode: 'all' | 'selected' | 'none'
  selected_service_ids: string[]
  courses_mode: 'all' | 'selected' | 'none'
  selected_course_ids: string[]
  auto_detect_payments: boolean
  payment_notify_email: string | null
  // Configuración estratégica B15-1
  agent_objectives: string[]
  agent_personality: string | null
  agent_proactivity: string | null
  agent_data_collect: string[]
  response_length: 'short' | 'normal' | 'detailed'
  emoji_level: 'none' | 'poco' | 'medio' | 'mucho'
  show_catalog_on_ask: boolean
  do_upsell: boolean
  confirm_summary: boolean
  agent_faq: Array<{ q: string; a: string }> | null
  use_business_faq: boolean
  agent_extra_prompt: string | null
  scheduling_calendar_id: string | null
  profile_picture_url: string | null
  agent_about: string | null
}

// ─── Productos ────────────────────────────────────────────────────────────────

export type CrmProduct = {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  name: string
  description: string | null
  price: number
  currency: string
  sku: string | null
  stock_enabled: boolean
  stock: number | null
  images: string[]
  has_variants: boolean
  deliverable_type: 'file' | 'text' | null
  deliverable_url: string | null
  deliverable_text: string | null
  deliverable_sent_at: string | null
  is_active: boolean
  sort_order: number
  discount_pct: number
  notified_low_stock: boolean
  notified_out_of_stock: boolean
}

export type CrmProductVariant = {
  id: string
  created_at: string
  product_id: string
  name: string
  price_override: number | null
  stock: number | null
  sort_order: number
  discount_pct: number
  notified_low_stock: boolean
  notified_out_of_stock: boolean
}

export type CrmPaymentMethod = {
  id: string
  created_at: string
  user_id: string
  entity_type: 'product' | 'product_variant' | 'service'
  entity_id: string
  type: 'bank_transfer' | 'payment_link' | 'qr_code'
  label: string | null
  content: string
  sort_order: number
}

export type CrmCatalog = {
  id: string
  created_at: string
  user_id: string
  name: string
  description: string | null
  slug: string
  cover_image: string | null
  is_active: boolean
  whatsapp_number: string | null
}

export type CrmCatalogProduct = {
  catalog_id: string
  product_id: string
  sort_order: number
}

export type CrmWaLabel = {
  id: string
  user_id: string
  name: string
  color: string
  hint: string | null
  created_at: string
}

export type CrmWaConversation = {
  id: string
  user_id: string
  phone: string
  contact_name: string | null
  contact_profile_pic: string | null
  mode: 'AI' | 'HUMAN' | 'FLOW'
  active_flow_id: string | null
  flow_step: number
  assigned_to: string | null
  last_message_at: string | null
  created_at: string
  unread_count: number
}

export type CrmWaMessage = {
  id: string
  media_type: string | null
  media_url: string | null
  conversation_id: string
  role: 'user' | 'assistant' | 'human'
  content: string
  transcription: string | null
  wa_message_id: string | null
  send_error: string | null
  created_at: string
  button_reply_id: string | null
  interactive_options: Array<{ label: string }> | null
}

export type SequenceStepOption = {
  label: string
  next_step_id: string | null
}

export type SequenceStepMedia = {
  url: string
  name: string
  mime_type?: string
}

export type SequenceStep = {
  id: string
  type: 'message' | 'question' | 'image' | 'video' | 'audio' | 'file' | 'link'
  text?: string
  options?: SequenceStepOption[]
  media?: SequenceStepMedia[]
  link_url?: string
  link_label?: string
  shared?: boolean
  next_step_id?: string | null  // undefined = legacy (usa índice); null = fin; string = ID del siguiente paso
  ai_enhance?: boolean          // si true, la IA personaliza el texto antes de enviar
}

export type CrmWaSequence = {
  id: string
  user_id: string
  name: string
  product_id: string | null
  steps: SequenceStep[]
  created_at: string
  updated_at: string
}

export type CrmWaFlowFinalAction = 'nothing' | 'human_handoff'

export type CrmWaFlow = {
  id: string
  user_id: string
  name: string
  trigger_text: string
  sequence_id: string | null
  final_action: CrmWaFlowFinalAction
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── WhatsApp Templates (HSM) ─────────────────────────────────────────────────

export type WaTemplateButton =
  | { type: 'QUICK_REPLY'; text: string }
  | { type: 'URL';         text: string; url: string }
  | { type: 'PHONE_NUMBER'; text: string; phone_number: string }

export type WaTemplateHeaderType = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
export type WaTemplateCategory   = 'MARKETING' | 'UTILITY'
export type WaTemplateStatus     = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED'
export type WaTemplateContext    = 'remarketing' | 'notification'
export type WaTemplateAssocType  = 'product' | 'service' | 'course' | 'calendar' | 'form' | 'general'

export type CrmWaTemplate = {
  id: string
  user_id: string
  meta_template_id: string | null
  name: string
  category: WaTemplateCategory
  language: string
  header_type: WaTemplateHeaderType
  header_text: string | null
  body_text: string
  footer_text: string | null
  buttons: WaTemplateButton[]
  variable_labels: string[]
  usage_context: WaTemplateContext
  association_type: WaTemplateAssocType | null
  association_id: string | null
  local_status: WaTemplateStatus
  meta_status: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

// ─── WA Campaigns ─────────────────────────────────────────────────────────────

export type WaVarSource =
  | { source: "contact_field"; field: "name" | "email" | "phone" | "company" }
  | { source: "fixed"; value: string }
  | { source: "product_field"; entityId: string; entityName: string; field: "name" | "price" }
  | { source: "service_field"; entityId: string; entityName: string; field: "name" | "price" }
  | { source: "course_field";  entityId: string; entityName: string; field: "title" | "price" }

export type WaVarMap = Record<string, WaVarSource>

// Reminder-specific WA variable sources (context: contact + appointment + calendar + business)
export type ReminderWaVarSource =
  | { source: "contact_field";     field: "name" | "email" | "phone" }
  | { source: "appointment_field"; field: "date" | "time" | "service" }
  | { source: "calendar_field";    field: "name" }
  | { source: "business_field";    field: "name" }
  | { source: "fixed";             value: string }

export type ReminderWaVarMap = Record<string, ReminderWaVarSource>

export type WaAudienceFilter =
  | { type: "tag";                    value: string }
  | { type: "wa_label";               labelId: string;    labelName: string }
  | { type: "pipeline_stage";         pipelineId: string; pipelineName: string; stage: string }
  | { type: "has_sale_any" }
  | { type: "has_sale_product";       productId: string;  productName: string }
  | { type: "has_sale_service";       serviceId: string;  serviceName: string }
  | { type: "no_sale" }
  | { type: "has_appointment_ever" }
  | { type: "has_appointment_recent"; days: number }
  | { type: "has_wa_conversation" }

export type WaCampaignStatus = "draft" | "processing" | "completed" | "failed" | "cancelled"

export type CrmWaCampaign = {
  id: string
  user_id: string
  template_id: string
  name: string
  variable_map: WaVarMap
  audience_type: "all" | "include" | "exclude"
  audience_filters: WaAudienceFilter[]
  status: WaCampaignStatus
  total_contacts: number | null
  sent_count: number
  failed_count: number
  created_at: string
  started_at: string | null
  completed_at: string | null
  // joined
  crm_wa_templates?: { name: string; body_text: string; language: string } | null
}

export type CrmWaCampaignLog = {
  id: string
  campaign_id: string
  contact_id: string | null
  phone: string
  contact_name: string | null
  status: "pending" | "sent" | "failed"
  error_message: string | null
  sent_at: string | null
}

export type CrmWaInstantCampaign = {
  id: string
  user_id: string
  name: string
  message_text: string
  window_hours: number
  label_ids: string[]
  country_codes: string[]
  audience_type: "all" | "labels" | "countries" | "combined"
  send_mode: "instant" | "scheduled"
  timezone_mode: "user" | "contact" | null
  target_local_time: string | null
  target_date: string | null
  user_timezone: string | null
  scheduled_at: string | null
  status: "draft" | "scheduled" | "processing" | "completed" | "failed"
  total_contacts: number | null
  sent_count: number
  failed_count: number
  created_at: string
}

export type CrmWaInstantCampaignLog = {
  id: string
  campaign_id: string
  conversation_id: string | null
  phone: string | null
  contact_name: string | null
  status: "sent" | "failed" | "skipped"
  error_message: string | null
  created_at: string
}

// ─── WA Automations ───────────────────────────────────────────────────────────

export type WaAutomationTrigger = "new_conversation" | "label_assigned" | "inactivity"
export type WaAutomationMsgType = "free_text" | "template" | "free_text_with_fallback"
export type WaAutomationQueueStatus = "pending" | "sent" | "failed" | "skipped" | "cancelled"

export type CrmWaAutomation = {
  id: string
  user_id: string
  name: string
  is_active: boolean
  trigger_type: WaAutomationTrigger
  trigger_label_ids: string[]
  trigger_country_codes: string[]
  trigger_inactivity_hours: number | null
  delay_hours: number
  message_type: WaAutomationMsgType
  message_text: string | null
  template_id: string | null
  template_var_map: Record<string, any>
  sent_count: number
  skipped_count: number
  failed_count: number
  created_at: string
}

export type CrmWaAutomationQueueItem = {
  id: string
  user_id: string
  automation_id: string
  conversation_id: string
  scheduled_at: string
  status: WaAutomationQueueStatus
  error_message: string | null
  sent_at: string | null
  created_at: string
}

