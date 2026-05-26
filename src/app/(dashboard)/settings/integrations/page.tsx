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

  // Check for OAuth callback results
  const gmailStatus = searchParams.get('gmail')
  const connectedEmail = searchParams.get('email')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: profile } = await supabase
      .from('users')
      .select('id, org_id')
      .eq('auth_id', user.id)
      .single()

    if (!profile) return

    // Gmail connection
    const { data: gmail } = await supabase
      .from('gmail_connections')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .single()

    setGmailConnection(gmail)

    // WhatsApp config
    const { data: wa } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('org_id', profile.org_id)
      .eq('is_active', true)
      .single()

    setWhatsappConfig(wa)

    // API keys count
    const { count } = await supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', profile.org_id)
      .eq('is_active', true)

    setApiKeyCount(count || 0)

    setLoading(false)
  }

  async function disconnectGmail() {
    if (
      !confirm(
        'Disconnect Gmail? Synced emails will remain but no new emails will sync.'
      )
    )
      return

    if (gmailConnection) {
      await supabase
        .from('gmail_connections')
        .update({ is_active: false })
        .eq('id', gmailConnection.id)

      setGmailConnection(null)
    }
  }

  async function triggerSync() {
    setSyncing(true)
    setSyncMsg('')

    try {
      const res = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await res.json()

      setSyncMsg(`Synced ${data.synced} new emails`)
    } catch {
      setSyncMsg('Sync failed. Try again.')
    }

    setSyncing(false)

    setTimeout(() => setSyncMsg(''), 5000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Link href="/settings" className="hover:text-gray-600">
            Settings
          </Link>
          <span>/</span>
          <span className="text-gray-700">Integrations</span>
        </div>

        <h1 className="text-xl font-semibold text-gray-900">
          Integrations
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Connect your tools to sync emails, messages, and more.
        </p>
      </div>

      {/* Success/error banners from OAuth */}
      {gmailStatus === 'connected' && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          Gmail connected successfully
          {connectedEmail
            ? ` (${decodeURIComponent(connectedEmail)})`
            : ''}
          . Your emails are syncing now.
        </div>
      )}

      {gmailStatus === 'error' && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          Gmail connection failed. Please try again.
        </div>
      )}

      <div className="space-y-4">
        {/* Gmail */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"
                  />
                </svg>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Gmail
                </h3>

                <p className="text-xs text-gray-500 mt-0.5">
                  {gmailConnection
                    ? `Connected as ${gmailConnection.gmail_address}`
                    : 'Sync your emails automatically. See email threads on every account and contact.'}
                </p>

                {gmailConnection?.last_sync_at && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Last synced:{' '}
                    {new Date(
                      gmailConnection.last_sync_at
                    ).toLocaleString('en-NG')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {gmailConnection ? (
                <>
                  <button
                    onClick={triggerSync}
                    disabled={syncing}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {syncing ? 'Syncing...' : 'Sync now'}
                  </button>

                  <button
                    onClick={disconnectGmail}
                    className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <a
                  href="/api/gmail/connect"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: '#2b0548' }}
                >
                  Connect Gmail
                </a>
              )}
            </div>
          </div>

          {syncMsg && (
            <p className="mt-2 text-xs text-green-600">{syncMsg}</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
  <div className="flex items-start justify-between">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-xl">📥</div>
      <div>
        <h3 className="text-sm font-medium text-gray-900">Import Data</h3>
        <p className="text-xs text-gray-500 mt-0.5">Upload CSV files to import accounts and contacts from spreadsheets or other CRMs.</p>
      </div>
    </div>
    <Link href="/settings/import" className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex-shrink-0">
      Import CSV
    </Link>
  </div>
</div>
    </div>
  )
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" />
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  )
}