'use client'
import { useState, useEffect } from 'react'
export default function AdminCodesPage() {
  const [codes, setCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [show, setShow] = useState(false)
  const [f, setF] = useState({ code: '', plan: 'beta', desc: '', uses: '30', days: '60', exp: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])
  async function load() { const r = await fetch('/api/codes/manage'); const d = await r.json(); if (d.codes) setCodes(d.codes); setLoading(false) }
  async function create() {
    if (!f.code) return; setSaving(true); setError('')
    const r = await fetch('/api/codes/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: f.code, plan_tier: f.plan, description: f.desc, max_uses: parseInt(f.uses)||30, duration_days: parseInt(f.days)||60, expires_at: f.exp||null }) })
    const d = await r.json(); if (d.error) setError(d.error); else { setShow(false); setF({ code:'', plan:'beta', desc:'', uses:'30', days:'60', exp:'' }); load() }
    setSaving(false)
  }
  async function toggle(id: string, active: boolean) { await fetch('/api/codes/manage', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code_id: id, is_active: active }) }); load() }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"/></div>

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-semibold text-gray-900">Access Codes</h1><p className="text-sm text-gray-500 mt-0.5">Manage beta, partner, and promo codes.</p></div>
        <button onClick={() => setShow(true)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background:'#2b0548', color:'#e1b3ee' }}>+ Create code</button>
      </div>
      <div className="space-y-4">
        {codes.map(c => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-mono font-semibold tracking-wider" style={{ color:'#5a1890' }}>{c.code}</span>
                  <button onClick={() => navigator.clipboard.writeText(c.code)} className="text-[10px] text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded">Copy</button>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.is_active?'Active':'Inactive'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium capitalize">{c.plan_tier}</span>
                </div>
                <p className="text-xs text-gray-500">{c.description||'No description'}</p>
              </div>
              <button onClick={() => toggle(c.id, !c.is_active)} className={`text-xs px-3 py-1 rounded-lg ${c.is_active?'text-red-600 border border-red-200':'text-green-600 border border-green-200'}`}>{c.is_active?'Deactivate':'Reactivate'}</button>
            </div>
            <div className="flex gap-6 text-xs text-gray-500"><span>Uses: <strong className="text-gray-700">{c.times_used}/{c.max_uses}</strong></span><span>Duration: <strong className="text-gray-700">{c.duration_days}d</strong></span><span>Expires: <strong className="text-gray-700">{c.expires_at?new Date(c.expires_at).toLocaleDateString('en-NG'):'Never'}</strong></span></div>
            {c.redemptions?.length > 0 && <div className="mt-3 pt-3 border-t border-gray-100"><h4 className="text-[10px] text-gray-400 uppercase mb-2">Redeemed ({c.redemptions.length})</h4>{c.redemptions.map((r:any) => <div key={r.id} className="flex justify-between text-xs mb-1"><span className="text-gray-700">{r.org?.name}</span><span className="text-gray-400">{new Date(r.redeemed_at).toLocaleDateString('en-NG')} · exp {new Date(r.access_expires_at).toLocaleDateString('en-NG')} · <span className={r.is_expired?'text-gray-400':'text-green-600'}>{r.is_expired?'Expired':'Active'}</span></span></div>)}</div>}
          </div>
        ))}
      </div>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:'rgba(0,0,0,0.4)',backdropFilter:'blur(4px)' }} onClick={() => setShow(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create access code</h3>
            <div className="space-y-3">
              <input type="text" value={f.code} onChange={e => setF({...f,code:e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,'')})} placeholder="e.g. BETA-WAVE2" maxLength={20} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono uppercase"/>
              <div className="grid grid-cols-2 gap-3">
                <select value={f.plan} onChange={e => setF({...f,plan:e.target.value})} className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white"><option value="beta">Beta (all)</option><option value="growth">Growth</option><option value="scale">Scale</option></select>
                <input type="number" value={f.days} onChange={e => setF({...f,days:e.target.value})} placeholder="Duration days" className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={f.uses} onChange={e => setF({...f,uses:e.target.value})} placeholder="Max uses" className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm"/>
                <input type="date" value={f.exp} onChange={e => setF({...f,exp:e.target.value})} className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm"/>
              </div>
              <input type="text" value={f.desc} onChange={e => setF({...f,desc:e.target.value})} placeholder="Internal note" className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm"/>
            </div>
            {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShow(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancel</button>
              <button onClick={create} disabled={saving||!f.code} className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50" style={{background:'#2b0548',color:'#e1b3ee'}}>{saving?'Creating...':'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
