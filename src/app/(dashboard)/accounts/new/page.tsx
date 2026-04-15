// src/app/(dashboard)/accounts/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewAccountPage() {
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [website, setWebsite] = useState('')
  const [contractValue, setContractValue] = useState('')
  const [renewalDate, setRenewalDate] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactWhatsApp, setContactWhatsApp] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) return

    // Get default retention pipeline and first stage
    const { data: pipeline } = await supabase.from('pipelines').select('id').eq('org_id', profile.org_id).eq('pipeline_type', 'retention').eq('is_default', true).single()
    let stageId = null
    if (pipeline) {
      const { data: stage } = await supabase.from('pipeline_stages').select('id').eq('pipeline_id', pipeline.id).order('sort_order').limit(1).single()
      stageId = stage?.id
    }

    const { data: account, error: accError } = await supabase.from('accounts').insert({
      org_id: profile.org_id,
      name,
      industry: industry || null,
      website: website || null,
      contract_value_annual: contractValue ? parseFloat(contractValue) : null,
      renewal_date: renewalDate || null,
      assigned_user_id: profile.id,
      pipeline_id: pipeline?.id,
      stage_id: stageId,
      status: 'onboarding',
    }).select().single()

    if (accError) { setError(accError.message); setSaving(false); return }

    if (contactName && account) {
      await supabase.from('contacts').insert({
        account_id: account.id,
        org_id: profile.org_id,
        full_name: contactName,
        email: contactEmail || null,
        whatsapp_number: contactWhatsApp || null,
        role_type: 'decision_maker',
        is_primary: true,
      })
    }

    router.push(`/accounts/${account.id}`)
  }

  const industries = ['Fintech', 'Banking', 'Technology', 'E-commerce', 'Healthcare', 'Education', 'Agriculture', 'Media', 'Logistics', 'Real Estate', 'Consulting', 'NGO', 'Manufacturing', 'Hospitality', 'Other']

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/accounts" className="hover:text-gray-600">Accounts</Link>
        <span>/</span>
        <span className="text-gray-700">New account</span>
      </div>

      <h1 className="text-xl font-medium text-gray-900 mb-6">Add new account</h1>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-900">Account details</h2>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Company name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Paystack"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Industry</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">Select</option>
                {industries.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Website</label>
              <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Annual contract value (₦)</label>
              <input type="number" value={contractValue} onChange={e => setContractValue(e.target.value)} placeholder="e.g. 2000000"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Renewal date</label>
              <input type="date" value={renewalDate} onChange={e => setRenewalDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-900">Primary contact (optional)</h2>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Contact name</label>
            <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="e.g. Bola Adeyemi"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="bola@company.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">WhatsApp</label>
              <input type="tel" value={contactWhatsApp} onChange={e => setContactWhatsApp(e.target.value)} placeholder="+234 800 000 0000"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/accounts" className="flex-1 py-2.5 text-center border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</Link>
          <button type="submit" disabled={saving || !name} className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>
            {saving ? 'Creating...' : 'Create account'}
          </button>
        </div>
      </form>
    </div>
  )
}
