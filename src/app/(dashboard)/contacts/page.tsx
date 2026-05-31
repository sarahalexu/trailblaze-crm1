// src/app/(dashboard)/contacts/page.tsx
// FIXED: Added create contact button and form, proper onClick, birthday field

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Create form
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newWhatsapp, setNewWhatsapp] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newAccountId, setNewAccountId] = useState('')
  const [newBirthday, setNewBirthday] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('org_id').eq('auth_id', user.id).single()
    if (!profile) return

    const { data } = await supabase.from('contacts').select('*, account:accounts(id, name)').eq('org_id', profile.org_id).order('full_name')
    setContacts(data || [])

    const { data: accts } = await supabase.from('accounts').select('id, name').eq('org_id', profile.org_id).order('name')
    setAccounts(accts || [])

    setLoading(false)
  }

  async function createContact() {
    if (!newName.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('org_id').eq('auth_id', user.id).single()
    if (!profile) return

    try {
      await supabase.from('contacts').insert({
        org_id: profile.org_id,
        full_name: newName.trim(),
        email: newEmail.trim() || null,
        phone_number: newPhone.trim() || null,
        whatsapp_number: newWhatsapp.trim() || null,
        job_title: newTitle.trim() || null,
        role_type: newRole || null,
        account_id: newAccountId || null,
        date_of_birth: newBirthday || null,
      })

      setShowCreate(false)
      setNewName(''); setNewEmail(''); setNewPhone(''); setNewWhatsapp('')
      setNewTitle(''); setNewRole(''); setNewAccountId(''); setNewBirthday('')
      await load()
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const filtered = contacts.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.account?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.job_title || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{contacts.length} contact{contacts.length !== 1 ? 's' : ''} across all accounts</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>
          + New contact
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <h3 className="text-sm font-medium text-gray-900 mb-4">New contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Full name *</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="John Doe" autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="john@company.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone number</label>
              <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+234..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">WhatsApp number</label>
              <input type="tel" value={newWhatsapp} onChange={e => setNewWhatsapp(e.target.value)} placeholder="+234..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Job title</label>
              <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Marketing Manager"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role type</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="">Select role</option>
                <option value="decision_maker">Decision maker</option>
                <option value="champion">Champion</option>
                <option value="influencer">Influencer</option>
                <option value="end_user">End user</option>
                <option value="budget_holder">Budget holder</option>
                <option value="technical_evaluator">Technical evaluator</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Account</label>
              <select value={newAccountId} onChange={e => setNewAccountId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="">No account (standalone)</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Birthday</label>
              <input type="date" value={newBirthday} onChange={e => setNewBirthday(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={createContact} disabled={saving || !newName.trim()} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>
              {saving ? 'Creating...' : 'Create contact'}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..."
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <p className="text-2xl mb-2">{'\u{1F464}'}</p>
          <p className="text-sm text-gray-600 mb-1">{search ? 'No matching contacts.' : 'No contacts yet.'}</p>
          {!search && (
            <>
              <p className="text-xs text-gray-400 mb-4">Add contacts manually or import them via CSV from Settings.</p>
              <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>+ Add first contact</button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Account</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Role</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden lg:table-cell">Email</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden lg:table-cell">Phone</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(contact => (
                <tr key={contact.id} onClick={() => router.push(`/contacts/${contact.id}`)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: '#2b054815', color: '#5a1890' }}>
                        {contact.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{contact.full_name}</div>
                        {contact.job_title && <div className="text-xs text-gray-400">{contact.job_title}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    {contact.account ? (
                      <Link href={`/accounts/${contact.account.id}`} onClick={e => e.stopPropagation()} className="text-purple-700 hover:underline">{contact.account.name}</Link>
                    ) : <span className="text-gray-300">{'\u2014'}</span>}
                  </td>
                  <td className="py-3 px-4 text-gray-500 capitalize hidden md:table-cell">{(contact.role_type || '').replace('_', ' ')}</td>
                  <td className="py-3 px-4 text-gray-500 hidden lg:table-cell">{contact.email || <span className="text-gray-300">{'\u2014'}</span>}</td>
                  <td className="py-3 px-4 text-gray-500 hidden lg:table-cell">{contact.whatsapp_number || contact.phone_number || <span className="text-gray-300">{'\u2014'}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
