// src/app/(dashboard)/settings/billing/page.tsx
// REPLACE the existing billing page with this
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import AccessCodeEntry from '@/components/ui/AccessCodeEntry'

declare global { interface Window { PaystackPop: any } }

export default function BillingPage() {
  const [org, setOrg] = useState<any>(null)
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const supabase = createClient()

  useEffect(() => {
    // Load Paystack script
    if (!document.querySelector('script[src*="paystack"]')) {
      const s = document.createElement('script')
      s.src = 'https://js.paystack.co/v2/inline.js'
      document.head.appendChild(s)
    }
    loadBilling()
  }, [])

  async function loadBilling() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('org_id').eq('auth_id', user.id).single()
    if (!profile) return

    const { data: orgData } = await supabase.from('organizations').select('*').eq('id', profile.org_id).single()
    setOrg(orgData)

    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id)
    setUserCount(count || 1)
    setLoading(false)
  }

  async function startPayment(planTier: string) {
    if (!org) return
    setProcessingPlan(planTier)

    const pricePerUser = planTier === 'growth' ? 20000 : planTier === 'scale' ? 45000 : 100000
    const discount = billingCycle === 'annual' ? 0.8 : 1
    const totalMonthly = pricePerUser * userCount * discount
    const totalKobo = billingCycle === 'annual'
      ? Math.round(totalMonthly * 12 * 100) // Annual: charge full year
      : Math.round(totalMonthly * 100) // Monthly

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('email, full_name').eq('auth_id', user.id).single()

    try {
      const paystack = new window.PaystackPop()
      paystack.newTransaction({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
        email: profile?.email || user.email,
        amount: totalKobo,
        currency: 'NGN',
        ref: `TB-${planTier}-${org.id.slice(0, 8)}-${Date.now()}`,
        metadata: {
          org_id: org.id,
          plan_tier: planTier,
          billing_cycle: billingCycle,
          user_count: userCount,
          custom_fields: [
            { display_name: 'Organization', variable_name: 'org_name', value: org.name },
            { display_name: 'Plan', variable_name: 'plan', value: planTier },
          ],
        },
        onSuccess: async (transaction: any) => {
          // Upgrade plan immediately
          await supabase.from('organizations').update({
            plan_tier: planTier,
            subscription_status: 'active',
            previous_plan_tier: org.plan_tier,
          }).eq('id', org.id)

          // Create an audit log
          const { data: userProfile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
          if (userProfile) {
            await supabase.from('audit_log').insert({
              org_id: userProfile.org_id,
              user_id: userProfile.id,
              action: 'plan_upgrade',
              entity_type: 'organization',
              entity_id: org.id,
              details: { from: org.plan_tier, to: planTier, amount: totalKobo / 100, ref: transaction.reference },
            })
          }

          setProcessingPlan(null)
          window.location.reload()
        },
        onCancel: () => {
          setProcessingPlan(null)
        },
      })
    } catch (err) {
      console.error('Paystack error:', err)
      setProcessingPlan(null)
      alert('Payment initialization failed. Please try again.')
    }
  }

  function formatNaira(amount: number): string {
    return '₦' + amount.toLocaleString()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="tb-spinner" /></div>

  const plans = [
    {
      tier: 'starter', name: 'Free', price: 0, period: 'forever',
      features: ['1 user', '15 accounts', '1 sequence (25 contacts)', '25 emails/day', '2 playbooks', 'Basic reporting', 'KEEP scoring'],
      excluded: ['Email tracking', 'AI features', 'WhatsApp sequences', 'Data export', 'Team management'],
      cta: org?.plan_tier === 'starter' ? 'Current plan' : 'Downgrade',
    },
    {
      tier: 'growth', name: 'Growth', price: billingCycle === 'annual' ? 16000 : 20000, period: billingCycle === 'annual' ? '/user/mo (billed annually)' : '/user/mo',
      popular: true,
      features: ['10 users', '500 accounts', '10 sequences (200 contacts)', '200 emails/day', 'Email open tracking', 'AI risk analysis + draft messages', 'WhatsApp sequences', 'All 5 playbooks', '50 snippets', '24hr email support', 'Data export'],
      excluded: ['Custom playbooks', 'Stakeholder mapping', 'API access'],
      cta: org?.plan_tier === 'growth' ? 'Current plan' : 'Upgrade',
    },
    {
      tier: 'scale', name: 'Scale', price: billingCycle === 'annual' ? 36000 : 45000, period: billingCycle === 'annual' ? '/user/mo (billed annually)' : '/user/mo',
      features: ['50 users', 'Unlimited accounts', 'Unlimited sequences', '1,000 emails/day', 'Advanced analytics', 'WhatsApp broadcasts', 'Custom playbooks', 'Stakeholder mapping', 'Client portal', 'API access', '8hr email support'],
      excluded: [],
      cta: org?.plan_tier === 'scale' ? 'Current plan' : 'Upgrade',
    },
  ]

  const isActivePlan = (tier: string) => org?.plan_tier === tier || (org?.plan_tier === 'beta' && tier === 'starter')
  const canUpgrade = (tier: string) => {
    const order = ['starter', 'growth', 'scale', 'enterprise']
    const currentIdx = order.indexOf(org?.plan_tier === 'beta' ? 'scale' : org?.plan_tier || 'starter')
    return order.indexOf(tier) > currentIdx
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your subscription and plan.</p>
      </div>

      {/* Current plan info */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-medium text-gray-900">Current plan</h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium capitalize" style={{ background: 'rgba(90,24,144,0.08)', color: '#5a1890' }}>
                {org?.plan_tier === 'beta' ? 'Beta (all features)' : org?.plan_tier}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {userCount} user{userCount !== 1 ? 's' : ''} · {org?.name}
              {org?.access_expires_at && (
                <span className="text-amber-600 ml-2">
                  · Access expires {new Date(org.access_expires_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className={`text-sm ${billingCycle === 'monthly' ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>Monthly</span>
        <button onClick={() => setBillingCycle(b => b === 'monthly' ? 'annual' : 'monthly')}
          className={`w-12 h-6 rounded-full transition-colors ${billingCycle === 'annual' ? 'bg-purple-600' : 'bg-gray-300'}`}>
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
        <span className={`text-sm ${billingCycle === 'annual' ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          Annual <span className="text-xs text-green-600 font-medium">Save 20%</span>
        </span>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {plans.map(plan => (
          <div key={plan.tier} className={`bg-white rounded-2xl border-2 p-5 relative ${plan.popular ? 'border-purple-300' : 'border-gray-200'}`}
            style={plan.popular ? { boxShadow: '0 4px 20px rgba(90,24,144,0.1)' } : {}}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ background: '#5a1890' }}>
                Most popular
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
              <div className="mt-2">
                {plan.price === 0 ? (
                  <span className="text-2xl font-bold text-gray-900">Free</span>
                ) : (
                  <>
                    <span className="text-2xl font-bold text-gray-900">{formatNaira(plan.price)}</span>
                    <span className="text-xs text-gray-500">{plan.period}</span>
                  </>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2 mb-5">
              {plan.features.map(f => (
                <div key={f} className="flex items-start gap-2 text-xs text-gray-700">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> {f}
                </div>
              ))}
              {plan.excluded.map(f => (
                <div key={f} className="flex items-start gap-2 text-xs text-gray-400">
                  <span className="mt-0.5 flex-shrink-0">—</span> {f}
                </div>
              ))}
            </div>

            {/* CTA button */}
            {isActivePlan(plan.tier) ? (
              <div className="w-full py-2.5 rounded-xl text-sm text-center border-2 border-gray-200 text-gray-400 font-medium">
                Current plan
              </div>
            ) : canUpgrade(plan.tier) ? (
              <button onClick={() => startPayment(plan.tier)}
                disabled={!!processingPlan}
                className="w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                style={plan.popular
                  ? { background: '#2b0548', color: '#e1b3ee', boxShadow: '0 1px 3px rgba(43,5,72,0.3)' }
                  : { background: '#f3f4f6', color: '#374151' }}>
                {processingPlan === plan.tier ? 'Processing...' : `Upgrade to ${plan.name}`}
              </button>
            ) : (
              <div className="w-full py-2.5 rounded-xl text-sm text-center text-gray-400">
                —
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Enterprise CTA */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold mb-1">Enterprise</h3>
            <p className="text-sm text-gray-400">Custom pricing for large organizations. Dedicated AM, SSO, white-label, and more.</p>
          </div>
          <a href="mailto:sarah@trailblazeafrica.com?subject=TrailBlaze CRM Enterprise inquiry"
            className="px-5 py-2.5 bg-white text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-100 flex-shrink-0">
            Contact sales
          </a>
        </div>
      </div>

      {/* Access code entry */}
      <AccessCodeEntry onSuccess={() => window.location.reload()} />

      {/* FAQ */}
      <div className="mt-8 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Frequently asked questions</h3>
        {[
          { q: 'Can I change plans anytime?', a: 'Yes. Upgrade instantly, downgrade at the end of your billing cycle. No lock-in contracts.' },
          { q: 'What happens to my data if I downgrade?', a: 'Your data stays. You keep access to everything within your new plan limits. Nothing is deleted.' },
          { q: 'Do you offer refunds?', a: 'Yes. If you are not satisfied within the first 14 days, contact us for a full refund.' },
          { q: 'What payment methods do you accept?', a: 'All Nigerian bank cards, bank transfers, and USSD via Paystack. International cards also accepted.' },
        ].map(item => (
          <div key={item.q} className="bg-white border border-gray-200 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-1">{item.q}</h4>
            <p className="text-xs text-gray-500">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
