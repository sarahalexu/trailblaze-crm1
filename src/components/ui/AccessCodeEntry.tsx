// src/components/ui/AccessCodeEntry.tsx
// Drop this component into your signup page and settings/billing page
'use client'

import { useState } from 'react'

interface Props {
  onSuccess?: (result: { plan: string; expires: string; message: string }) => void
  compact?: boolean // smaller version for settings page
}

export default function AccessCodeEntry({ onSuccess, compact = false }: Props) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function redeem() {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setSuccess(data.message)
        setCode('')
        onSuccess?.(data)
        // Reload after 2 seconds to reflect new plan
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setError(data.error || 'Something went wrong.')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  if (compact) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Have an access code?</h4>
        <div className="flex gap-2">
          <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code" maxLength={20}
            onKeyDown={e => e.key === 'Enter' && redeem()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono tracking-wider uppercase focus:outline-none focus:border-purple-400"
            style={{ transition: 'border-color 0.15s ease' }} />
          <button onClick={redeem} disabled={loading || !code.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: '#2b0548', color: '#e1b3ee' }}>
            {loading ? '...' : 'Apply'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        {success && <p className="text-xs text-green-600 mt-2">{success}</p>}
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5" style={{ animation: 'fadeIn 0.2s ease' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎟️</span>
        <h3 className="text-sm font-semibold text-gray-900">Have an access code?</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">Beta testers and partners receive access codes that unlock premium features for a limited time.</p>

      <div className="flex gap-2">
        <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. BETA-LAUNCH-2026"
          maxLength={20}
          onKeyDown={e => e.key === 'Enter' && redeem()}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono tracking-wider uppercase text-center focus:outline-none focus:border-purple-400"
          style={{ transition: 'border-color 0.15s ease, box-shadow 0.15s ease', letterSpacing: '0.1em' }}
          onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(90,24,144,0.08)'}
          onBlur={e => e.target.style.boxShadow = 'none'} />
        <button onClick={redeem} disabled={loading || !code.trim()}
          className="px-6 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
          style={{ background: '#2b0548', color: '#e1b3ee', boxShadow: '0 1px 3px rgba(43,5,72,0.3)' }}>
          {loading ? 'Verifying...' : 'Redeem'}
        </button>
      </div>

      {error && (
        <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700" style={{ animation: 'slideUp 0.15s ease' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700" style={{ animation: 'slideUp 0.15s ease' }}>
          {success}
        </div>
      )}
    </div>
  )
}
