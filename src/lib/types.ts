// src/lib/types.ts
// TrailBlaze CRM — Complete TypeScript type definitions

// ============================================
// Database models
// ============================================

export type PlanTier = 'starter' | 'growth' | 'scale' | 'enterprise' | 'beta'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'beta'
export type UserRole = 'admin' | 'account_manager' | 'viewer'
export type HealthStatus = 'healthy' | 'at_risk' | 'critical'
export type AccountStatus = 'onboarding' | 'active' | 'paused' | 'churned'
export type DealStatus = 'open' | 'won' | 'lost'
export type PipelineType = 'retention' | 'sales'
export type Channel = 'whatsapp' | 'email' | 'call' | 'meeting' | 'sms' | 'in_person' | 'other'
export type Direction = 'inbound' | 'outbound'
export type Sentiment = 'positive' | 'neutral' | 'negative'
export type ContactRole = 'decision_maker' | 'influencer' | 'champion' | 'end_user' | 'billing'
export type ScoringMethod = 'manual' | 'ai_suggested' | 'hybrid'
export type PlaybookCategory = 'onboarding' | 'review' | 'recovery' | 'expansion' | 'renewal' | 'custom'
export type ActionType = 'task' | 'message' | 'meeting' | 'review' | 'custom'
export type ProgressStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'
export type NotificationType = 'overdue_followup' | 'health_change' | 'renewal_approaching' | 'ai_alert' | 'team_mention' | 'deal_won' | 'deal_lost' | 'system'
export type TicketCategory = 'billing' | 'technical' | 'feature_request' | 'general'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high'
export type DeliveryChannel = 'in_app' | 'email' | 'whatsapp'
export type WAMessageType = 'text' | 'template' | 'image' | 'document' | 'audio' | 'video'
export type WAMessageStatus = 'sent' | 'delivered' | 'read' | 'failed'

export interface Organization {
  id: string
  name: string
  slug: string
  industry?: string
  country: string
  currency: string
  plan_tier: PlanTier
  subscription_status: SubscriptionStatus
  max_users: number
  max_accounts: number
  logo_url?: string
  website?: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  org_id: string
  auth_id?: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  phone_number?: string
  whatsapp_number?: string
  is_active: boolean
  last_login_at?: string
  notification_preferences: {
    in_app: boolean
    email: boolean
    whatsapp_critical: boolean
  }
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  org_id: string
  name: string
  industry?: string
  website?: string
  annual_revenue?: number
  contract_value_monthly?: number
  contract_value_annual?: number
  currency: string
  contract_start_date?: string
  contract_end_date?: string
  renewal_date?: string
  assigned_user_id?: string
  pipeline_id?: string
  stage_id?: string
  health_score_know: number
  health_score_engage: number
  health_score_exceed: number
  health_score_prevent: number
  health_score_total: number
  health_status: HealthStatus
  churn_risk_percentage?: number
  status: AccountStatus
  tags: string[]
  notes?: string
  last_interaction_at?: string
  created_at: string
  updated_at: string
  // Joined fields
  assigned_user?: Pick<User, 'id' | 'full_name' | 'avatar_url'>
  stage?: Pick<PipelineStage, 'id' | 'name' | 'color'>
  contacts_count?: number
  interactions_count?: number
}

export interface Deal {
  id: string
  org_id: string
  name: string
  value?: number
  currency: string
  pipeline_id?: string
  stage_id?: string
  assigned_user_id?: string
  contact_id?: string
  account_id?: string
  probability: number
  expected_close_date?: string
  actual_close_date?: string
  status: DealStatus
  loss_reason?: string
  notes?: string
  created_at: string
  updated_at: string
  // Joined fields
  assigned_user?: Pick<User, 'id' | 'full_name' | 'avatar_url'>
  contact?: Pick<Contact, 'id' | 'full_name'>
  stage?: Pick<PipelineStage, 'id' | 'name' | 'color'>
}

export interface Contact {
  id: string
  account_id?: string
  org_id: string
  full_name: string
  email?: string
  phone_number?: string
  whatsapp_number?: string
  job_title?: string
  role_type: ContactRole
  is_primary: boolean
  last_contacted_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Interaction {
  id: string
  account_id: string
  contact_id?: string
  org_id: string
  user_id?: string
  channel: Channel
  direction: Direction
  subject?: string
  content?: string
  whatsapp_message_id?: string
  sentiment?: Sentiment
  follow_up_required: boolean
  follow_up_date?: string
  follow_up_notes?: string
  created_at: string
  // Joined fields
  user?: Pick<User, 'id' | 'full_name'>
  contact?: Pick<Contact, 'id' | 'full_name'>
}

export interface Pipeline {
  id: string
  org_id: string
  name: string
  description?: string
  pipeline_type: PipelineType
  is_default: boolean
  sort_order: number
  created_at: string
  updated_at: string
  stages?: PipelineStage[]
}

export interface PipelineStage {
  id: string
  pipeline_id: string
  org_id: string
  name: string
  description?: string
  sort_order: number
  color: string
  auto_actions: Record<string, any>[]
  is_default: boolean
  created_at: string
  updated_at: string
  // Computed
  accounts_count?: number
  deals_count?: number
}

export interface HealthScoreHistory {
  id: string
  account_id: string
  org_id: string
  scored_by_user_id?: string
  score_know: number
  score_engage: number
  score_exceed: number
  score_prevent: number
  score_total: number
  scoring_method: ScoringMethod
  notes?: string
  scored_at: string
}

export interface Playbook {
  id: string
  org_id?: string
  name: string
  description?: string
  category: PlaybookCategory
  is_system_default: boolean
  is_active: boolean
  created_by_user_id?: string
  created_at: string
  updated_at: string
  steps?: PlaybookStep[]
}

export interface PlaybookStep {
  id: string
  playbook_id: string
  step_number: number
  title: string
  description?: string
  action_type: ActionType
  suggested_timeline_days?: number
  message_template?: string
  is_required: boolean
  created_at: string
}

export interface PlaybookAssignment {
  id: string
  playbook_id: string
  account_id: string
  org_id: string
  assigned_by_user_id?: string
  status: 'in_progress' | 'completed' | 'abandoned'
  started_at: string
  completed_at?: string
  created_at: string
  playbook?: Playbook
  progress?: PlaybookStepProgress[]
}

export interface PlaybookStepProgress {
  id: string
  assignment_id: string
  step_id: string
  status: ProgressStatus
  completed_by_user_id?: string
  completed_at?: string
  notes?: string
  step?: PlaybookStep
}

export interface Notification {
  id: string
  org_id: string
  user_id: string
  type: NotificationType
  title: string
  message?: string
  reference_type?: string
  reference_id?: string
  is_read: boolean
  read_at?: string
  delivery_channel: DeliveryChannel
  sent_at: string
  created_at: string
}

export interface SupportTicket {
  id: string
  org_id: string
  user_id: string
  category: TicketCategory
  subject: string
  description?: string
  status: TicketStatus
  priority: TicketPriority
  response_sla_hours: number
  first_response_at?: string
  resolved_at?: string
  created_at: string
  updated_at: string
  messages?: TicketMessage[]
}

export interface TicketMessage {
  id: string
  ticket_id: string
  sender_type: 'user' | 'support_agent'
  sender_id?: string
  content: string
  created_at: string
}

export interface WhatsAppConfig {
  id: string
  org_id: string
  business_account_id?: string
  phone_number_id?: string
  display_phone_number?: string
  is_verified: boolean
  is_active: boolean
  monthly_message_count: number
  monthly_message_limit: number
  last_reset_at: string
  created_at: string
  updated_at: string
}

export interface WhatsAppMessage {
  id: string
  org_id: string
  interaction_id?: string
  contact_id?: string
  whatsapp_message_id?: string
  direction: Direction
  message_type: WAMessageType
  content?: string
  template_name?: string
  status: WAMessageStatus
  error_message?: string
  sent_at: string
  delivered_at?: string
  read_at?: string
}

// ============================================
// Dashboard & reporting types
// ============================================

export interface DashboardMetrics {
  total_accounts: number
  accounts_change: number
  avg_health_score: number
  health_score_change: number
  revenue_at_risk: number
  critical_accounts: number
  upcoming_renewals: number
  renewal_value: number
  total_pipeline_value: number
  deals_open: number
}

export interface AccountHealthDistribution {
  healthy: number
  at_risk: number
  critical: number
}

export interface RevenueAtRiskReport {
  total_at_risk: number
  accounts: Pick<Account, 'id' | 'name' | 'health_score_total' | 'health_status' | 'contract_value_annual' | 'renewal_date' | 'last_interaction_at'>[]
}

// ============================================
// Plan tier limits
// ============================================

export const PLAN_LIMITS: Record<PlanTier, {
  max_users: number
  max_accounts: number
  wa_messages_per_user: number
  max_retention_pipelines: number
  max_sales_pipelines: number
  max_sequences: number
  max_enrollments_per_sequence: number
  max_snippets: number
  email_tracking: boolean
  playbooks_access: 'limited' | 'all' | 'custom'
  ai_features: boolean
  whatsapp_integration: boolean
  reporting: 'basic' | 'standard' | 'advanced'
  support: 'kb_only' | 'email_24h' | 'email_8h' | 'dedicated'
  stakeholder_mapping: boolean
  client_portal: boolean
  api_access: boolean
  data_export: boolean
}> = {
  starter: {
    max_users: 1, max_accounts: 15, wa_messages_per_user: 0,
    max_retention_pipelines: 1, max_sales_pipelines: 1,
    max_sequences: 2, max_enrollments_per_sequence: 25, max_snippets: 10, email_tracking: false,
    playbooks_access: 'limited', ai_features: false, whatsapp_integration: false,
    reporting: 'basic', support: 'kb_only', stakeholder_mapping: false,
    client_portal: false, api_access: false, data_export: false,
  },
  growth: {
    max_users: 10, max_accounts: 500, wa_messages_per_user: 1000,
    max_retention_pipelines: 3, max_sales_pipelines: 2,
    max_sequences: 10, max_enrollments_per_sequence: 200, max_snippets: 50, email_tracking: true,
    playbooks_access: 'all', ai_features: true, whatsapp_integration: true,
    reporting: 'standard', support: 'email_24h', stakeholder_mapping: false,
    client_portal: false, api_access: false, data_export: true,
  },
  scale: {
    max_users: 50, max_accounts: 99999, wa_messages_per_user: 99999,
    max_retention_pipelines: 99, max_sales_pipelines: 99,
    max_sequences: 99999, max_enrollments_per_sequence: 99999, max_snippets: 99999, email_tracking: true,
    playbooks_access: 'custom', ai_features: true, whatsapp_integration: true,
    reporting: 'advanced', support: 'email_8h', stakeholder_mapping: true,
    client_portal: true, api_access: true, data_export: true,
  },
  enterprise: {
    max_users: 99999, max_accounts: 99999, wa_messages_per_user: 99999,
    max_retention_pipelines: 99, max_sales_pipelines: 99,
    max_sequences: 99999, max_enrollments_per_sequence: 99999, max_snippets: 99999, email_tracking: true,
    playbooks_access: 'custom', ai_features: true, whatsapp_integration: true,
    reporting: 'advanced', support: 'dedicated', stakeholder_mapping: true,
    client_portal: true, api_access: true, data_export: true,
  },
  beta: {
    max_users: 20, max_accounts: 99999, wa_messages_per_user: 5000,
    max_retention_pipelines: 5, max_sales_pipelines: 3,
    max_sequences: 99999, max_enrollments_per_sequence: 99999, max_snippets: 99999, email_tracking: true,
    playbooks_access: 'custom', ai_features: true, whatsapp_integration: true,
    reporting: 'advanced', support: 'email_24h', stakeholder_mapping: true,
    client_portal: true, api_access: true, data_export: true,
  },
}
