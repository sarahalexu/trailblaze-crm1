// src/lib/plan-enforcement.ts
// Checks plan limits before allowing actions
// Called by API routes and UI components

import { PLAN_LIMITS, type PlanTier } from './types'

export interface PlanCheck {
  allowed: boolean
  message?: string
  limit?: number
  current?: number
  upgradeRequired?: string
}

// Sequence limits per plan
const SEQUENCE_LIMITS: Record<PlanTier, {
  max_sequences: number
  max_active_contacts: number
  max_emails_per_day: number
  max_enrollments_per_day: number
  stop_on_reply: boolean
  email_tracking: boolean
  advanced_analytics: boolean
}> = {
  starter: {
    max_sequences: 1,
    max_active_contacts: 25,
    max_emails_per_day: 25,
    max_enrollments_per_day: 10,
    stop_on_reply: false,
    email_tracking: false,
    advanced_analytics: false,
  },
  growth: {
    max_sequences: 10,
    max_active_contacts: 200,
    max_emails_per_day: 200,
    max_enrollments_per_day: 50,
    stop_on_reply: true,
    email_tracking: true,
    advanced_analytics: true,
  },
  scale: {
    max_sequences: 99999,
    max_active_contacts: 99999,
    max_emails_per_day: 1000,
    max_enrollments_per_day: 99999,
    stop_on_reply: true,
    email_tracking: true,
    advanced_analytics: true,
  },
  enterprise: {
    max_sequences: 99999,
    max_active_contacts: 99999,
    max_emails_per_day: 99999,
    max_enrollments_per_day: 99999,
    stop_on_reply: true,
    email_tracking: true,
    advanced_analytics: true,
  },
  beta: {
    max_sequences: 99999,
    max_active_contacts: 99999,
    max_emails_per_day: 1000,
    max_enrollments_per_day: 99999,
    stop_on_reply: true,
    email_tracking: true,
    advanced_analytics: true,
  },
}

export function getSequenceLimits(planTier: PlanTier) {
  return SEQUENCE_LIMITS[planTier] || SEQUENCE_LIMITS.starter
}

export function checkSequenceCreation(planTier: PlanTier, currentCount: number): PlanCheck {
  const limits = getSequenceLimits(planTier)
  if (currentCount >= limits.max_sequences) {
    return {
      allowed: false,
      message: `You've reached the sequence limit on your ${planTier} plan (${limits.max_sequences}). Upgrade to create more.`,
      limit: limits.max_sequences,
      current: currentCount,
      upgradeRequired: planTier === 'starter' ? 'Growth' : 'Scale',
    }
  }
  return { allowed: true }
}

export function checkEnrollment(planTier: PlanTier, activeContacts: number, newContacts: number): PlanCheck {
  const limits = getSequenceLimits(planTier)
  if (activeContacts + newContacts > limits.max_active_contacts) {
    return {
      allowed: false,
      message: `You can have up to ${limits.max_active_contacts} active contacts in sequences on your ${planTier} plan. You currently have ${activeContacts}. Upgrade for more.`,
      limit: limits.max_active_contacts,
      current: activeContacts,
      upgradeRequired: planTier === 'starter' ? 'Growth' : 'Scale',
    }
  }
  return { allowed: true }
}

export function checkDailyEmails(planTier: PlanTier, sentToday: number): PlanCheck {
  const limits = getSequenceLimits(planTier)
  if (sentToday >= limits.max_emails_per_day) {
    return {
      allowed: false,
      message: `Daily email limit reached (${limits.max_emails_per_day}/day on ${planTier}). Remaining emails will send tomorrow.`,
      limit: limits.max_emails_per_day,
      current: sentToday,
    }
  }
  return { allowed: true }
}

export function checkDailyEnrollments(planTier: PlanTier, enrolledToday: number): PlanCheck {
  const limits = getSequenceLimits(planTier)
  if (enrolledToday >= limits.max_enrollments_per_day) {
    return {
      allowed: false,
      message: `Daily enrollment limit reached (${limits.max_enrollments_per_day}/day). Try again tomorrow.`,
      limit: limits.max_enrollments_per_day,
      current: enrolledToday,
    }
  }
  return { allowed: true }
}

// Check account creation limits
export function checkAccountCreation(planTier: PlanTier, currentCount: number): PlanCheck {
  const limits = PLAN_LIMITS[planTier]
  if (currentCount >= limits.max_accounts) {
    return {
      allowed: false,
      message: `You've reached the account limit on your ${planTier} plan (${limits.max_accounts}). Upgrade to add more.`,
      limit: limits.max_accounts,
      current: currentCount,
      upgradeRequired: planTier === 'starter' ? 'Growth' : 'Scale',
    }
  }
  return { allowed: true }
}

// Check snippet creation limits
export function checkSnippetCreation(planTier: PlanTier, currentCount: number): PlanCheck {
  const limits = PLAN_LIMITS[planTier]
  if (currentCount >= limits.max_snippets) {
    return {
      allowed: false,
      message: `Snippet limit reached (${limits.max_snippets} on ${planTier}). Upgrade for more.`,
      limit: limits.max_snippets,
      current: currentCount,
      upgradeRequired: planTier === 'starter' ? 'Growth' : 'Scale',
    }
  }
  return { allowed: true }
}

// Summary for display in UI
export function getPlanSummary(planTier: PlanTier) {
  const seqLimits = getSequenceLimits(planTier)
  const planLimits = PLAN_LIMITS[planTier]
  return {
    plan: planTier,
    accounts: planLimits.max_accounts >= 99999 ? 'Unlimited' : planLimits.max_accounts,
    users: planLimits.max_users >= 99999 ? 'Unlimited' : planLimits.max_users,
    sequences: seqLimits.max_sequences >= 99999 ? 'Unlimited' : seqLimits.max_sequences,
    activeContacts: seqLimits.max_active_contacts >= 99999 ? 'Unlimited' : seqLimits.max_active_contacts,
    emailsPerDay: seqLimits.max_emails_per_day >= 99999 ? 'Unlimited' : seqLimits.max_emails_per_day,
    snippets: planLimits.max_snippets >= 99999 ? 'Unlimited' : planLimits.max_snippets,
    stopOnReply: seqLimits.stop_on_reply,
    emailTracking: seqLimits.email_tracking,
    advancedAnalytics: seqLimits.advanced_analytics,
    whatsapp: planLimits.whatsapp_integration,
    ai: planLimits.ai_features,
  }
}
