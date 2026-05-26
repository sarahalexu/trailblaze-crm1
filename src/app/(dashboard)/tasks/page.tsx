// src/app/(dashboard)/tasks/page.tsx
// Task manager: create, view, complete tasks linked to accounts and contacts

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Task {
  id: string
  title: string
  description: string | null
  task_type: string
  status: string
  priority: string
  due_date: string | null
  due_time: string | null
  account_id: string | null
  contact_id: string | null
  account: { name: string } | null
  contact: { full_name: string } | null
  assigned_to: { full_name: string } | null
  created_at: string
}

type TabFilter = 'upcoming' | 'today' | 'overdue' | 'completed'

const TYPE_ICONS: Record<string, string> = {
  task: '\u{1F4CB}', call: '\u{1F4DE}', email: '\u{1F4E7}',
  meeting: '\u{1F91D}', follow_up: '\u{1F514}',
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'border-l-red-500 bg-red-50/30',
  high: 'border-l-amber-500',
  medium: 'border-l-blue-400',
  low: 'border-l-gray-300',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabFilter>('upcoming')
  const [showCreate, setShowCreate] = useState(false)
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])
  const [allContacts, setAllContacts] = useState<{ id: string; full_name: string; account_id: string }[]>([])

  // Create form
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState('task')
  const [newPriority, setNewPriority] = useState('medium')
  const [newDueDate, setNewDueDate] = useState('')
  const [newDueTime, setNewDueTime] = useState('')
  const [newAccountId, setNewAccountId] = useState('')
  const [newContactId, setNewContactId] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) return

    const { data: taskData } = await supabase
      .from('tasks')
      .select('*, account:accounts(name), contact:contacts(full_name), assigned_to:users!tasks_assigned_to_user_id_fkey(full_name)')
      .eq('org_id', profile.org_id)
      .order('due_date', { ascending: true, nullsFirst: false })

    setTasks(taskData || [])

    const { data: accts } = await supabase.from('accounts').select('id, name').eq('org_id', profile.org_id).order('name')
    setAccounts(accts || [])

    const { data: contacts } = await supabase.from('contacts').select('id, full_name, account_id').eq('org_id', profile.org_id).order('full_name')
    setAllContacts(contacts || [])

    setLoading(false)
  }

  async function createTask() {
    if (!newTitle.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) return

    await supabase.from('tasks').insert({
      org_id: profile.org_id,
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      task_type: newType,
      priority: newPriority,
      due_date: newDueDate || null,
      due_time: newDueTime || null,
      account_id: newAccountId || null,
      contact_id: newContactId || null,
      assigned_to_user_id: profile.id,
      created_by_user_id: profile.id,
    })

    setNewTitle(''); setNewDescription(''); setNewType('task'); setNewPriority('medium')
    setNewDueDate(''); setNewDueTime(''); setNewAccountId(''); setNewContactId('')
    setShowCreate(false)
    setSaving(false)
    load()
  }

  async function toggleComplete(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    await supabase.from('tasks').update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    }).eq('id', taskId)
    load()
  }

  async function deleteTask(taskId: string) {
    await supabase.from('tasks').delete().eq('id', taskId)
    load()
  }

  function getFiltered(): Task[] {
    const today = new Date().toISOString().split('T')[0]
    if (tab === 'today') return tasks.filter(t => t.status !== 'completed' && t.due_date === today)
    if (tab === 'overdue') return tasks.filter(t => t.status !== 'completed' && t.due_date && t.due_date < today)
    if (tab === 'completed') return tasks.filter(t => t.status === 'completed')
    // upcoming = all pending/future
    return tasks.filter(t => t.status !== 'completed')
  }

  const filtered = getFiltered()
  const today = new Date().toISOString().split('T')[0]
  const todayCount = tasks.filter(t => t.status !== 'completed' && t.due_date === today).length
  const overdueCount = tasks.filter(t => t.status !== 'completed' && t.due_date && t.due_date < today).length

  function formatDueDate(date: string | null): string {
    if (!date) return ''
    const d = new Date(date + 'T00:00:00')
    const diff = Math.floor((d.getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    if (diff === -1) return 'Yesterday'
    if (diff < -1) return `${Math.abs(diff)} days ago`
    if (diff < 7) return d.toLocaleDateString('en-NG', { weekday: 'short' })
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {todayCount > 0 && `${todayCount} due today`}
            {todayCount > 0 && overdueCount > 0 && ' \u00B7 '}
            {overdueCount > 0 && <span className="text-red-500">{overdueCount} overdue</span>}
            {todayCount === 0 && overdueCount === 0 && 'You are all caught up'}
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>
          + New task
        </button>
      </div>

      {/* Quick create */}
      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <div className="space-y-3">
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="What needs to be done?" autoFocus
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select value={newType} onChange={e => setNewType(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="task">{'\u{1F4CB}'} Task</option>
                <option value="call">{'\u{1F4DE}'} Call</option>
                <option value="email">{'\u{1F4E7}'} Email</option>
                <option value="meeting">{'\u{1F91D}'} Meeting</option>
                <option value="follow_up">{'\u{1F514}'} Follow-up</option>
              </select>
              <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="low">Low priority</option>
                <option value="medium">Medium</option>
                <option value="high">High priority</option>
                <option value="urgent">Urgent</option>
              </select>
              <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="time" value={newDueTime} onChange={e => setNewDueTime(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select value={newAccountId} onChange={e => setNewAccountId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="">Link to account (optional)</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={newContactId} onChange={e => setNewContactId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="">Link to contact (optional)</option>
                {(newAccountId ? allContacts.filter(c => c.account_id === newAccountId) : allContacts).map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>

            <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Notes (optional)" rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />

            <div className="flex gap-2">
              <button onClick={createTask} disabled={saving || !newTitle.trim()} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>
                {saving ? 'Creating...' : 'Create task'}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-4 w-fit">
        {([
          { key: 'upcoming' as const, label: 'Upcoming' },
          { key: 'today' as const, label: `Today${todayCount > 0 ? ` (${todayCount})` : ''}` },
          { key: 'overdue' as const, label: `Overdue${overdueCount > 0 ? ` (${overdueCount})` : ''}` },
          { key: 'completed' as const, label: 'Done' },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'} ${t.key === 'overdue' && overdueCount > 0 ? 'text-red-500' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
          <p className="text-2xl mb-2">{tab === 'completed' ? '\u{2705}' : tab === 'today' ? '\u{2600}\uFE0F' : '\u{1F4CB}'}</p>
          <p className="text-sm text-gray-600 mb-1">
            {tab === 'completed' ? 'No completed tasks yet' : tab === 'today' ? 'Nothing due today' : tab === 'overdue' ? 'Nothing overdue' : 'No tasks yet'}
          </p>
          {tab !== 'completed' && (
            <button onClick={() => setShowCreate(true)} className="mt-3 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>
              Create a task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(task => {
            const isOverdue = task.status !== 'completed' && task.due_date && task.due_date < today

            return (
              <div key={task.id} className={`bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3 border-l-[3px] ${PRIORITY_STYLES[task.priority] || ''}`}>
                {/* Checkbox */}
                <button onClick={() => toggleComplete(task.id, task.status)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${task.status === 'completed' ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 hover:border-purple-400'}`}>
                  {task.status === 'completed' && <span className="text-[10px]">{'\u2713'}</span>}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs">{TYPE_ICONS[task.task_type] || '\u{1F4CB}'}</span>
                    <span className={`text-sm ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}`}>
                      {task.title}
                    </span>
                  </div>
                  {task.description && <p className="text-xs text-gray-500 mb-1 ml-5">{task.description}</p>}
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 ml-5 flex-wrap">
                    {task.due_date && (
                      <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                        {formatDueDate(task.due_date)}{task.due_time ? ` at ${task.due_time.slice(0, 5)}` : ''}
                      </span>
                    )}
                    {task.account && <Link href={`/accounts/${task.account_id}`} className="text-purple-500 hover:underline">{task.account.name}</Link>}
                    {task.contact && <span>{'\u00B7'} {task.contact.full_name}</span>}
                  </div>
                </div>

                {/* Delete */}
                <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-400 text-xs p-1 flex-shrink-0" title="Delete">
                  {'\u2715'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
