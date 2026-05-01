// src/app/signup/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AccessCodeEntry from '@/components/ui/AccessCodeEntry'


export default function SignupPage() {
  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [industry, setIndustry] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Step 1: Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, org_name: orgName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!authData.user) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    // Step 2: Create organization via API route (uses service role key)
    const res = await fetch('/api/auth/setup-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_id: authData.user.id,
        full_name: fullName,
        email,
        org_name: orgName,
        industry,
      }),
    })

    if (!res.ok) {
      setError('Account created but organization setup failed. Please contact support.')
      setLoading(false)
      return
    }

    // Check if email confirmation is required
    if (authData.user.identities?.length === 0) {
      router.push('/login?message=check-email')
    } else {
      router.push('/dashboard')
    }
  }

  const industries = [
    'Technology / SaaS', 'Fintech', 'Banking', 'E-commerce', 'Healthcare',
    'Education', 'Agriculture', 'Media', 'Logistics', 'Real Estate',
    'Consulting', 'NGO / Social Enterprise', 'Manufacturing', 'Other',
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #2b0548 0%, #5a1890 100%)' }}>
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white font-semibold text-lg">TB</div>
            <span className="text-white text-xl font-medium">TrailBlaze CRM</span>
          </div>
        </div>
        <div className="space-y-6">
          <h1 className="text-3xl font-medium text-white leading-tight">
            Stop losing customers.<br />Start managing accounts.
          </h1>
          <div className="space-y-4 text-white/70 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white text-xs mt-0.5">✓</div>
              <span>KEEP Framework health scoring built into every account</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white text-xs mt-0.5">✓</div>
              <span>Native WhatsApp integration — follow up where your clients actually are</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white text-xs mt-0.5">✓</div>
              <span>AI that flags at-risk accounts before they churn</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white text-xs mt-0.5">✓</div>
              <span>Pre-loaded account management playbooks from real consulting engagements</span>
            </div>
          </div>
        </div>
        <p className="text-white/40 text-sm">Free during beta. No credit card required.</p>
      </div>

      {/* Right panel — signup form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-semibold"
              style={{ background: '#2b0548' }}>TB</div>
            <span className="text-lg font-medium text-gray-900">TrailBlaze CRM</span>
          </div>

          <h2 className="text-2xl font-medium text-gray-900 mb-1">
            {step === 1 ? 'Create your account' : 'Set up your workspace'}
          </h2>
          <p className="text-gray-500 mb-8">
            {step === 1 ? 'Start managing accounts in under 2 minutes.' : 'Tell us about your business.'}
          </p>

          {/* Step indicator */}
          <div className="flex gap-2 mb-8">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-purple-900' : 'bg-gray-200'}`}></div>
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-purple-900' : 'bg-gray-200'}`}></div>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2) } : handleSignup} className="space-y-4">
            {step === 1 ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                  <input
                    type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Sarah Alex-Usifo" required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com" required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters, uppercase, lowercase, number, symbol" required minLength={8}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {[
                        { test: password.length >= 8, label: 'At least 8 characters' },
                        { test: /[A-Z]/.test(password), label: 'One uppercase letter' },
                        { test: /[a-z]/.test(password), label: 'One lowercase letter' },
                        { test: /[0-9]/.test(password), label: 'One number' },
                        { test: /[^A-Za-z0-9]/.test(password), label: 'One symbol (!@#$%...)' },
                      ].map(r => (
                        <div key={r.label} className={`flex items-center gap-1.5 text-xs ${r.test ? 'text-green-600' : 'text-gray-400'}`}>
                          <span>{r.test ? '✓' : '○'}</span> {r.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button type="submit"
                  disabled={!(password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password))}
                  className="w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ background: '#2b0548', color: '#e1b3ee' }}>
                  Continue
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company / Organization name</label>
                  <input
                    type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
                    placeholder="Acme Technologies" required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <select
                    value={industry} onChange={e => setIndustry(e.target.value)} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select your industry</option>
                    {industries.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                {/* Terms checkbox */}
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)}
                    required
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-purple-700 focus:ring-purple-500"
                  />
                  <label htmlFor="terms" className="text-xs text-gray-500">
                    I agree to the{' '}
                    <a href="/legal/terms" target="_blank" className="text-purple-700 hover:underline">Terms of Use</a>
                    {' '}and{' '}
                    <a href="/legal/privacy" target="_blank" className="text-purple-700 hover:underline">Privacy Policy</a>
                  </label>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
                    Back
                  </button>
                  <button type="submit" disabled={loading || !agreedToTerms}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ background: '#2b0548', color: '#e1b3ee' }}>
                    {loading ? 'Creating...' : 'Create workspace'}
                  </button>
                  <div className="mt-6">
  <AccessCodeEntry />
</div>
                </div>
              </>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-purple-700 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
