'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const INACTIVITY_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours in ms

export default function InactivityLogout() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    let timer: NodeJS.Timeout

    function resetTimer() {
      clearTimeout(timer)
      localStorage.setItem('tb_last_activity', Date.now().toString())
      timer = setTimeout(logout, INACTIVITY_TIMEOUT)
    }

    function logout() {
      supabase.auth.signOut().then(() => {
        router.push('/login?reason=inactive')
      })
    }

    // Check if already expired on page load
    const lastActivity = parseInt(localStorage.getItem('tb_last_activity') || Date.now().toString())
    if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
      logout()
      return
    }

    // Listen for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [])

  return null
}
