// src/app/(dashboard)/onboarding/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [accountName, setAccountName] = useState('')
  const [accountIndustry, setAccountIndustry] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactWhatsApp, setContactWhatsApp] = useState('')
  const [keepScores, setKeepScores] = useState({ k: 3, e: 3, ex: 3, p: 3 })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const totalSteps = 4

  async function completeOnboarding() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) return

    // Get default retention pipeline and onboarding stage
    const { data: pipeline } = await supabase
      .from('pipelines')
      .select('id')
      .eq('org_id', profile.org_id)
      .eq('pipeline_type', 'retention')
      .eq('is_default', true)
      .single()

    let stageId = null
    if (pipeline) {
      const { data: stage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('pipeline_id', pipeline.id)
        .eq('sort_order', 1)
        .single()
      stageId = stage?.id
    }

    // Create first account
    const { data: account } = await supabase
      .from('accounts')
      .insert({
        org_id: profile.org_id,
        name: accountName,
        industry: accountIndustry,
        assigned_user_id: profile.id,
        pipeline_id: pipeline?.id,
        stage_id: stageId,
        health_score_know: keepScores.k,
        health_score_engage: keepScores.e,
        health_score_exceed: keepScores.ex,
        health_score_prevent: keepScores.p,
        status: 'onboarding',
      })
      .select()
      .single()

    // Create contact if provided
    if (account && contactName) {
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

    // Log first health score to history
    if (account) {
      await supabase.from('health_score_history').insert({
        account_id: account.id,
        org_id: profile.org_id,
        scored_by_user_id: profile.id,
        score_know: keepScores.k,
        score_engage: keepScores.e,
        score_exceed: keepScores.ex,
        score_prevent: keepScores.p,
        scoring_method: 'manual',
        notes: 'Initial assessment during onboarding',
      })
    }

    router.push('/dashboard')
  }

  return (
    <div className="max-w-xl mx-auto py-8">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
            i < step ? 'bg-purple-700' : 'bg-gray-200'
          }`} />
        ))}
      </div>

      {/* Step 1: Welcome */}
      {step === 1 && (
        <div>
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-bold"
              style={{ background: '#2b0548', color: '#e1b3ee' }}>TB</div>
            <h1 className="text-2xl font-medium text-gray-900 mb-2">Welcome to TrailBlaze CRM</h1>
            <p className="text-gray-500">Let's set up your first account in under 2 minutes. You can add more later.</p>
          </div>

          <div className="bg-purple-50 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-medium text-purple-900 mb-2">What you'll set up:</h3>
            <div className="space-y-2 text-sm text-purple-800">
              <div className="flex items-center gap-2"><span>1.</span> Add your first client account</div>
              <div className="flex items-center gap-2"><span>2.</span> Add a primary contact</div>
              <div className="flex items-center gap-2"><span>3.</span> Run your first KEEP health score</div>
              <div className="flex items-center gap-2"><span>4.</span> See your dashboard come alive</div>
            </div>
          </div>

          <button onClick={() => setStep(2)} className="w-full py-2.5 rounded-lg text-sm font-medium"
            style={{ background: '#2b0548', color: '#e1b3ee' }}>
            Let's go
          </button>
        </div>
      )}

      {/* Step 2: First account */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-medium text-gray-900 mb-1">Add your first client account</h2>
          <p className="text-sm text-gray-500 mb-6">Think of a client you're currently managing or want to start managing better.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Client / Company name</label>
              <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)}
                placeholder="e.g. Paystack, Sterling Bank, Eko Hotels"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Industry</label>
              <select value={accountIndustry} onChange={e => setAccountIndustry(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">Select industry</option>
                {['Fintech','Banking','Technology','E-commerce','Healthcare','Education','Agriculture','Media','Logistics','Real Estate','Consulting','NGO','Manufacturing','Hospitality','Other'].map(i =>
                  <option key={i} value={i}>{i}</option>
                )}
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700">Back</button>
            <button onClick={() => setStep(3)} disabled={!accountName}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: '#2b0548', color: '#e1b3ee' }}>Next</button>
          </div>
        </div>
      )}

      {/* Step 3: Primary contact */}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-medium text-gray-900 mb-1">Add a primary contact</h2>
          <p className="text-sm text-gray-500 mb-6">Who's your main point of contact at {accountName}?</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Contact name</label>
              <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                placeholder="e.g. Bola Adeyemi"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email (optional)</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                placeholder="bola@company.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">WhatsApp number (optional)</label>
              <input type="tel" value={contactWhatsApp} onChange={e => setContactWhatsApp(e.target.value)}
                placeholder="+234 800 000 0000"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(2)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700">Back</button>
            <button onClick={() => setStep(4)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: '#2b0548', color: '#e1b3ee' }}>Next</button>
          </div>
        </div>
      )}

      {/* Step 4: KEEP Score */}
      {step === 4 && (
        <div>
          <h2 className="text-xl font-medium text-gray-900 mb-1">Your first KEEP score</h2>
          <p className="text-sm text-gray-500 mb-6">How well are you managing {accountName} right now? Be honest — this is your starting point.</p>

          {[
            { key: 'k', label: 'Know', desc: 'How well do you understand their business and goals?', color: '#5a1890' },
            { key: 'e', label: 'Engage', desc: 'How often and how meaningfully do you interact?', color: '#00adef' },
            { key: 'ex', label: 'Exceed', desc: 'Are you delivering beyond their expectations?', color: '#c9a54e' },
            { key: 'p', label: 'Prevent', desc: 'Are you proactively spotting and fixing issues?', color: '#1D9E75' },
          ].map(dim => (
            <div key={dim.key} className="mb-5">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium" style={{ color: dim.color }}>{dim.label}</span>
                <span className="text-sm font-medium text-gray-900">{keepScores[dim.key as keyof typeof keepScores]}/5</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{dim.desc}</p>
              <input type="range" min="0" max="5" step="1"
                value={keepScores[dim.key as keyof typeof keepScores]}
                onChange={e => setKeepScores(prev => ({ ...prev, [dim.key]: parseInt(e.target.value) }))}
                className="w-full" style={{ accentColor: dim.color }} />
            </div>
          ))}

          <div className="bg-gray-50 rounded-lg p-3 mb-6 text-center">
            <div className="text-xs text-gray-500">Starting KEEP score for {accountName}</div>
            <div className="text-3xl font-medium" style={{ color: '#2b0548' }}>
              {keepScores.k + keepScores.e + keepScores.ex + keepScores.p}/20
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700">Back</button>
            <button onClick={completeOnboarding} disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: '#2b0548', color: '#e1b3ee' }}>
              {saving ? 'Setting up...' : 'Go to dashboard'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
