// src/lib/super-admin.ts
// Platform owner (Sarah) super admin access
// This gives you full backend access to all organizations, users, and analytics

// Super admin email(s) — only these can access /admin routes
export const SUPER_ADMIN_EMAILS = [
  'sarah@trailblazeafrica.com',
  // Add backup admin emails here if needed
]

export function isSuperAdmin(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase())
}

// Data queries for super admin dashboard
export const superAdminQueries = {
  // Total platform metrics
  platformMetrics: `
    SELECT
      (SELECT COUNT(*) FROM organizations) as total_orgs,
      (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
      (SELECT COUNT(*) FROM accounts) as total_accounts,
      (SELECT COUNT(*) FROM deals) as total_deals,
      (SELECT COUNT(*) FROM interactions) as total_interactions,
      (SELECT COUNT(*) FROM organizations WHERE plan_tier = 'starter') as starter_orgs,
      (SELECT COUNT(*) FROM organizations WHERE plan_tier = 'growth') as growth_orgs,
      (SELECT COUNT(*) FROM organizations WHERE plan_tier = 'scale') as scale_orgs,
      (SELECT COUNT(*) FROM organizations WHERE plan_tier = 'enterprise') as enterprise_orgs,
      (SELECT COUNT(*) FROM organizations WHERE plan_tier = 'beta') as beta_orgs
  `,

  // Revenue metrics
  revenueMetrics: `
    SELECT
      plan_tier,
      COUNT(*) as org_count,
      SUM(max_users) as total_seats
    FROM organizations
    WHERE subscription_status IN ('active', 'beta')
    GROUP BY plan_tier
    ORDER BY org_count DESC
  `,

  // Recent signups
  recentSignups: `
    SELECT o.id, o.name, o.plan_tier, o.created_at, u.full_name, u.email
    FROM organizations o
    JOIN users u ON u.org_id = o.id AND u.role = 'admin'
    ORDER BY o.created_at DESC
    LIMIT 50
  `,

  // Most active organizations
  mostActive: `
    SELECT o.id, o.name, o.plan_tier,
      (SELECT COUNT(*) FROM interactions i WHERE i.org_id = o.id) as interaction_count,
      (SELECT COUNT(*) FROM accounts a WHERE a.org_id = o.id) as account_count,
      (SELECT MAX(i.created_at) FROM interactions i WHERE i.org_id = o.id) as last_activity
    FROM organizations o
    ORDER BY interaction_count DESC
    LIMIT 20
  `,

  // WhatsApp usage
  whatsappUsage: `
    SELECT o.name, wc.monthly_message_count, wc.monthly_message_limit, wc.is_active
    FROM whatsapp_config wc
    JOIN organizations o ON o.id = wc.org_id
    WHERE wc.is_active = true
    ORDER BY wc.monthly_message_count DESC
  `,

  // Support ticket overview
  supportOverview: `
    SELECT
      status,
      priority,
      COUNT(*) as ticket_count,
      AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600) as avg_response_hours
    FROM support_tickets
    GROUP BY status, priority
    ORDER BY status, priority
  `,
}
