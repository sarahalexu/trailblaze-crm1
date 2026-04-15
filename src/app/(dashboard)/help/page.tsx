// src/app/(dashboard)/help/page.tsx
'use client'

import Link from 'next/link'

const articles = [
  { category: 'Getting started', items: [
    { title: 'Creating your first account', desc: 'Learn how to add and manage client accounts in TrailBlaze CRM.' },
    { title: 'Understanding KEEP scores', desc: 'How the Know, Engage, Exceed, Prevent framework works and how to score accounts.' },
    { title: 'Setting up your retention pipeline', desc: 'Configure pipeline stages to match your account management workflow.' },
    { title: 'Inviting team members', desc: 'Add account managers and viewers to your workspace.' },
  ]},
  { category: 'Account management', items: [
    { title: 'Logging interactions', desc: 'How to record WhatsApp messages, calls, emails, and meetings.' },
    { title: 'Using playbooks', desc: 'Activate guided workflows for onboarding, reviews, recovery, and renewals.' },
    { title: 'Understanding health status', desc: 'What Healthy, At Risk, and Critical mean and when accounts change status.' },
    { title: 'Managing contacts', desc: 'Add stakeholders, set primary contacts, and track decision-makers.' },
  ]},
  { category: 'WhatsApp', items: [
    { title: 'Connecting WhatsApp Business', desc: 'How to set up WhatsApp Cloud API integration with your CRM.' },
    { title: 'Sending messages from the CRM', desc: 'Send follow-ups and check-ins directly through WhatsApp.' },
    { title: 'Message limits and usage', desc: 'Understanding your monthly WhatsApp message allocation by plan.' },
  ]},
  { category: 'Billing & plans', items: [
    { title: 'Plan comparison', desc: 'Features and limits for Starter, Growth, Scale, and Enterprise plans.' },
    { title: 'Upgrading your plan', desc: 'How to upgrade and what changes immediately.' },
    { title: 'Exporting your data', desc: 'Download all your accounts, contacts, and interactions as CSV or JSON.' },
  ]},
]

export default function HelpPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-medium text-gray-900">Help centre</h1>
        <p className="text-sm text-gray-500 mt-0.5">Guides and answers to get the most out of TrailBlaze CRM.</p>
      </div>

      {/* Support contact */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-8">
        <h2 className="text-sm font-medium text-purple-900 mb-1">Need help?</h2>
        <p className="text-sm text-purple-700 mb-3">Can't find what you're looking for? Reach out to our support team.</p>
        <div className="flex gap-3">
          <a href="mailto:support@trailblazecrm.com" className="inline-block px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>
            Email support
          </a>
          <a href="https://www.notion.so/TrailBlaze-CRM-3432ec72fa4f803385dec6074528723c" target="_blank" className="inline-block px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
            Full knowledge base
          </a>
        </div>
      </div>

      {/* Article sections */}
      <div className="space-y-8">
        {articles.map(section => (
          <div key={section.category}>
            <h2 className="text-sm font-medium text-gray-900 mb-3">{section.category}</h2>
            <div className="grid gap-3">
              {section.items.map(article => (
                <a key={article.title} href="https://www.notion.so/TrailBlaze-CRM-3432ec72fa4f803385dec6074528723c" target="_blank"
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors block">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">{article.title}</h3>
                      <p className="text-xs text-gray-500">{article.desc}</p>
                    </div>
                    <span className="text-gray-300 text-sm flex-shrink-0 ml-3">→</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legal links */}
      <div className="mt-8 pt-6 border-t border-gray-200 flex gap-6 text-sm text-gray-500">
        <Link href="/legal/terms" className="hover:text-gray-700">Terms of use</Link>
        <Link href="/legal/privacy" className="hover:text-gray-700">Privacy policy</Link>
      </div>
    </div>
  )
}
