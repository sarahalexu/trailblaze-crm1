// src/components/email/EmailComposer.tsx
// Reusable email composer modal - send emails via Gmail from anywhere in the CRM
// Usage: <EmailComposer isOpen={true} onClose={() => {}} accountId="..." contactId="..." />

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface EmailComposerProps {
  isOpen: boolean
  onClose: () => void
  onSent?: () => void
  // Pre-fill fields
  toEmail?: string
  toName?: string
  accountId?: string
  contactId?: string
  // Reply mode
  replySubject?: string
  replyToMessageId?: string
  threadId?: string
  replyBody?: string
}

export default function EmailComposer({
  isOpen, onClose, onSent,
  toEmail, toName, accountId, contactId,
  replySubject, replyToMessageId, threadId, replyBody,
}: EmailComposerProps) {
  const [to, setTo] = useState(toEmail || '')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState(replySubject ? `Re: ${replySubject.replace(/^Re:\s*/i, '')}` : '')
  const [body, setBody] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null)
  const [gmailAddress, setGmailAddress] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      checkGmailConnection()
      setTo(toEmail || '')
      setSubject(replySubject ? `Re: ${replySubject.replace(/^Re:\s*/i, '')}` : '')
      setBody('')
      setSent(false)
      setError('')
    }
  }, [isOpen, toEmail, replySubject])

  async function checkGmailConnection() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!profile) return
    const { data: conn } = await supabase.from('gmail_connections').select('gmail_address').eq('user_id', profile.id).eq('is_active', true).single()
    setGmailConnected(!!conn)
    setGmailAddress(conn?.gmail_address || '')
  }

  async function handleSend() {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setError('Fill in all fields: recipient, subject, and message.')
      return
    }

    setSending(true)
    setError('')

    try {
      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          cc: cc.trim() || undefined,
          subject: subject.trim(),
          body: body.replace(/\n/g, '<br/>'),
          replyToMessageId: replyToMessageId || undefined,
          threadId: threadId || undefined,
          accountId: accountId || undefined,
          contactId: contactId || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send')
      }

      setSent(true)
      setTimeout(() => {
        onSent?.()
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl sm:mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {replyToMessageId ? 'Reply' : 'New email'}
            </h3>
            {gmailAddress && (
              <p className="text-xs text-gray-400">from {gmailAddress}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        {/* Gmail not connected */}
        {gmailConnected === false && (
          <div className="p-5 text-center">
            <p className="text-sm text-gray-600 mb-2">Connect Gmail to send emails from TrailBlaze CRM.</p>
            <a href="/settings/integrations" className="inline-block px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#2b0548' }}>
              Connect Gmail
            </a>
          </div>
        )}

        {/* Sent confirmation */}
        {sent && (
          <div className="p-8 text-center">
            <p className="text-2xl mb-2">{'\u2705'}</p>
            <p className="text-sm font-medium text-gray-900">Email sent</p>
            <p className="text-xs text-gray-400 mt-1">to {to}</p>
          </div>
        )}

        {/* Composer form */}
        {gmailConnected && !sent && (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="border-b border-gray-100">
                <div className="flex items-center px-5 py-2">
                  <span className="text-xs text-gray-400 w-8">To</span>
                  <input
                    type="email"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    placeholder="recipient@email.com"
                    className="flex-1 text-sm text-gray-900 border-0 outline-none bg-transparent placeholder-gray-300"
                  />
                  {!showCc && (
                    <button onClick={() => setShowCc(true)} className="text-xs text-gray-400 hover:text-gray-600">Cc</button>
                  )}
                </div>
              </div>

              {showCc && (
                <div className="border-b border-gray-100">
                  <div className="flex items-center px-5 py-2">
                    <span className="text-xs text-gray-400 w-8">Cc</span>
                    <input
                      type="email"
                      value={cc}
                      onChange={e => setCc(e.target.value)}
                      placeholder="cc@email.com"
                      className="flex-1 text-sm text-gray-900 border-0 outline-none bg-transparent placeholder-gray-300"
                    />
                  </div>
                </div>
              )}

              <div className="border-b border-gray-100">
                <div className="flex items-center px-5 py-2">
                  <span className="text-xs text-gray-400 w-8">Sub</span>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Subject"
                    className="flex-1 text-sm text-gray-900 border-0 outline-none bg-transparent placeholder-gray-300"
                  />
                </div>
              </div>

              <div className="px-5 py-3">
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={10}
                  className="w-full text-sm text-gray-700 border-0 outline-none resize-none bg-transparent placeholder-gray-300 leading-relaxed"
                />
              </div>
            </div>

            {/* Footer */}
            {error && (
              <div className="px-5 py-2 bg-red-50 text-red-600 text-xs">{error}</div>
            )}

            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
              <div className="text-xs text-gray-400">
                {toName && <span>Sending to {toName}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700">
                  Discard
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !to.trim() || !subject.trim() || !body.trim()}
                  className="px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ background: '#2b0548', color: '#e1b3ee' }}
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
