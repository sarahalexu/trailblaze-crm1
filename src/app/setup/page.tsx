// src/app/setup/page.tsx
// Creates org on starter plan, then redeems access code via /api/codes/redeem if provided

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const INDUSTRIES = [
  'Technology / SaaS', 'Fintech', 'Banking', 'E-commerce', 'Healthcare',
  'Education', 'Agriculture', 'Media', 'Logistics', 'Real Estate',
  'Consulting', 'NGO / Social Enterprise', 'Manufacturing', 'Other',
]

export default function SetupPage() {
  const [orgName, setOrgName] = useState('')
  const [industry, setIndustry] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { checkUser() }, [])

  async function checkUser() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', authUser.id).maybeSingle()
    if (profile) { router.push('/dashboard'); return }
    setUser(authUser)
    setOrgName(authUser.user_metadata?.full_name ? authUser.user_metadata.full_name.split(' ')[0] + "'s Organization" : '')
    setChecking(false)
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim()) { setError('Enter your company or organization name.'); return }
    setLoading(true)
    setError('')

    try {
      // Step 1: Create org on starter plan
      const res = await fetch('/api/auth/setup-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          email: user.email,
          org_name: orgName.trim(),
          industry: industry || null,
          date_of_birth: null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Setup failed')

      // Step 2: If access code provided, redeem it via the existing system
      if (accessCode.trim()) {
        try {
          const codeRes = await fetch('/api/codes/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: accessCode.trim() }),
          })
          // Don't block signup if code fails - they still get starter plan
          const codeData = await codeRes.json()
          if (!codeRes.ok) {
            console.warn('Access code not applied:', codeData.error)
          }
        } catch {
          console.warn('Access code redemption failed')
        }
      }

      router.push('/dashboard')
    } catch (err: any) {
      if (err.message?.includes('duplicate')) { router.push('/dashboard'); return }
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-black.png" alt="TrailBlaze CRM" className="h-10 w-auto object-contain mx-auto mb-4 dark:hidden" />
          <img src="/logo-white.png" alt="TrailBlaze CRM" className="h-10 w-auto object-contain mx-auto mb-4 hidden dark:block" />
          <h1 className="text-xl font-semibold text-gray-900 mb-1">One more step</h1>
          <p className="text-sm text-gray-500">Tell us about your organization to finish setting up.</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company / organization name *</label>
              <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Acme Technologies"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">Select industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Access code <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="text" value={accessCode} onChange={e => setAccessCode(e.target.value)} placeholder="Enter code if you have one"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading || !orgName.trim()}
              className="w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: '#2b0548', color: '#e1b3ee' }}>
              {loading ? 'Setting up...' : 'Get started'}
            </button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-4">Signed in as {user?.email}</p>
        </div>
      </div>
    </div>
  )
}