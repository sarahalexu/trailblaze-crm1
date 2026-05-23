// src/hooks/usePlanLimits.tsx
// Updated: Added Scale + Enterprise feature gates, dynamic plan targeting

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Limits {
  plan: string
  max_accounts: number
  max_sequences: number
  max_active_contacts: number
  max_emails_per_day: number
  max_snippets: number
  email_tracking: boolean
  ai_features: boolean
  whatsapp_integration: boolean
  current_accounts: number
  current_sequences: number
  current_active_contacts: number
  current_snippets: number
}

// Which plan unlocks each feature
const FEATURE_PLANS: Record<string, { plan: string; label: string; price: string; features: string[] }> = {
  use_ai: { plan: 'Growth', label: 'Growth', price: '₦20,000', features: ['AI risk analysis & draft messages', 'Email open tracking', 'WhatsApp sequences', '500 accounts, 10 sequences'] },
  email_tracking: { plan: 'Growth', label: 'Growth', price: '₦20,000', features: ['Email open tracking', 'AI features', 'WhatsApp sequences', '500 accounts'] },
  whatsapp_sequence: { plan: 'Growth', label: 'Growth', price: '₦20,000', features: ['WhatsApp sequences', 'AI features', 'Email tracking', '500 accounts'] },
  custom_playbook: { plan: 'Scale', label: 'Scale', price: '₦50,000', features: ['Custom playbook builder', 'Custom pipelines', 'WhatsApp broadcasts', 'Stakeholder mapping', 'Client portal', 'API access'] },
  custom_pipeline: { plan: 'Scale', label: 'Scale', price: '₦50,000', features: ['Custom pipeline builder', 'Custom playbooks', 'WhatsApp broadcasts', 'Stakeholder mapping', 'Client portal', 'API access'] },
  broadcasts: { plan: 'Scale', label: 'Scale', price: '₦50,000', features: ['WhatsApp broadcasts', 'Custom playbooks & pipelines', 'Stakeholder mapping', 'Client portal', 'API access'] },
  stakeholder_map: { plan: 'Scale', label: 'Scale', price: '₦50,000', features: ['Stakeholder mapping', 'Custom playbooks & pipelines', 'WhatsApp broadcasts', 'Client portal'] },
  client_portal: { plan: 'Scale', label: 'Scale', price: '₦50,000', features: ['Client-facing portal', 'Custom playbooks & pipelines', 'WhatsApp broadcasts', 'Stakeholder mapping'] },
  api_access: { plan: 'Scale', label: 'Scale', price: '₦50,000', features: ['REST API access', 'Custom playbooks & pipelines', 'WhatsApp broadcasts', 'Client portal'] },
  advanced_analytics: { plan: 'Scale', label: 'Scale', price: '₦50,000', features: ['Advanced analytics', 'Conversion tracking', 'Custom playbooks & pipelines', 'API access'] },
  sso: { plan: 'Enterprise', label: 'Enterprise', price: 'Custom', features: ['SAML/OIDC single sign-on', 'White-label branding', 'Custom domain', 'Dedicated support', 'Everything in Scale'] },
  white_label: { plan: 'Enterprise', label: 'Enterprise', price: 'Custom', features: ['White-label branding', 'Custom domain', 'Custom email sender', 'SAML/OIDC SSO', 'Everything in Scale'] },
}

const PLAN_HIERARCHY = ['starter', 'growth', 'scale', 'enterprise', 'beta']

function planAtLeast(current: string, required: string): boolean {
  return PLAN_HIERARCHY.indexOf(current) >= PLAN_HIERARCHY.indexOf(required)
}

export function usePlanLimits() {
  const [limits, setLimits] = useState<Limits | null>(null)
  const [upgradeMessage, setUpgradeMessage] = useState('')
  const [upgradeFeatures, setUpgradeFeatures] = useState<string[]>([])
  const [upgradePlan, setUpgradePlan] = useState({ label: 'Growth', price: '₦20,000' })
  const [showUpgrade, setShowUpgrade] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadLimits() }, [])

  async function loadLimits() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('users').select('org_id').eq('auth_id', user.id).single()
    if (!profile) return

    const { data: org } = await supabase.from('organizations').select('plan_tier').eq('id', profile.org_id).single()
    if (!org) return

    const plan = org.plan_tier
    const isBeta = plan === 'beta'
    const isScale = plan === 'scale' || plan === 'enterprise'
    const isGrowth = plan === 'growth'

    const { count: accountCount } = await supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id)
    const { count: seqCount } = await supabase.from('sequences').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id)
    const { count: contactCount } = await supabase.from('sequence_enrollments').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id).eq('status', 'active')
    const { count: snippetCount } = await supabase.from('snippets').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id)

    setLimits({
      plan,
      max_accounts: isBeta || isScale ? 99999 : isGrowth ? 500 : 15,
      max_sequences: isBeta || isScale ? 99999 : isGrowth ? 10 : 1,
      max_active_contacts: isBeta || isScale ? 99999 : isGrowth ? 200 : 25,
      max_emails_per_day: isBeta ? 1000 : isScale ? 1000 : isGrowth ? 200 : 25,
      max_snippets: isBeta || isScale ? 99999 : isGrowth ? 50 : 10,
      email_tracking: isBeta || isGrowth || isScale,
      ai_features: isBeta || isGrowth || isScale,
      whatsapp_integration: isBeta || isGrowth || isScale,
      current_accounts: accountCount || 0,
      current_sequences: seqCount || 0,
      current_active_contacts: contactCount || 0,
      current_snippets: snippetCount || 0,
    })
  }

  function triggerUpgrade(action: string, message: string) {
    const featureInfo = FEATURE_PLANS[action]
    setUpgradeMessage(message)
    setUpgradeFeatures(featureInfo?.features || [])
    setUpgradePlan({ label: featureInfo?.label || 'Growth', price: featureInfo?.price || '₦20,000' })
    setShowUpgrade(true)
  }

  const check = useCallback((action: string): boolean => {
    if (!limits) return true
    if (limits.plan === 'beta') return true

    const plan = limits.plan

    // Quantity-based limits
    switch (action) {
      case 'create_account':
        if (limits.current_accounts >= limits.max_accounts) {
          triggerUpgrade(action, `You have reached the ${limits.max_accounts}-account limit on your current plan. Upgrade to add more accounts.`)
          return false
        }
        return true

      case 'create_sequence':
        if (limits.current_sequences >= limits.max_sequences) {
          triggerUpgrade(action, `You can only have ${limits.max_sequences} sequence${limits.max_sequences === 1 ? '' : 's'} on your current plan. Upgrade to create more.`)
          return false
        }
        return true

      case 'enroll_contact':
        if (limits.current_active_contacts >= limits.max_active_contacts) {
          triggerUpgrade(action, `You have reached ${limits.max_active_contacts} active contacts in sequences. Upgrade to enroll more.`)
          return false
        }
        return true

      case 'create_snippet':
        if (limits.current_snippets >= limits.max_snippets) {
          triggerUpgrade(action, `You have reached the ${limits.max_snippets}-snippet limit. Upgrade for more snippets.`)
          return false
        }
        return true
    }

    // Feature-based limits (Growth plan)
    if (action === 'use_ai' && !limits.ai_features) {
      triggerUpgrade(action, 'AI features like risk analysis, draft messages, and suggested actions are available on the Growth plan.')
      return false
    }
    if (action === 'email_tracking' && !limits.email_tracking) {
      triggerUpgrade(action, 'Email open tracking lets you see who reads your emails and how many times. Available on the Growth plan.')
      return false
    }
    if (action === 'whatsapp_sequence' && !limits.whatsapp_integration) {
      triggerUpgrade(action, 'WhatsApp sequences let you automate follow-ups through WhatsApp. Available on the Growth plan.')
      return false
    }

    // Scale plan features
    const scaleFeatures = ['custom_playbook', 'custom_pipeline', 'broadcasts', 'stakeholder_map', 'client_portal', 'api_access', 'advanced_analytics']
    if (scaleFeatures.includes(action) && !planAtLeast(plan, 'scale')) {
      const labels: Record<string, string> = {
        custom_playbook: 'Custom playbooks let you create your own guided workflows with custom steps.',
        custom_pipeline: 'Custom pipelines let you build pipeline views beyond retention and sales for any workflow.',
        broadcasts: 'WhatsApp broadcasts let you send one message to multiple contacts at once.',
        stakeholder_map: 'Stakeholder mapping gives you a visual relationship map for every account.',
        client_portal: 'The client portal lets your customers view their own account status and share feedback.',
        api_access: 'REST API access lets you integrate TrailBlaze CRM with Zapier, custom dashboards, and other tools.',
        advanced_analytics: 'Advanced analytics gives you conversion tracking, pipeline metrics, and deeper reporting.',
      }
      triggerUpgrade(action, labels[action] + ' Available on the Scale plan.')
      return false
    }

    // Enterprise features
    const enterpriseFeatures = ['sso', 'white_label']
    if (enterpriseFeatures.includes(action) && !planAtLeast(plan, 'enterprise')) {
      const labels: Record<string, string> = {
        sso: 'SAML and OIDC single sign-on lets your team log in with your company identity provider.',
        white_label: 'White-label branding lets you customize the CRM with your own logo, colors, domain, and email sender.',
      }
      triggerUpgrade(action, labels[action] + ' Available on the Enterprise plan.')
      return false
    }

    return true
  }, [limits])

  function UpgradeModal() {
    if (!showUpgrade) return null
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.15s ease' }}
        onClick={() => setShowUpgrade(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
          onClick={e => e.stopPropagation()} style={{ animation: 'slideUp 0.2s ease' }}>
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #5a1890, #00adef, #c9a54e)' }} />
          <div className="p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'rgba(90,24,144,0.08)' }}>
                <span className="text-xl">{'\u{1F680}'}</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Upgrade to {upgradePlan.label}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{upgradeMessage}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900">{upgradePlan.label} plan</span>
                {upgradePlan.price !== 'Custom' ? (
                  <span className="text-sm font-semibold" style={{ color: '#5a1890' }}>{upgradePlan.price}<span className="text-xs text-gray-400 font-normal">/user/mo</span></span>
                ) : (
                  <span className="text-sm font-semibold" style={{ color: '#5a1890' }}>Custom pricing</span>
                )}
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                {upgradeFeatures.map((f, i) => (
                  <div key={i}>{'\u2713'} {f}</div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowUpgrade(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Maybe later
              </button>
              {upgradePlan.price !== 'Custom' ? (
                <Link href="/settings/billing" onClick={() => setShowUpgrade(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-center"
                  style={{ background: '#2b0548', color: '#e1b3ee' }}>
                  View plans
                </Link>
              ) : (
                <a href="mailto:support@trailblazeafrica.com?subject=Enterprise Plan Inquiry" onClick={() => setShowUpgrade(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-center"
                  style={{ background: '#2b0548', color: '#e1b3ee' }}>
                  Contact us
                </a>
              )}
            </div>

            <div className="text-center mt-3">
              <p className="text-[10px] text-gray-400">Have an access code? Enter it in Settings {'\u2192'} Billing</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return { check, limits, showUpgrade, UpgradeModal, refresh: loadLimits }
}
