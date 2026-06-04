// src/components/portal/PortalAccessManager.tsx
// FIXED: Looks up CRM user ID from auth_id, shows errors properly

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PortalAccessManagerProps {
  accountId: string
  orgId: string
}

interface PortalLink {
  id: string
  contact_id: string
  contact_name: string
  access_token: string
  is_active: boolean
  last_accessed_at: string | null
  expires_at: string | null
  permissions: { view_health: boolean; view_interactions: boolean; view_playbooks: boolean; submit_feedback: boolean }
  created_at: string
}

export default function PortalAccessManager({ accountId, orgId }: PortalAccessManagerProps) {
  const supabase = createClient()
  const [links, setLinks] = useState<PortalLink[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [selectedContactId, setSelectedContactId] = useState('')
  const [permissions, setPermissions] = useState({ view_health: true, view_interactions: false, view_playbooks: false, submit_feedback: true })
  const [expiresIn, setExpiresIn] = useState('never')

  useEffect(() => { loadData() }, [accountId])

  async function loadData() {
    setLoading(true)
    const { data: accessData } = await supabase.from('portal_access').select('*, contacts(full_name)').eq('account_id', accountId).order('created_at', { ascending: false })
    setLinks((accessData || []).map((a: any) => ({ ...a, contact_name: a.contacts?.full_name || 'Unknown' })))

    const { data: contactData } = await supabase.from('contacts').select('id, full_name, email').eq('account_id', accountId).order('full_name')
    setContacts(contactData || [])
    setLoading(false)
  }

  async function createPortalLink() {
    if (!selectedContactId) return
    setCreating(true)
    setError('')

    try {
      // Get auth user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('Not logged in')

      // Look up CRM user ID (NOT the auth ID)
      const { data: crmUser } = await supabase.from('users').select('id').eq('auth_id', authUser.id).single()
      if (!crmUser) throw new Error('CRM user not found')

      let expiresAt = null
      if (expiresIn === '7d') expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      if (expiresIn === '30d') expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      if (expiresIn === '90d') expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

      const { error: insertError } = await supabase.from('portal_access').insert({
        org_id: orgId,
        account_id: accountId,
        contact_id: selectedContactId,
        is_active: true,
        expires_at: expiresAt,
        permissions,
        created_by_user_id: crmUser.id,  // CRM user ID, not auth ID
      })

      if (insertError) throw insertError

      setShowCreate(false)
      setSelectedContactId('')
      setPermissions({ view_health: true, view_interactions: false, view_playbooks: false, submit_feedback: true })
      setExpiresIn('never')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to create portal link')
      console.error('Portal link creation error:', err)
    } finally {
      setCreating(false)
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('portal_access').update({ is_active: !current }).eq('id', id)
    await loadData()
  }

  async function deleteLink(id: string) {
    if (!confirm('Delete this portal link?')) return
    await supabase.from('portal_access').delete().eq('id', id)
    await loadData()
  }

  function getPortalUrl(token: string) { return `https://crm.trailblazeafrica.com/portal/${token}` }

  function copyLink(token: string, id: string) {
    navigator.clipboard.writeText(getPortalUrl(token))
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) return <div className="py-8 text-center"><div className="w-6 h-6 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin mx-auto" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Client portal</h3>
          <p className="text-xs text-gray-500 mt-0.5">Give your clients a read-only view of their account status, health score, and playbook progress.</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>
          + Create portal link
        </button>
      </div>

      {error && <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200">{error}</div>}

      {showCreate && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Client contact *</label>
            <select value={selectedContactId} onChange={e => setSelectedContactId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">Select a contact...</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.email ? ` (${c.email})` : ''}</option>)}
            </select>
            {contacts.length === 0 && <p className="text-xs text-amber-600 mt-1">Add contacts to this account first.</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">What can the client see?</label>
            <div className="space-y-1.5">
              {[
                { key: 'view_health', label: 'Account health score (KEEP)' },
                { key: 'view_interactions', label: 'Recent activity' },
                { key: 'view_playbooks', label: 'Playbook progress' },
                { key: 'submit_feedback', label: 'Submit feedback' },
              ].map(perm => (
                <label key={perm.key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={(permissions as any)[perm.key]} onChange={e => setPermissions({ ...permissions, [perm.key]: e.target.checked })} className="rounded border-gray-300" />
                  {perm.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Link expires</label>
            <select value={expiresIn} onChange={e => setExpiresIn(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="never">Never</option>
              <option value="7d">In 7 days</option>
              <option value="30d">In 30 days</option>
              <option value="90d">In 90 days</option>
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={createPortalLink} disabled={creating || !selectedContactId} className="px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>
              {creating ? 'Creating...' : 'Create link'}
            </button>
            <button onClick={() => { setShowCreate(false); setError('') }} className="px-4 py-2 text-xs text-gray-500">Cancel</button>
          </div>
        </div>
      )}

      {links.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-2xl mb-2">{'\u{1F517}'}</p>
          <p className="text-sm text-gray-600 mb-1">No portal links yet</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">Create a portal link and share it with your client so they can check their account status anytime.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map(link => (
            <div key={link.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{link.contact_name}</p>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${link.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {link.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                  {link.last_accessed_at && <span>Viewed {new Date(link.last_accessed_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}</span>}
                  {link.expires_at && <span>Expires {new Date(link.expires_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                </div>
              </div>
              <button onClick={() => copyLink(link.access_token, link.id)} className="px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-purple-50" style={{ color: '#5a1890' }}>
                {copiedId === link.id ? 'Copied!' : 'Copy link'}
              </button>
              <button onClick={() => toggleActive(link.id, link.is_active)} className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700">{link.is_active ? 'Disable' : 'Enable'}</button>
              <button onClick={() => deleteLink(link.id)} className="px-2 py-1.5 text-xs text-red-400 hover:text-red-600">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
