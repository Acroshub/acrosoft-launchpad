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
  date: string          // 'YYYY-MM-DD'
  hour: number          // 0-23
  duration_min: number
  service: string | null
  status: 'confirmed' | 'cancelled'
  notes: string | null
}

export type CrmBlockedSlot = {
  id: string
  created_at: string
  user_id: string
  type: 'hours' | 'fullday' | 'range'
  date: string | null
  start_hour: number | null
  end_hour: number | null
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
  auto_tags?: string[] | null
  facebook_pixel_id?: string | null
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
  name: string | null
  description: string | null
  duration_min: number
  buffer_min: number
  slug: string | null
  linked_form_id: string | null
  availability: Json
  google_token: Json | null
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
}
