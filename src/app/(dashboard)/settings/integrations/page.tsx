// src/app/(dashboard)/settings/integrations/page.tsx
// FIXED: All integrations listed - Gmail, WhatsApp, API Keys, SSO, White Label, Import

'use client'

import { Suspense, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function IntegrationsContent() {
  const [gmailConnection, setGmailConnection] = useState<any>(null)
  const [whatsappConfig, setWhatsappConfig] = useState<any>(null)
  const [apiKeyCount, setApiKeyCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const supabase = createClient()
  const searchParams = useSearchParams()

  const gmailStatus = searchParams.get('gmail')
  const connectedEmail = searchParams.get('email')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) return

    const { data: gmail } = await supabase.from('gmail_connections').select('*').eq('user_id', profile.id).eq('is_active', true).maybeSingle()
    setGmailConnection(gmail)

    const { data: wa } = await supabase.from('whatsapp_config').select('*').eq('org_id', profile.org_id).eq('is_active', true).maybeSingle()
    setWhatsappConfig(wa)

    const { count } = await supabase.from('api_keys').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id).eq('is_active', true)
    setApiKeyCount(count || 0)

    setLoading(false)
  }

  async function disconnectGmail() {
    if (!confirm('Disconnect Gmail? Synced emails will remain but no new emails will sync.')) return
    if (gmailConnection) {
      await supabase.from('gmail_connections').update({ is_active: false }).eq('id', gmailConnection.id)
      setGmailConnection(null)
    }
  }

  async function triggerSync() {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/gmail/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.json()
      setSyncMsg(`Synced ${data.synced} new emails`)
    } catch { setSyncMsg('Sync failed. Try again.') }
    setSyncing(false)
    setTimeout(() => setSyncMsg(''), 5000)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" /></div>

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Link href="/settings" className="hover:text-gray-600">Settings</Link>
          <span>/</span>
          <span className="text-gray-700">Integrations</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">Connect your tools to sync emails, messages, and more.</p>
      </div>

      {gmailStatus === 'connected' && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          Gmail connected successfully{connectedEmail ? ` (${decodeURIComponent(connectedEmail)})` : ''}. Your emails are syncing now.
        </div>
      )}
      {gmailStatus === 'error' && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          Gmail connection failed. Please try again.
        </div>
      )}

      {/* Section: Communication */}
      <div className="mb-3">
        <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium">Communication</h2>
      </div>

      <div className="space-y-3 mb-8">
        {/* Gmail */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#EA4335" d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"/></svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Gmail</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {gmailConnection
                    ? `Connected as ${gmailConnection.gmail_address}`
                    : 'Sync your emails automatically. See email threads on every account and contact.'}
                </p>
                {gmailConnection?.last_sync_at && (
                  <p className="text-xs text-gray-400 mt-0.5">Last synced: {new Date(gmailConnection.last_sync_at).toLocaleString('en-NG')}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {gmailConnection ? (
                <>
                  <button onClick={triggerSync} disabled={syncing} className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    {syncing ? 'Syncing...' : 'Sync now'}
                  </button>
                  <button onClick={disconnectGmail} className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg">Disconnect</button>
                </>
              ) : (
                <a href="/api/gmail/connect" className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#2b0548' }}>Connect Gmail</a>
              )}
            </div>
          </div>
          {syncMsg && <p className="mt-2 text-xs text-green-600">{syncMsg}</p>}
        </div>

        {/* WhatsApp */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">WhatsApp Business</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {whatsappConfig
                    ? 'Connected and active'
                    : 'Connect your WhatsApp Business API to send and receive messages from the CRM.'}
                </p>
              </div>
            </div>
            <Link href="/settings/whatsapp"
              className={`px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0 ${whatsappConfig ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'text-white'}`}
              style={whatsappConfig ? {} : { background: '#2b0548' }}>
              {whatsappConfig ? 'Settings' : 'Connect WhatsApp'}
            </Link>
          </div>
        </div>
      </div>

      {/* Section: Developer */}
      <div className="mb-3">
        <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium">Developer</h2>
      </div>

      <div className="space-y-3 mb-8">
        {/* API Access */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-xl">{'\u{1F511}'}</div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">REST API</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {apiKeyCount > 0
                    ? `${apiKeyCount} active API key${apiKeyCount > 1 ? 's' : ''}`
                    : 'Create API keys to integrate with Zapier, custom dashboards, or other tools.'}
                </p>
              </div>
            </div>
            <Link href="/settings/api-keys" className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex-shrink-0">
              {apiKeyCount > 0 ? 'Manage keys' : 'Create API key'}
            </Link>
          </div>
        </div>
      </div>

      {/* Section: Enterprise */}
      <div className="mb-3">
        <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium">Enterprise</h2>
      </div>

      <div className="space-y-3 mb-8">
        {/* SSO */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl">{'\u{1F6E1}\uFE0F'}</div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Single Sign-On (SSO)</h3>
                <p className="text-xs text-gray-500 mt-0.5">Configure SAML or OIDC for your team. Enterprise plan.</p>
              </div>
            </div>
            <Link href="/settings/sso" className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex-shrink-0">Configure</Link>
          </div>
        </div>

        {/* White Label */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center text-xl">{'\u{1F3A8}'}</div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">White Label</h3>
                <p className="text-xs text-gray-500 mt-0.5">Custom branding, colors, domain, and email sender. Enterprise plan.</p>
              </div>
            </div>
            <Link href="/settings/white-label" className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex-shrink-0">Customize</Link>
          </div>
        </div>
      </div>

      {/* Section: Data */}
      <div className="mb-3">
        <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium">Data</h2>
      </div>

      <div className="space-y-3">
        {/* Import */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-xl">{'\u{1F4E5}'}</div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Import Data</h3>
                <p className="text-xs text-gray-500 mt-0.5">Upload CSV files to import accounts and contacts from spreadsheets or other CRMs.</p>
              </div>
            </div>
            <Link href="/settings/import" className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex-shrink-0">Import CSV</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" /></div>}>
      <IntegrationsContent />
    </Suspense>
  )
}
