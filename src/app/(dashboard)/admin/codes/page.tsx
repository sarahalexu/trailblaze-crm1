// src/app/(dashboard)/admin/codes/page.tsx
// Super admin only — create and manage access codes
'use client'

import { useState, useEffect } from 'react'

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newPlan, setNewPlan] = useState('beta')
  const [newDesc, setNewDesc] = useState('')
  const [newMaxUses, setNewMaxUses] = useState('30')
  const [newDuration, setNewDuration] = useState('60')
  const [newExpiry, setNewExpiry] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/codes/manage')
    const data = await res.json()
    if (data.codes) setCodes(data.codes)
    setLoading(false)
  }

  async function createCode() {
    if (!newCode) return
    setSaving(true); setError('')
    const res = await fetch('/api/codes/manage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: newCode, plan_tier: newPlan, description: newDesc,
        max_uses: parseInt(newMaxUses) || 30, duration_days: parseInt(newDuration) || 60,
        expires_at: newExpiry || null,
      }),
    })
    const data = await res.json()
    if (data.error) setError(data.error)
    else { setShowCreate(false); setNewCode(''); setNewDesc(''); load() }
    setSaving(false)
  }

  async function toggleCode(codeId: string, active: boolean) {
    await fetch('/api/codes/manage', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code_id: codeId, is_active: active }),
    })
    load()
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="tb-spinner" /></div>

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Access Codes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage beta access codes, partner codes, and promotional offers.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: '#2b0548', color: '#e1b3ee' }}>+ Create code</button>
      </div>

      {/* Codes list */}
      <div className="space-y-4">
        {codes.map(c => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-mono font-semibold tracking-wider" style={{ color: '#5a1890' }}>{c.code}</span>
                  <button onClick={() => copyCode(c.code)} className="text-[10px] text-gray-400 hover:text-gray-600 border border-gray-200 px-1.5 py-0.5 rounded">Copy</button>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium capitalize">{c.plan_tier}</span>
                </div>
                <p className="text-xs text-gray-500">{c.description || 'No description'}</p>
              </div>
              <button onClick={() => toggleCode(c.id, !c.is_active)}
                className={`text-xs px-3 py-1 rounded-lg ${c.is_active ? 'text-red-600 border border-red-200 hover:bg-red-50' : 'text-green-600 border border-green-200 hover:bg-green-50'}`}>
                {c.is_active ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>

            <div className="flex gap-6 text-xs text-gray-500 mb-3">
              <span>Uses: <strong className="text-gray-700">{c.times_used}/{c.max_uses}</strong></span>
              <span>Duration: <strong className="text-gray-700">{c.duration_days} days</strong></span>
              <span>Code expires: <strong className="text-gray-700">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-NG') : 'Never'}</strong></span>
            </div>

            {/* Redemptions */}
            {c.redemptions && c.redemptions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <h4 className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Redeemed by ({c.redemptions.length})</h4>
                <div className="space-y-1">
                  {c.redemptions.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">{r.org?.name || 'Unknown org'}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400">{new Date(r.redeemed_at).toLocaleDateString('en-NG')}</span>
                        <span className="text-gray-400">Expires: {new Date(r.access_expires_at).toLocaleDateString('en-NG')}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${r.is_expired ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-700'}`}>
                          {r.is_expired ? 'Expired' : 'Active'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.15s ease' }}
          onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4" onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.2s ease' }}>
            <div className="h-1 rounded-t-2xl -mt-6 -mx-6 mb-5" style={{ background: 'linear-gradient(90deg, #5a1890, #00adef, #c9a54e)' }} />
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create access code</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Code *</label>
                <input type="text" value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, ''))}
                  placeholder="e.g. BETA-WAVE2" maxLength={20}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono tracking-wider uppercase focus:outline-none focus:border-purple-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Unlocks plan</label>
                  <select value={newPlan} onChange={e => setNewPlan(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white">
                    <option value="beta">Beta (all features)</option>
                    <option value="growth">Growth</option>
                    <option value="scale">Scale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Duration (days)</label>
                  <input type="number" value={newDuration} onChange={e => setNewDuration(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Max uses</label>
                  <input type="number" value={newMaxUses} onChange={e => setNewMaxUses(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Code expires on</label>
                  <input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Internal note</label>
                <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  placeholder="e.g. For AIC cohort 6 members"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm" />
              </div>
            </div>

            {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancel</button>
              <button onClick={createCode} disabled={saving || !newCode}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ background: '#2b0548', color: '#e1b3ee' }}>
                {saving ? 'Creating...' : 'Create code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
