// src/components/ui/OfflineIndicator.tsx
'use client'

import { useState, useEffect } from 'react'

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)
  const [pendingSync, setPendingSync] = useState(0)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})

      // Listen for sync completion messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'sync-complete') {
          setPendingSync(0)
          setShowBanner(true)
          setTimeout(() => setShowBanner(false), 3000)
        }
      })
    }

    // Monitor online/offline status
    function goOffline() { setIsOffline(true) }
    function goOnline() {
      setIsOffline(false)
      // Trigger sync of queued actions
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage('sync-offline')
      }
    }

    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!isOffline && !showBanner) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-xs font-medium transition-all ${
      isOffline ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'
    }`}>
      {isOffline ? (
        <span>You're offline. Changes will be saved and synced when you reconnect.</span>
      ) : (
        <span>Back online. {pendingSync > 0 ? `Syncing ${pendingSync} pending actions...` : 'All synced.'}</span>
      )}
    </div>
  )
}
