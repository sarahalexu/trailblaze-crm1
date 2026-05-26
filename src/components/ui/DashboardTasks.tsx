// src/components/ui/DashboardTasks.tsx
// Shows upcoming and overdue tasks on the dashboard
// Usage: <DashboardTasks />

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const TYPE_ICONS: Record<string, string> = {
  task: '\u{1F4CB}', call: '\u{1F4DE}', email: '\u{1F4E7}',
  meeting: '\u{1F91D}', follow_up: '\u{1F514}',
}

export default function DashboardTasks() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) return

    const { data } = await supabase
      .from('tasks')
      .select('*, account:accounts(name)')
      .eq('org_id', profile.org_id)
      .neq('status', 'completed')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(7)

    setTasks(data || [])
    setLoading(false)
  }

  async function toggleComplete(id: string) {
    await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  if (loading) return null
  if (tasks.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Upcoming tasks</h3>
        <Link href="/tasks" className="text-xs font-medium hover:underline" style={{ color: '#5a1890' }}>View all</Link>
      </div>

      <div className="space-y-1">
        {tasks.map(task => {
          const isOverdue = task.due_date && task.due_date < today
          return (
            <div key={task.id} className="flex items-center gap-2.5 py-1.5">
              <button onClick={() => toggleComplete(task.id)}
                className="w-4.5 h-4.5 rounded-full border-2 border-gray-300 flex-shrink-0 hover:border-purple-400 transition-colors" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px]">{TYPE_ICONS[task.task_type] || '\u{1F4CB}'}</span>
                  <span className="text-sm text-gray-900 truncate">{task.title}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {task.account && <span className="text-[10px] text-purple-500 truncate max-w-[80px]">{task.account.name}</span>}
                {task.due_date && (
                  <span className={`text-[10px] ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                    {task.due_date === today ? 'Today' : isOverdue ? 'Overdue' : new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
