// src/app/(dashboard)/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User, Organization } from '@/lib/types'

type SettingsTab = 'profile' | 'team' | 'security' | 'data' | 'danger'

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('profile')
  const [user, setUser] = useState<User | null>(null)
  const [org, setOrg] = useState<Organization | null>(null)
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Form states
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [orgName, setOrgName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Invite states
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'account_manager' | 'viewer'>('account_manager')
  const [inviting, setInviting] = useState(false)

  // Delete states
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .single()

    if (!profile) return
    setUser(profile)
    setFullName(profile.full_name)
    setPhone(profile.phone_number || '')

    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.org_id)
      .single()

    if (orgData) {
      setOrg(orgData)
      setOrgName(orgData.name)
    }

    const { data: team } = await supabase
      .from('users')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at')

    setTeamMembers(team || [])
    setLoading(false)
  }

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('users')
      .update({ full_name: fullName, phone_number: phone })
      .eq('id', user.id)

    if (org && orgName !== org.name) {
      await supabase
        .from('organizations')
        .update({ name: orgName })
        .eq('id', org.id)
    }

    setSaving(false)
    setMessage(error ? 'Failed to save.' : 'Settings saved.')
    if (!error) loadSettings()
  }

  async function inviteUser() {
    if (!inviteEmail || !org) return
    setInviting(true)

    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole, org_id: org.id }),
    })

    setInviting(false)
    if (res.ok) {
      setInviteEmail('')
      setMessage('Invitation sent.')
      loadSettings()
    } else {
      setMessage('Failed to send invitation.')
    }
  }

  async function removeTeamMember(memberId: string) {
    if (!confirm('Remove this team member? They will lose access immediately.')) return

    await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', memberId)

    loadSettings()
  }

  async function changeRole(memberId: string, newRole: string) {
    await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', memberId)

    loadSettings()
  }

  async function exportData(format: 'csv' | 'json') {
    setMessage('Preparing export...')
    const res = await fetch(`/api/data/export?format=${format}`)
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trailblaze-export-${new Date().toISOString().split('T')[0]}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      setMessage('Export downloaded.')
    } else {
      setMessage('Export failed.')
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== org?.name) return
    setDeleting(true)

    const res = await fetch('/api/account/delete', { method: 'DELETE' })
    if (res.ok) {
      await supabase.auth.signOut()
      router.push('/login?message=account-deleted')
    } else {
      setMessage('Failed to delete account. Please contact support.')
      setDeleting(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div>
      </div>
    )
  }

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'profile', label: 'Profile & workspace' },
    { key: 'team', label: 'Team members' },
    { key: 'security', label: 'Security' },
    { key: 'data', label: 'Data management' },
    { key: 'danger', label: 'Danger zone' },
  ]

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-medium text-gray-900 mb-6">Settings</h1>

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-sm">
          {message}
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-0 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? 'border-purple-700 text-purple-700 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* PROFILE TAB */}
      {tab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-4">Your profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Full name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input type="email" value={user?.email || ''} disabled
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-4">Workspace</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Organization name</label>
                <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Plan</label>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium capitalize" style={{ color: '#5a1890' }}>{org?.plan_tier}</span>
                  {org?.plan_tier === 'starter' && (
                    <a href="/settings/billing" className="text-xs text-purple-700 hover:underline">Upgrade</a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={saveProfile} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: '#2b0548', color: '#e1b3ee' }}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button onClick={handleLogout}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* TEAM TAB */}
      {tab === 'team' && (
        <div className="space-y-6">
          {/* Invite */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-4">Invite team member</h2>
            <div className="flex gap-3">
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="account_manager">Account manager</option>
                <option value="viewer">Viewer (read-only)</option>
              </select>
              <button onClick={inviteUser} disabled={inviting || !inviteEmail}
                className="px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: '#2b0548', color: '#e1b3ee' }}>
                {inviting ? 'Sending...' : 'Invite'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Admins can manage all accounts and settings. Account managers can manage their assigned accounts. Viewers have read-only access.
            </p>
          </div>

          {/* Team list */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-4">
              Team members ({teamMembers.filter(m => m.is_active).length}/{org?.max_users || 0} seats)
            </h2>
            <div className="space-y-3">
              {teamMembers.filter(m => m.is_active).map(member => (
                <div key={member.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium"
                      style={{ background: '#2b054815', color: '#5a1890' }}>
                      {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{member.full_name}</div>
                      <div className="text-xs text-gray-500">{member.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {member.id === user?.id ? (
                      <span className="text-xs text-gray-400">You</span>
                    ) : (
                      <>
                        <select value={member.role}
                          onChange={e => changeRole(member.id, e.target.value)}
                          className="text-xs px-2 py-1 border border-gray-200 rounded bg-white">
                          <option value="admin">Admin</option>
                          <option value="account_manager">Account manager</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button onClick={() => removeTeamMember(member.id)}
                          className="text-xs text-red-600 hover:underline">Remove</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECURITY TAB */}
      {tab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-4">Password</h2>
            <p className="text-sm text-gray-500 mb-3">Change your password. You'll be signed out of all other sessions.</p>
            <button onClick={async () => {
              const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '')
              setMessage(error ? 'Failed to send reset email.' : 'Password reset email sent. Check your inbox.')
            }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Send password reset email
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-4">Active sessions</h2>
            <p className="text-sm text-gray-500 mb-3">Sign out of all other browser sessions for security.</p>
            <button onClick={async () => {
              await supabase.auth.signOut({ scope: 'others' })
              setMessage('All other sessions signed out.')
            }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Sign out other sessions
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-2">Security overview</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Data encrypted in transit (TLS/SSL)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Data encrypted at rest (AES-256)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Row Level Security — organizations cannot see each other's data
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span> API keys and tokens encrypted before storage
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Full audit trail of all actions
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Rate limiting on all API endpoints
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DATA TAB */}
      {tab === 'data' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-2">Export your data</h2>
            <p className="text-sm text-gray-500 mb-4">Download all your accounts, contacts, interactions, and health scores. Your data is always yours.</p>
            <div className="flex gap-3">
              <button onClick={() => exportData('csv')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                Export as CSV
              </button>
              <button onClick={() => exportData('json')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                Export as JSON
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-2">Import data</h2>
            <p className="text-sm text-gray-500 mb-4">Import accounts and contacts from a CSV file or another CRM.</p>
            <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
              <input type="file" accept=".csv,.xlsx" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setMessage(`Importing ${file.name}... (import processing will be available in the next update)`)
                }} />
              Upload CSV file
            </label>
            <p className="text-xs text-gray-400 mt-2">Supported: CSV with columns for name, industry, email, phone, contract value.</p>
          </div>
        </div>
      )}

      {/* DANGER ZONE */}
      {tab === 'danger' && (
        <div className="space-y-6">
          <div className="bg-white border border-red-200 rounded-xl p-5">
            <h2 className="text-sm font-medium text-red-700 mb-2">Delete organization</h2>
            <p className="text-sm text-gray-500 mb-4">
              Permanently delete your organization and all associated data. This cannot be undone.
              All accounts, contacts, interactions, health scores, and playbook data will be permanently removed.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Type <span className="font-medium text-red-700">{org?.name}</span> to confirm
                </label>
                <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder={org?.name}
                  className="w-full px-3 py-2.5 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <button onClick={deleteAccount}
                disabled={deleteConfirm !== org?.name || deleting}
                className="px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {deleting ? 'Deleting...' : 'Permanently delete organization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
