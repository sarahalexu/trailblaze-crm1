// src/app/(dashboard)/settings/page.tsx
// Updated: Added Integrations tab that links to the integrations hub

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SettingsPage() {
  const [tab, setTab] = useState('profile')
  const [user, setUser] = useState<any>(null)
  const [org, setOrg] = useState<any>(null)
  const [team, setTeam] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  // Profile fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [birthday, setBirthday] = useState('')
  // Invite
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('account_manager')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    const { data: profile } = await supabase.from('users').select('*').eq('auth_id', authUser.id).single()
    if (!profile) return
    setUser(profile)
    setFullName(profile.full_name || '')
    setPhone(profile.phone_number || '')
    setBirthday(profile.date_of_birth || '')

    const { data: orgData } = await supabase.from('organizations').select('*').eq('id', profile.org_id).single()
    setOrg(orgData)

    const { data: teamData } = await supabase.from('users').select('*').eq('org_id', profile.org_id).order('created_at')
    setTeam(teamData || [])
    setLoading(false)
  }

  async function saveProfile() {
    setSaving(true)
    await supabase.from('users').update({ full_name: fullName, phone_number: phone || null, date_of_birth: birthday || null }).eq('id', user.id)
    setMsg('Profile saved'); setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function inviteMember() {
    if (!inviteEmail) return
    setSaving(true)
    const { error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail)
    if (error) setMsg('Invite failed: ' + error.message)
    else { setMsg('Invitation sent to ' + inviteEmail); setInviteEmail('') }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function exportData(format: 'csv' | 'json') {
    const { data: accounts } = await supabase.from('accounts').select('*').eq('org_id', user.org_id)
    const { data: contacts } = await supabase.from('contacts').select('*').eq('org_id', user.org_id)
    const { data: interactions } = await supabase.from('interactions').select('*').eq('org_id', user.org_id)

    const exportObj = { accounts, contacts, interactions, exported_at: new Date().toISOString() }

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `trailblaze-export-${Date.now()}.json`; a.click()
    } else {
      // CSV export for accounts
      const headers = ['name', 'industry', 'health_score_total', 'health_status', 'contract_value_annual', 'renewal_date', 'status']
      const csv = [headers.join(','), ...(accounts || []).map(a => headers.map(h => `"${(a as any)[h] || ''}"`).join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `trailblaze-accounts-${Date.now()}.csv`; a.click()
    }
  }

  async function deleteDemoData() {
    if (!confirm('Delete all demo data? This removes the 8 sample accounts and their contacts/interactions.')) return
    const demoNames = ['Paystack Technologies', 'Sterling Bank Digital', 'Flutterwave Inc', 'Kuda Microfinance', 'Andela Nigeria', 'Piggyvest Financial', 'Moniepoint MFB', 'Korapay Solutions']
    for (const name of demoNames) {
      await supabase.from('accounts').delete().eq('org_id', user.org_id).eq('name', name)
    }
    setMsg('Demo data deleted')
    setTimeout(() => setMsg(''), 3000)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" /></div>

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'team', label: 'Team' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'billing', label: 'Billing' },
    { id: 'data', label: 'Data' },
    { id: 'security', label: 'Security' },
  ].filter(t => user?.role === 'admin' || t.id === 'profile' || t.id === 'security')

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Settings</h1>

      {msg && <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">{msg}</div>}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => {
            if (t.id === 'billing') router.push('/settings/billing')
            else if (t.id === 'integrations') router.push('/settings/integrations')
            else setTab(t.id)
          }}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-purple-700 text-purple-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t.label}</button>
        ))}
      </div>

      {/* PROFILE TAB */}
      {tab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Your profile</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold" style={{ background: '#2b054815', color: '#5a1890' }}>
                  {fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{fullName}</div>
                  <div className="text-xs text-gray-500">{user?.email} · {user?.role}</div>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Full name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Phone number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234..." className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date of birth</label>
                  <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-400" />
                </div>
              </div>
              <button onClick={saveProfile} disabled={saving} className="px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>{saving ? 'Saving...' : 'Save changes'}</button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Organization</h3>
            <p className="text-sm text-gray-600">{org?.name}</p>
            <p className="text-xs text-gray-400 mt-1">Plan: <span className="capitalize font-medium" style={{ color: '#5a1890' }}>{org?.plan_tier}</span>{org?.access_expires_at && ` · Expires ${new Date(org.access_expires_at).toLocaleDateString('en-NG')}`}</p>
          </div>

          {/* Quick links to integrations */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Quick setup</h3>
            <Link href="/settings/import" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
  <div className="flex items-center gap-3">
    <span className="text-lg">📥</span>
    <div>
      <p className="text-sm font-medium text-gray-900">Import data</p>
      <p className="text-xs text-gray-500">Upload CSV files to import accounts and contacts</p>
    </div>
  </div>
  <span className="text-xs text-purple-600">Import →</span>
</Link>
            <div className="space-y-2">
              <Link href="/settings/integrations" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔗</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Connect Gmail & WhatsApp</p>
                    <p className="text-xs text-gray-500">Sync emails and messages automatically</p>
                  </div>
                </div>
                <span className="text-xs text-purple-600">Set up →</span>
              </Link>
              <Link href="/settings/billing" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-lg">💳</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Upgrade your plan</p>
                    <p className="text-xs text-gray-500">Unlock broadcasts, analytics, and more</p>
                  </div>
                </div>
                <span className="text-xs text-purple-600">View plans →</span>
              </Link>
            </div>
          </div>

          <button onClick={handleLogout} className="w-full py-2.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">Sign out</button>
        </div>
      )}

      {/* TEAM TAB */}
      {tab === 'team' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Team members ({team.length})</h3>
            <div className="space-y-3">
              {team.map(m => (
                <div key={m.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: '#2b054815', color: '#5a1890' }}>
                      {m.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{m.full_name}</div>
                      <div className="text-xs text-gray-500">{m.email}</div>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{m.role}</span>
                </div>
              ))}
            </div>
          </div>

          {user?.role === 'admin' && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Invite team member</h3>
              <div className="flex gap-2">
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-400" />
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="account_manager">Account Manager</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={inviteMember} disabled={saving} className="px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>Invite</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DATA TAB */}
      {tab === 'data' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Export your data</h3>
            <p className="text-xs text-gray-500 mb-4">Download all your accounts, contacts, and interactions.</p>
            <div className="flex gap-2">
              <button onClick={() => exportData('csv')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Export CSV</button>
              <button onClick={() => exportData('json')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Export JSON</button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Demo data</h3>
            <p className="text-xs text-gray-500 mb-4">If you loaded demo data when you started, you can remove it here.</p>
            <button onClick={deleteDemoData} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">Delete demo data</button>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-red-900 mb-2">Danger zone</h3>
            <p className="text-xs text-red-600 mb-4">Permanently delete your account and all data. This cannot be undone.</p>
            <button onClick={() => alert('Contact support@trailblazeafrica.com to delete your account.')} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Delete account</button>
          </div>
        </div>
      )}

      {/* SECURITY TAB */}
      {tab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Change password</h3>
            <p className="text-xs text-gray-500 mb-4">Use the password reset flow to change your password securely.</p>
            <button onClick={async () => {
              await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/auth/callback` })
              setMsg('Password reset email sent to ' + user.email)
              setTimeout(() => setMsg(''), 5000)
            }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Send password reset email</button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Session security</h3>
            <p className="text-xs text-gray-500">You will be automatically logged out after 24 hours of inactivity to protect your account.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Connected accounts</h3>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2"><span className="text-sm">Google</span></div>
              <span className="text-xs text-green-600">Connected</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
