// src/app/(public)/landing/page.tsx
// Landing page — accessible without auth
// In production, this would be at the root domain or a subdomain

'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const pricing = {
    starter: { monthly: 'Free', annual: 'Free', label: 'Starter' },
    growth: { monthly: '₦20,000', annual: '₦16,000', label: 'Growth' },
    scale: { monthly: '₦45,000', annual: '₦36,000', label: 'Scale' },
    enterprise: { monthly: 'Custom', annual: 'Custom', label: 'Enterprise' },
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
              style={{ background: '#2b0548', color: '#e1b3ee' }}>TB</div>
            <span className="text-sm font-medium text-gray-900">TrailBlaze CRM</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900">Features</a>
            <a href="#pricing" className="hover:text-gray-900">Pricing</a>
            <a href="#faq" className="hover:text-gray-900">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
            <Link href="/signup" className="text-sm px-4 py-2 rounded-lg font-medium"
              style={{ background: '#2b0548', color: '#e1b3ee' }}>
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 lg:py-28">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: '#c9a54e20', color: '#854F0B' }}>
            Nigeria's first account management CRM
          </div>
          <h1 className="text-4xl lg:text-5xl font-medium text-gray-900 leading-tight mb-5">
            Stop losing customers.<br />Start managing accounts.
          </h1>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            TrailBlaze CRM is the AI-powered account management platform with native WhatsApp integration,
            built for how African businesses actually operate. Track health scores. Prevent churn. Grow revenue.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="px-6 py-3 rounded-lg text-sm font-medium"
              style={{ background: '#2b0548', color: '#e1b3ee' }}>
              Get started free
            </Link>
            <a href="#features" className="px-6 py-3 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs text-gray-400">Free forever on Starter. No credit card required.</p>
        </div>
      </section>

      {/* Problem/Solution */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-xs uppercase tracking-wider text-red-600 font-medium mb-3">The problem</h2>
              <h3 className="text-2xl font-medium text-gray-900 mb-4">Nigerian businesses lose 30-40% of customers annually</h3>
              <p className="text-gray-600">Not because of bad products — because they lack systematic account management. Companies spend millions acquiring customers, then leave millions on the table by neglecting those relationships. Every CRM on the market is built for sales acquisition. None focus on what happens after the sale.</p>
            </div>
            <div>
              <h2 className="text-xs uppercase tracking-wider font-medium mb-3" style={{ color: '#1D9E75' }}>The solution</h2>
              <h3 className="text-2xl font-medium text-gray-900 mb-4">The first CRM built for customer retention</h3>
              <p className="text-gray-600">TrailBlaze CRM uses the KEEP Framework to score every account's health across four dimensions: Know, Engage, Exceed, and Prevent. AI flags at-risk accounts before they churn. Built-in playbooks tell your team exactly what to do. And native WhatsApp integration means you follow up where your clients actually are.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-medium text-gray-900 mb-3">Everything you need to retain and grow accounts</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Not another generic CRM. Purpose-built for account management excellence.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'KEEP health scoring', desc: 'Score every account across Know, Engage, Exceed, and Prevent. See who is healthy, at risk, or critical at a glance.', icon: '💯' },
              { title: 'Native WhatsApp', desc: 'Send follow-ups, check-ins, and reminders through WhatsApp from inside the CRM. Conversations logged automatically.', icon: '💬' },
              { title: 'AI-powered automation', desc: 'Flags at-risk accounts, drafts follow-up messages, suggests upsell opportunities, and sends renewal reminders.', icon: '🤖' },
              { title: 'Built-in playbooks', desc: '5 pre-loaded account management workflows from real consulting engagements. Not a blank tool — it tells you what to do.', icon: '📋' },
              { title: 'Dual pipelines', desc: 'Sales pipeline for closing deals. Retention pipeline for keeping clients. Won deals automatically become accounts.', icon: '🔄' },
              { title: 'Revenue at risk', desc: 'See exactly how much revenue is tied to unhealthy accounts. Turn retention from a vague goal into a concrete number.', icon: '💰' },
              { title: 'Interaction timeline', desc: 'Unified view of all touchpoints — WhatsApp, email, calls, meetings — in one chronological feed per account.', icon: '📊' },
              { title: 'Priced for Africa', desc: 'Naira-first pricing. No annual lock-in. No surprise upgrades. Start free, grow as you grow.', icon: '🌍' },
              { title: 'Data you can export', desc: 'Your data is always yours. Export everything as CSV anytime. We will never hold your data hostage.', icon: '📤' },
            ].map(f => (
              <div key={f.title} className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-medium text-gray-900 mb-3">Simple, transparent pricing</h2>
            <p className="text-gray-500 mb-6">No hidden fees. No annual lock-in. Cancel anytime.</p>
            <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
              <button onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-md text-sm ${billingCycle === 'monthly' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>
                Monthly
              </button>
              <button onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-md text-sm ${billingCycle === 'annual' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>
                Annual <span className="text-xs text-green-600 ml-1">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { tier: 'starter', features: ['1 user', '15 accounts', 'KEEP health scoring', '1 pipeline each', '2 playbooks', 'Knowledge base support'] },
              { tier: 'growth', features: ['Up to 10 users', '500 accounts', 'WhatsApp integration', 'AI automation', 'All 5 playbooks', '24hr email support', 'Full reporting', 'Data export'], popular: true },
              { tier: 'scale', features: ['Up to 50 users', 'Unlimited accounts', 'WhatsApp broadcasts', 'Churn prediction', 'Custom playbooks', '8hr priority support', 'Stakeholder mapping', 'Client portal', 'API access'] },
              { tier: 'enterprise', features: ['Unlimited users', 'Dedicated account manager', 'Custom integrations', 'SSO', 'White-label option', '4hr SLA', 'On-site training', 'Custom AI training'] },
            ].map(plan => {
              const p = pricing[plan.tier as keyof typeof pricing]
              return (
                <div key={plan.tier}
                  className={`bg-white rounded-xl p-5 ${plan.popular ? 'ring-2 ring-purple-700 relative' : 'border border-gray-200'}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ background: '#2b0548' }}>Most popular</div>
                  )}
                  <h3 className="text-sm font-medium text-gray-900 mb-1">{p.label}</h3>
                  <div className="mb-4">
                    <span className="text-2xl font-medium text-gray-900">
                      {billingCycle === 'monthly' ? p.monthly : p.annual}
                    </span>
                    {p.monthly !== 'Free' && p.monthly !== 'Custom' && (
                      <span className="text-sm text-gray-400">/user/mo</span>
                    )}
                  </div>
                  <Link href="/signup"
                    className={`block text-center py-2 rounded-lg text-sm font-medium mb-4 ${
                      plan.popular
                        ? 'text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    style={plan.popular ? { background: '#2b0548' } : {}}>
                    {plan.tier === 'enterprise' ? 'Contact sales' : 'Get started'}
                  </Link>
                  <ul className="space-y-2">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="text-green-600 mt-0.5">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-medium text-gray-900 mb-4">Ready to stop losing customers?</h2>
          <p className="text-gray-500 mb-8">Join the beta and be among the first businesses in Africa to use an account management CRM built for this market.</p>
          <Link href="/signup" className="inline-block px-8 py-3 rounded-lg text-sm font-medium"
            style={{ background: '#2b0548', color: '#e1b3ee' }}>
            Start free today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold"
                style={{ background: '#2b0548', color: '#e1b3ee' }}>TB</div>
              <span className="text-sm font-medium text-gray-900">TrailBlaze CRM</span>
            </div>
            <p className="text-xs text-gray-500 max-w-xs">
              Built by TrailBlaze Africa — Nigeria's first account management ecosystem.
            </p>
          </div>
          <div className="flex gap-12 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Product</h4>
              <div className="space-y-1.5 text-gray-500">
                <a href="#features" className="block hover:text-gray-700">Features</a>
                <a href="#pricing" className="block hover:text-gray-700">Pricing</a>
                <Link href="/signup" className="block hover:text-gray-700">Sign up</Link>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Legal</h4>
              <div className="space-y-1.5 text-gray-500">
                <Link href="/legal/terms" className="block hover:text-gray-700">Terms of use</Link>
                <Link href="/legal/privacy" className="block hover:text-gray-700">Privacy policy</Link>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Contact</h4>
              <div className="space-y-1.5 text-gray-500">
                <a href="mailto:hello@trailblazecrm.com" className="block hover:text-gray-700">hello@trailblazecrm.com</a>
                <a href="https://trailblazeafrica.com" target="_blank" className="block hover:text-gray-700">trailblazeafrica.com</a>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400">
          © {new Date().getFullYear()} TrailBlaze Africa Ltd. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
