// src/app/(dashboard)/settings/billing/callback/page.tsx
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function BillingCallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying')
  const reference = searchParams.get('reference') || searchParams.get('trxref')

  useEffect(() => {
    if (reference) {
      verifyPayment()
    } else {
      setStatus('failed')
    }
  }, [reference])

  async function verifyPayment() {
    try {
      const res = await fetch(`/api/billing/verify?reference=${reference}`)
      if (res.ok) {
        setStatus('success')
        // Redirect to settings after 3 seconds
        setTimeout(() => router.push('/settings/billing'), 3000)
      } else {
        setStatus('failed')
      }
    } catch {
      setStatus('failed')
    }
  }

  return (
    <div className="flex items-center justify-center h-64">
      {status === 'verifying' && (
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Verifying your payment...</p>
        </div>
      )}
      {status === 'success' && (
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl mx-auto mb-3">✓</div>
          <h2 className="text-lg font-medium text-gray-900 mb-1">Payment successful!</h2>
          <p className="text-sm text-gray-500 mb-4">Your plan has been upgraded. Redirecting...</p>
          <Link href="/settings/billing" className="text-sm text-purple-700 hover:underline">Go to billing</Link>
        </div>
      )}
      {status === 'failed' && (
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-2xl mx-auto mb-3">✕</div>
          <h2 className="text-lg font-medium text-gray-900 mb-1">Payment could not be verified</h2>
          <p className="text-sm text-gray-500 mb-4">If you were charged, please contact support. Your upgrade will be applied manually.</p>
          <Link href="/settings/billing" className="text-sm text-purple-700 hover:underline">Back to billing</Link>
        </div>
      )}
    </div>
  )
}

export default function BillingCallbackPage() {
  return (
    <Suspense>
      <BillingCallbackContent />
    </Suspense>
  )
}
