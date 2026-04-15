// src/components/ui/CookieConsent.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true)

  useEffect(() => {
    // Check if consent was already given
    const consent = localStorage.getItem('tb_cookie_consent')
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  function acceptAll() {
    localStorage.setItem('tb_cookie_consent', JSON.stringify({ essential: true, analytics: true, timestamp: new Date().toISOString() }))
    setVisible(false)
    // Enable GA if configured
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', { analytics_storage: 'granted' })
    }
  }

  function acceptEssentialOnly() {
    localStorage.setItem('tb_cookie_consent', JSON.stringify({ essential: true, analytics: false, timestamp: new Date().toISOString() }))
    setVisible(false)
    // Disable GA
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', { analytics_storage: 'denied' })
    }
  }

  function savePreferences() {
    localStorage.setItem('tb_cookie_consent', JSON.stringify({ essential: true, analytics: analyticsEnabled, timestamp: new Date().toISOString() }))
    setVisible(false)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', { analytics_storage: analyticsEnabled ? 'granted' : 'denied' })
    }
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4" style={{ pointerEvents: 'none' }}>
      <div className="max-w-lg mx-auto sm:mx-4 bg-white border border-gray-200 rounded-xl shadow-lg p-5" style={{ pointerEvents: 'auto' }}>
        {!showPreferences ? (
          <>
            <div className="flex items-start gap-3 mb-4">
              <span className="text-lg flex-shrink-0 mt-0.5">🍪</span>
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">We value your privacy</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  We use essential cookies to keep you logged in and analytics cookies to understand how you use TrailBlaze CRM so we can improve it. We never sell your data or use advertising cookies.
                  {' '}<Link href="/legal/privacy" className="text-purple-700 hover:underline">Privacy policy</Link>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={acceptAll}
                className="px-4 py-2 rounded-lg text-xs font-medium"
                style={{ background: '#2b0548', color: '#e1b3ee' }}>
                Accept all
              </button>
              <button onClick={acceptEssentialOnly}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50">
                Essential only
              </button>
              <button onClick={() => setShowPreferences(true)}
                className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700">
                Manage preferences
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-sm font-medium text-gray-900 mb-4">Cookie preferences</h3>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <div className="text-sm font-medium text-gray-900">Essential cookies</div>
                  <div className="text-xs text-gray-500">Required for login, security, and basic functionality.</div>
                </div>
                <div className="text-xs text-gray-400 font-medium">Always on</div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-gray-900">Analytics cookies</div>
                  <div className="text-xs text-gray-500">Help us understand usage patterns to improve the platform.</div>
                </div>
                <button onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${analyticsEnabled ? 'bg-purple-700' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${analyticsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={savePreferences}
                className="px-4 py-2 rounded-lg text-xs font-medium"
                style={{ background: '#2b0548', color: '#e1b3ee' }}>
                Save preferences
              </button>
              <button onClick={() => setShowPreferences(false)}
                className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700">
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
