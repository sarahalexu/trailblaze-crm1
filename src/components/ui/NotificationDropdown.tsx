// src/components/ui/NotificationDropdown.tsx
// Replaces the notification bell link in the header
// Shows dropdown with recent notifications + "View all" link
// Usage: Replace the bell <Link> in layout.tsx with <NotificationDropdown />

'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Icons from '@/components/ui/Icons'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  reference_type: string | null
  reference_id: string | null
  created_at: string
}

const TYPE_ICONS: Record<string, string> = {
  email_opened: '\u{1F4E7}',
  whatsapp_delivered: '\u{1F4AC}',
  whatsapp_read: '\u{1F4AC}',
  health_drop: '\u{1F6A8}',
  renewal_upcoming: '\u{1F4C5}',
  portal_feedback: '\u{2B50}',
  playbook_completed: '\u{2705}',
  task_due: '\u{1F514}',
  account_inactive: '\u{23F0}',
  deal_won: '\u{1F389}',
  deal_lost: '\u{1F614}',
  team_mention: '\u{1F465}',
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { load() }, [])

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Poll for new notifications every 30s
  useEffect(() => {
    const interval = setInterval(loadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadCount() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!profile) return
    const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('is_read', false)
    setUnreadCount(count || 0)
  }

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!profile) return

    const { data, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(8)

    setNotifications(data || [])
    setUnreadCount((data || []).filter(n => !n.is_read).length)
    setLoading(false)
  }

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!profile) return

    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', profile.id)
      .eq('is_read', false)

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  async function handleClick(notif: Notification) {
    // Mark as read
    if (!notif.is_read) {
      await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', notif.id)
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    // Navigate to reference
    if (notif.reference_type && notif.reference_id) {
      if (notif.reference_type === 'account') router.push(`/accounts/${notif.reference_id}`)
      else if (notif.reference_type === 'contact') router.push(`/contacts/${notif.reference_id}`)
      else if (notif.reference_type === 'deal') router.push(`/pipeline/sales`)
      else if (notif.reference_type === 'task') router.push(`/tasks`)
    }
    setIsOpen(false)
  }

  function formatTime(d: string): string {
    const date = new Date(d)
    const now = new Date()
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 7) return `${diffDay}d`
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) load() }}
        className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
      >
        <Icons.bell className="w-5 h-5 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium hover:underline" style={{ color: '#5a1890' }}>
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center"><div className="w-5 h-5 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin mx-auto" /></div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">You will be notified about email opens, task deadlines, health changes, and more.</p>
              </div>
            ) : (
              notifications.map(notif => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${!notif.is_read ? 'bg-purple-50/30' : ''}`}
                >
                  <span className="text-sm flex-shrink-0 mt-0.5">
                    {TYPE_ICONS[notif.type] || '\u{1F514}'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${!notif.is_read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{notif.message}</p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-[10px] text-gray-400">{formatTime(notif.created_at)}</span>
                    {!notif.is_read && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1" />}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 p-2">
            <button
              onClick={() => { router.push('/notifications'); setIsOpen(false) }}
              className="w-full py-2 text-center text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
              style={{ color: '#5a1890' }}
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
