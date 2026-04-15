// src/app/forgot-password/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-semibold"
            style={{ background: '#2b0548' }}>TB</div>
          <span className="text-lg font-medium text-gray-900">TrailBlaze CRM</span>
        </div>

        {sent ? (
          <div>
            <h2 className="text-2xl font-medium text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-500 mb-6">We sent a password reset link to <span className="font-medium text-gray-900">{email}</span>. Click the link in the email to reset your password.</p>
            <Link href="/login" className="text-sm text-purple-700 hover:underline">Back to sign in</Link>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-medium text-gray-900 mb-1">Reset your password</h2>
            <p className="text-gray-500 mb-6">Enter your email and we'll send you a reset link.</p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: '#2b0548', color: '#e1b3ee' }}>
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Remember your password? <Link href="/login" className="font-medium text-purple-700 hover:underline">Sign in</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
