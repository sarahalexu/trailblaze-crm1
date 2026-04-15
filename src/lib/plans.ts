// src/lib/plans.ts
// TrailBlaze CRM — Plan enforcement and feature gating

import { PLAN_LIMITS, type PlanTier } from './types'

export type Feature =
  | 'whatsapp_integration'
  | 'ai_features'
  | 'custom_playbooks'
  | 'all_playbooks'
  | 'advanced_reporting'
  | 'stakeholder_mapping'
  | 'client_portal'
  | 'api_access'
  | 'data_export'
  | 'whatsapp_notifications'
  | 'churn_prediction'
  | 'whatsapp_broadcast'
  | 'team_analytics'
  | 'custom_report_builder'

// Check if a feature is available on a given plan
export function hasFeature(planTier: PlanTier, feature: Feature): boolean {
  const limits = PLAN_LIMITS[planTier]
  if (!limits) return false

  switch (feature) {
    case 'whatsapp_integration': return limits.whatsapp_integration
    case 'ai_features': return limits.ai_features
    case 'custom_playbooks': return limits.playbooks_access === 'custom'
    case 'all_playbooks': return limits.playbooks_access !== 'limited'
    case 'advanced_reporting': return limits.reporting === 'advanced'
    case 'stakeholder_mapping': return limits.stakeholder_mapping
    case 'client_portal': return limits.client_portal
    case 'api_access': return limits.api_access
    case 'data_export': return limits.data_export
    case 'whatsapp_notifications': return planTier === 'scale' || planTier === 'enterprise' || planTier === 'beta'
    case 'churn_prediction': return planTier === 'scale' || planTier === 'enterprise' || planTier === 'beta'
    case 'whatsapp_broadcast': return planTier === 'scale' || planTier === 'enterprise' || planTier === 'beta'
    case 'team_analytics': return planTier === 'scale' || planTier === 'enterprise' || planTier === 'beta'
    case 'custom_report_builder': return planTier === 'scale' || planTier === 'enterprise' || planTier === 'beta'
    default: return false
  }
}

// Check resource limits
export function checkLimit(planTier: PlanTier, resource: 'users' | 'accounts' | 'retention_pipelines' | 'sales_pipelines', currentCount: number): {
  allowed: boolean
  limit: number
  current: number
  message?: string
} {
  const limits = PLAN_LIMITS[planTier]
  if (!limits) return { allowed: false, limit: 0, current: currentCount, message: 'Invalid plan' }

  let limit: number
  switch (resource) {
    case 'users': limit = limits.max_users; break
    case 'accounts': limit = limits.max_accounts; break
    case 'retention_pipelines': limit = limits.max_retention_pipelines; break
    case 'sales_pipelines': limit = limits.max_sales_pipelines; break
    default: return { allowed: true, limit: 99999, current: currentCount }
  }

  if (currentCount >= limit) {
    const resourceLabels: Record<string, string> = {
      users: 'team members',
      accounts: 'accounts',
      retention_pipelines: 'retention pipelines',
      sales_pipelines: 'sales pipelines',
    }
    return {
      allowed: false,
      limit,
      current: currentCount,
      message: `You've reached the ${resourceLabels[resource]} limit on your ${planTier} plan (${limit}). Upgrade to add more.`,
    }
  }

  return { allowed: true, limit, current: currentCount }
}

// Get upgrade CTA message based on what feature was blocked
export function getUpgradeMessage(feature: Feature): {
  title: string
  description: string
  requiredPlan: string
} {
  const messages: Record<Feature, { title: string; description: string; requiredPlan: string }> = {
    whatsapp_integration: {
      title: 'WhatsApp integration',
      description: 'Send and receive WhatsApp messages directly from TrailBlaze CRM. Follow up where your clients actually are.',
      requiredPlan: 'Growth',
    },
    ai_features: {
      title: 'AI-powered automation',
      description: 'Get risk alerts, AI-drafted follow-ups, and next-best-action suggestions powered by AI.',
      requiredPlan: 'Growth',
    },
    custom_playbooks: {
      title: 'Custom playbooks',
      description: 'Create your own account management workflows in addition to the 5 built-in playbooks.',
      requiredPlan: 'Scale',
    },
    all_playbooks: {
      title: 'All playbooks',
      description: 'Access all 5 built-in account management playbooks — onboarding, review, recovery, expansion, and renewal.',
      requiredPlan: 'Growth',
    },
    advanced_reporting: {
      title: 'Advanced reporting',
      description: 'Team performance analytics, custom report builder, and scheduled report delivery.',
      requiredPlan: 'Scale',
    },
    stakeholder_mapping: {
      title: 'Stakeholder mapping',
      description: 'Visual relationship maps showing decision-makers, influencers, and champions within each account.',
      requiredPlan: 'Scale',
    },
    client_portal: {
      title: 'Client-facing portal',
      description: 'Give your clients read-only access to see their account status and upcoming touchpoints.',
      requiredPlan: 'Scale',
    },
    api_access: {
      title: 'API access',
      description: 'Connect TrailBlaze CRM with your other tools via our REST API.',
      requiredPlan: 'Scale',
    },
    data_export: {
      title: 'Data export',
      description: 'Export all your data as CSV or JSON at any time. Your data is always yours.',
      requiredPlan: 'Growth',
    },
    whatsapp_notifications: {
      title: 'WhatsApp notifications',
      description: 'Get critical account alerts delivered to your WhatsApp.',
      requiredPlan: 'Scale',
    },
    churn_prediction: {
      title: 'Churn prediction',
      description: 'AI assigns a churn probability percentage to each account based on patterns.',
      requiredPlan: 'Scale',
    },
    whatsapp_broadcast: {
      title: 'WhatsApp broadcasts',
      description: 'Send renewal notices and account updates to multiple contacts at once.',
      requiredPlan: 'Scale',
    },
    team_analytics: {
      title: 'Team performance analytics',
      description: 'Account manager scorecards, portfolio health comparisons, and activity benchmarks.',
      requiredPlan: 'Scale',
    },
    custom_report_builder: {
      title: 'Custom report builder',
      description: 'Build your own reports and schedule automatic delivery to leadership.',
      requiredPlan: 'Scale',
    },
  }

  return messages[feature] || { title: 'Premium feature', description: 'Upgrade to access this feature.', requiredPlan: 'Growth' }
}

// Playbook access — Starter gets 2, Growth+ gets all
export function getAccessiblePlaybookCategories(planTier: PlanTier): string[] {
  if (planTier === 'starter') {
    return ['onboarding', 'renewal'] // 2 of 5
  }
  return ['onboarding', 'review', 'recovery', 'expansion', 'renewal'] // all 5
}
