// src/components/ui/PlanBanner.tsx
// Shows the current plan status, expiry countdown, and access code entry
// Add this to the dashboard or settings page
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import AccessCodeEntry from './AccessCodeEntry'
import Link from 'next/link'

export default function PlanBanner() {
  const [org, setOrg] = useState<any>(null)
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [showCodeEntry, setShowCodeEntry] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('org_id').eq('auth_id', user.id).single()
      if (!profile) return
      const { data: orgData } = await supabase.from('organizations').select('*').eq('id', profile.org_id).single()
      if (orgData) {
        setOrg(orgData)
        if (orgData.access_expires_at) {
          const diff = new Date(orgData.access_expires_at).getTime() - Date.now()
          setDaysLeft(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))))
        }
      }
    }
    load()
  }, [])

  if (!org) return null

  // Don't show banner for paid plans without expiry
  if ((org.plan_tier === 'growth' || org.plan_tier === 'scale' || org.plan_tier === 'enterprise') && !org.access_expires_at) {
    return null
  }

  // Starter plan — show upgrade prompt with code entry
  if (org.plan_tier === 'starter') {
    return (
      <div className="mb-6 bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">Free plan</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">1 user · 15 accounts · 1 sequence</span>
            </div>
            <p className="text-xs text-gray-500">Unlock more features with an access code or upgrade to a paid plan.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCodeEntry(!showCodeEntry)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50">
              🎟️ Enter code
            </button>
            <Link href="/settings/billing"
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: '#2b0548', color: '#e1b3ee' }}>
              Upgrade
            </Link>
          </div>
        </div>
        {showCodeEntry && (
          <div className="mt-4"><AccessCodeEntry compact onSuccess={() => window.location.reload()} /></div>
        )}
      </div>
    )
  }

  // Beta/Growth/Scale with expiry — show countdown
  if (daysLeft !== null) {
    const urgent = daysLeft <= 7
    const warning = daysLeft <= 14
    const planLabel = org.plan_tier === 'beta' ? 'Beta (all features)' : org.plan_tier.charAt(0).toUpperCase() + org.plan_tier.slice(1)

    return (
      <div className={`mb-6 rounded-xl p-4 flex items-center justify-between ${urgent ? 'bg-red-50 border border-red-200' : warning ? 'bg-amber-50 border border-amber-200' : 'bg-purple-50 border border-purple-200'}`}>
        <div className="flex items-center gap-3">
          <span className="text-lg">{urgent ? '⚠️' : '🎟️'}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{planLabel} access</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${urgent ? 'bg-red-100 text-red-700' : warning ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                {daysLeft === 0 ? 'Expires today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {daysLeft <= 3
                ? 'Your access expires very soon. Upgrade to keep all your features.'
                : `Your ${planLabel} access expires on ${new Date(org.access_expires_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}.`
              }
            </p>
          </div>
        </div>
        <Link href="/settings/billing" className="px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
          style={{ background: '#2b0548', color: '#e1b3ee' }}>
          Upgrade now
        </Link>
      </div>
    )
  }

  return null
}
