// src/app/(dashboard)/notifications/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
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

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setNotifications(data || [])
    setLoading(false)
  }

  async function markAsRead(id: string) {
    await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)

    loadNotifications()
  }

  async function markAllRead() {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) return

    const { data: profile } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_id', authUser.id)
      .single()

    if (!profile) return

    await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('org_id', profile.org_id)
      .eq('is_read', false)

    loadNotifications()
  }

  const typeIcons: Record<string, string> = {
    overdue_followup: '⏰',
    health_change: '💓',
    renewal_approaching: '📅',
    ai_alert: '🤖',
    team_mention: '👤',
    deal_won: '🎉',
    deal_lost: '😔',
    system: '⚙️',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div>
      </div>
    )
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-gray-900">
            Notifications
          </h1>

          <p className="text-sm text-gray-500 mt-0.5">
            {unreadCount} unread
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-3 py-1.5 text-xs text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-500">
          No notifications yet. You'll see alerts for at-risk accounts,
          renewals, and team activity here.
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`bg-white border rounded-lg p-4 flex gap-3 cursor-pointer transition-colors ${
                n.is_read
                  ? 'border-gray-200'
                  : 'border-purple-200 bg-purple-50/30'
              }`}
              onClick={() => !n.is_read && markAsRead(n.id)}
            >
              <div className="text-lg">
                {typeIcons[n.type] || '📌'}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm ${
                      n.is_read
                        ? 'text-gray-700'
                        : 'font-medium text-gray-900'
                    }`}
                  >
                    {n.title}
                  </span>

                  <span className="text-xs text-gray-400">
                    {new Date(n.created_at).toLocaleDateString('en-NG')}
                  </span>
                </div>

                {n.message && (
                  <p className="text-xs text-gray-500 mt-1">
                    {n.message}
                  </p>
                )}
              </div>

              {!n.is_read && (
                <div className="w-2 h-2 rounded-full bg-purple-600 flex-shrink-0 mt-2"></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}