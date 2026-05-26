// src/app/(dashboard)/contacts/page.tsx
// FIXED: onClick properly inside <tr>, useRouter imported, clickable contact rows

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('org_id').eq('auth_id', user.id).single()
      if (!profile) return

      const { data } = await supabase
        .from('contacts')
        .select('*, account:accounts(id, name)')
        .eq('org_id', profile.org_id)
        .order('full_name')

      setContacts(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = contacts.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.account?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{contacts.length} contact{contacts.length !== 1 ? 's' : ''} across all accounts</p>
        </div>
      </div>

      <div className="mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..."
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <p className="text-2xl mb-2">{'\u{1F464}'}</p>
          <p className="text-sm text-gray-600 mb-1">{search ? 'No matching contacts.' : 'No contacts yet.'}</p>
          {!search && <p className="text-xs text-gray-400">Add contacts from an account page, or import them via CSV from Settings.</p>}
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
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden lg:table-cell">WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(contact => (
                <tr
                  key={contact.id}
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: '#2b054815', color: '#5a1890' }}>
                        {contact.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{contact.full_name}</div>
                        <div className="text-xs text-gray-400">{contact.job_title || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    {contact.account ? (
                      <Link href={`/accounts/${contact.account.id}`} onClick={e => e.stopPropagation()} className="text-purple-700 hover:underline">{contact.account.name}</Link>
                    ) : '\u2014'}
                  </td>
                  <td className="py-3 px-4 text-gray-500 capitalize hidden md:table-cell">{(contact.role_type || '').replace('_', ' ')}</td>
                  <td className="py-3 px-4 text-gray-500 hidden lg:table-cell">{contact.email || '\u2014'}</td>
                  <td className="py-3 px-4 text-gray-500 hidden lg:table-cell">{contact.whatsapp_number || contact.phone_number || '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
