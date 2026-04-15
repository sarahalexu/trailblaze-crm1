// src/app/(dashboard)/snippets/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SnippetsPage() {
  const [snippets, setSnippets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [shortcut, setShortcut] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('general')
  const [channel, setChannel] = useState('any')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('org_id').eq('auth_id', user.id).single()
    if (!profile) return

    // Get org snippets + system defaults
    const { data } = await supabase.from('snippets')
      .select('*')
      .or(`org_id.eq.${profile.org_id},org_id.is.null`)
      .order('category').order('title')
    setSnippets(data || [])
    setLoading(false)
  }

  async function saveSnippet() {
    if (!title || !content) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) return

    if (editId) {
      await supabase.from('snippets').update({ title, shortcut: shortcut || null, content, category, channel }).eq('id', editId)
    } else {
      await supabase.from('snippets').insert({
        org_id: profile.org_id, title, shortcut: shortcut || null, content, category, channel,
        created_by_user_id: profile.id, is_shared: true,
      })
    }
    setSaving(false); setShowCreate(false); setEditId(null)
    setTitle(''); setShortcut(''); setContent(''); setCategory('general'); setChannel('any')
    load()
  }

  async function deleteSnippet(id: string) {
    if (!confirm('Delete this snippet?')) return
    await supabase.from('snippets').delete().eq('id', id)
    load()
  }

  function startEdit(s: any) {
    setEditId(s.id); setTitle(s.title); setShortcut(s.shortcut || '')
    setContent(s.content); setCategory(s.category); setChannel(s.channel)
    setShowCreate(true)
  }

  function copyContent(id: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const categories = [
    { value: 'general', label: 'General' }, { value: 'follow_up', label: 'Follow-up' },
    { value: 'onboarding', label: 'Onboarding' }, { value: 'renewal', label: 'Renewal' },
    { value: 'meeting', label: 'Meeting' }, { value: 'escalation', label: 'Escalation' },
  ]

  const tokens = ['{first_name}', '{company_name}', '{account_manager_name}', '{meeting_link}']

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div></div>

  // Group by category
  const grouped = categories.map(c => ({
    ...c,
    snippets: snippets.filter(s => s.category === c.value),
  })).filter(g => g.snippets.length > 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Snippets</h1>
          <p className="text-sm text-gray-500 mt-0.5">Reusable message templates. Copy and paste into any conversation or sequence.</p>
        </div>
        <button onClick={() => { setEditId(null); setTitle(''); setShortcut(''); setContent(''); setShowCreate(true) }}
          className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>+ New snippet</button>
      </div>

      {snippets.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <div className="text-3xl mb-3">✂️</div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">No snippets yet</h3>
          <p className="text-sm text-gray-500 mb-4">Save your common messages and templates for quick reuse.</p>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>Create first snippet</button>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(group => (
            <div key={group.value}>
              <h2 className="text-sm font-medium text-gray-900 mb-3">{group.label}</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {group.snippets.map(s => (
                  <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-900">{s.title}</h3>
                          {s.shortcut && <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded font-mono text-gray-500">{s.shortcut}</span>}
                          <span className="text-xs text-gray-400 capitalize">{s.channel === 'any' ? '' : s.channel}</span>
                        </div>
                        {!s.org_id && <span className="text-[10px] text-gray-400">System template</span>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => copyContent(s.id, s.content)} className="text-xs text-purple-700 hover:underline">
                          {copied === s.id ? '✓ Copied' : 'Copy'}
                        </button>
                        {s.org_id && <>
                          <button onClick={() => startEdit(s)} className="text-xs text-gray-500 hover:text-gray-700">Edit</button>
                          <button onClick={() => deleteSnippet(s.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                        </>}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-4">{s.content}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-gray-900 mb-4">{editId ? 'Edit snippet' : 'Create snippet'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Title *</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Quick check-in"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Shortcut</label>
                  <input type="text" value={shortcut} onChange={e => setShortcut(e.target.value)} placeholder="e.g. /checkin"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Best for</label>
                  <select value={channel} onChange={e => setChannel(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="any">Any channel</option>
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="call_notes">Call notes</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Content *</label>
                <textarea value={content} onChange={e => setContent(e.target.value)} rows={6}
                  placeholder="Write your template message here..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="text-xs text-gray-400">Insert:</span>
                  {tokens.map(t => (
                    <button key={t} onClick={() => setContent(prev => prev + t)}
                      className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded hover:bg-purple-100">{t}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowCreate(false); setEditId(null) }} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={saveSnippet} disabled={saving || !title || !content} className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>
                {saving ? 'Saving...' : editId ? 'Save changes' : 'Create snippet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
