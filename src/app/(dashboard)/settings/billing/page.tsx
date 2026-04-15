// src/app/(dashboard)/settings/billing/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Organization } from '@/lib/types'
import { PLAN_LIMITS } from '@/lib/types'

export default function BillingPage() {
  const [org, setOrg] = useState<Organization | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [processing, setProcessing] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('users').select('org_id').eq('auth_id', user.id).single()
      if (!profile) return
      const { data: orgData } = await supabase
        .from('organizations').select('*').eq('id', profile.org_id).single()
      setOrg(orgData)
      setLoading(false)
    }
    load()
  }, [])

  async function handleUpgrade(planTier: string) {
    setProcessing(planTier)
    const res = await fetch('/api/billing/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planTier, billingCycle }),
    })

    if (res.ok) {
      const data = await res.json()
      // Redirect to Paystack checkout
      window.location.href = data.authorization_url
    } else {
      const err = await res.json()
      alert(err.error || 'Payment initialization failed')
    }
    setProcessing(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div>
      </div>
    )
  }

  const plans = [
    {
      tier: 'starter',
      name: 'Starter',
      monthly: 'Free',
      annual: 'Free',
      desc: 'For individuals getting started',
      features: ['1 user', '15 accounts', 'KEEP health scoring', '2 playbooks', 'Basic reporting'],
    },
    {
      tier: 'growth',
      name: 'Growth',
      monthly: '₦20,000',
      annual: '₦16,000',
      desc: 'For teams managing client accounts',
      features: ['Up to 10 users', '500 accounts', 'WhatsApp integration', 'AI automation', 'All 5 playbooks', '24hr email support', 'Data export'],
      popular: true,
    },
    {
      tier: 'scale',
      name: 'Scale',
      monthly: '₦45,000',
      annual: '₦36,000',
      desc: 'For growing organizations',
      features: ['Up to 50 users', 'Unlimited accounts', 'WhatsApp broadcasts', 'Churn prediction', 'Custom playbooks', '8hr support', 'Stakeholder mapping', 'API access'],
    },
    {
      tier: 'enterprise',
      name: 'Enterprise',
      monthly: 'Custom',
      annual: 'Custom',
      desc: 'For large organizations',
      features: ['Unlimited everything', 'Dedicated AM', 'Custom integrations', 'SSO', 'White-label option', '4hr SLA'],
    },
  ]

  const currentTierIndex = ['starter', 'growth', 'scale', 'enterprise', 'beta'].indexOf(org?.plan_tier || 'starter')
  const isBeta = org?.plan_tier === 'beta'

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-medium text-gray-900 mb-1">Billing</h1>
      <p className="text-sm text-gray-500 mb-6">Manage your subscription and plan.</p>

      {/* Current plan */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 mb-1">Current plan</div>
            <div className="text-lg font-medium capitalize" style={{ color: '#5a1890' }}>
              {org?.plan_tier}
              {isBeta && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Full access during beta</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Status</div>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              org?.subscription_status === 'active' || org?.subscription_status === 'beta'
                ? 'bg-green-100 text-green-700'
                : org?.subscription_status === 'past_due'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {org?.subscription_status === 'beta' ? 'Beta (all features)' : org?.subscription_status}
            </span>
          </div>
        </div>

        {isBeta && (
          <div className="mt-4 p-3 bg-purple-50 rounded-lg text-sm text-purple-800">
            You're on the beta plan with full access to all features. When beta ends, you'll choose a paid plan or continue on Starter (free). We'll give you 30 days' notice.
          </div>
        )}
      </div>

      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center gap-1 mb-6">
        <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${billingCycle === 'monthly' ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500'}`}>
            Monthly
          </button>
          <button onClick={() => setBillingCycle('annual')}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${billingCycle === 'annual' ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500'}`}>
            Annual <span className="text-xs text-green-600">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map(plan => {
          const planIndex = ['starter', 'growth', 'scale', 'enterprise'].indexOf(plan.tier)
          const isCurrent = org?.plan_tier === plan.tier
          const isDowngrade = !isBeta && planIndex < currentTierIndex
          const price = billingCycle === 'monthly' ? plan.monthly : plan.annual

          return (
            <div key={plan.tier}
              className={`bg-white rounded-xl p-5 ${
                plan.popular ? 'ring-2 ring-purple-700 relative' : 'border border-gray-200'
              }`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ background: '#2b0548' }}>Most popular</div>
              )}
              <h3 className="text-sm font-medium text-gray-900">{plan.name}</h3>
              <p className="text-xs text-gray-500 mb-3">{plan.desc}</p>
              <div className="mb-4">
                <span className="text-xl font-medium text-gray-900">{price}</span>
                {price !== 'Free' && price !== 'Custom' && (
                  <span className="text-xs text-gray-400">/user/mo</span>
                )}
              </div>

              {isCurrent || (isBeta && plan.tier !== 'enterprise') ? (
                <div className="py-2 text-center text-xs font-medium text-gray-400 border border-gray-200 rounded-lg mb-4">
                  {isCurrent ? 'Current plan' : 'Included in beta'}
                </div>
              ) : plan.tier === 'enterprise' ? (
                <a href="mailto:sarah@trailblazeafrica.com"
                  className="block py-2 text-center text-xs font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 mb-4">
                  Contact sales
                </a>
              ) : plan.tier === 'starter' ? (
                <div className="py-2 text-center text-xs font-medium text-gray-400 border border-gray-200 rounded-lg mb-4">
                  Free forever
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.tier)}
                  disabled={!!processing}
                  className="w-full py-2 rounded-lg text-xs font-medium disabled:opacity-50 mb-4"
                  style={{ background: '#2b0548', color: '#e1b3ee' }}>
                  {processing === plan.tier ? 'Processing...' : isDowngrade ? 'Downgrade' : 'Upgrade'}
                </button>
              )}

              <ul className="space-y-1.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <span className="text-green-600 mt-0.5 flex-shrink-0">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        No annual lock-in. Ever. Cancel or change plans anytime.
        Payments processed securely by Paystack.
      </p>
    </div>
  )
}
