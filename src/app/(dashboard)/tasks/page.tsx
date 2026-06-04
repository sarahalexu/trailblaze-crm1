// src/app/(dashboard)/tasks/page.tsx
// REDESIGNED: Cleaner layout, consistent with dashboard style

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Task {
  id: string; title: string; description: string | null; task_type: string
  status: string; priority: string; due_date: string | null; due_time: string | null
  account_id: string | null; contact_id: string | null
  account: { name: string } | null; contact: { full_name: string } | null
  created_at: string
}

type TabFilter = 'upcoming' | 'today' | 'overdue' | 'completed'

const TYPE_ICONS: Record<string, string> = { task: '\u{1F4CB}', call: '\u{1F4DE}', email: '\u2709', meeting: '\u{1F91D}', follow_up: '\u{1F514}' }

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabFilter>('upcoming')
  const [showCreate, setShowCreate] = useState(false)
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])
  const [allContacts, setAllContacts] = useState<{ id: string; full_name: string; account_id: string }[]>([])
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
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) return

    const { data: taskData } = await supabase.from('tasks')
      .select('*, account:accounts(name), contact:contacts(full_name)')
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

    try {
      await supabase.from('tasks').insert({
        org_id: profile.org_id, title: newTitle.trim(), description: newDescription.trim() || null,
        task_type: newType, priority: newPriority, due_date: newDueDate || null, due_time: newDueTime || null,
        account_id: newAccountId || null, contact_id: newContactId || null,
        assigned_to_user_id: profile.id, created_by_user_id: profile.id,
      })
    } catch (e) { console.error(e) }

    setNewTitle(''); setNewDescription(''); setNewType('task'); setNewPriority('medium')
    setNewDueDate(''); setNewDueTime(''); setNewAccountId(''); setNewContactId('')
    setShowCreate(false); setSaving(false); load()
  }

  async function toggleComplete(taskId: string, currentStatus: string) {
    await supabase.from('tasks').update({
      status: currentStatus === 'completed' ? 'pending' : 'completed',
      completed_at: currentStatus === 'completed' ? null : new Date().toISOString(),
    }).eq('id', taskId)
    load()
  }

  async function deleteTask(taskId: string) {
    await supabase.from('tasks').delete().eq('id', taskId)
    load()
  }

  function getFiltered(): Task[] {
    if (tab === 'today') return tasks.filter(t => t.status !== 'completed' && t.due_date === today)
    if (tab === 'overdue') return tasks.filter(t => t.status !== 'completed' && t.due_date && t.due_date < today)
    if (tab === 'completed') return tasks.filter(t => t.status === 'completed')
    return tasks.filter(t => t.status !== 'completed')
  }

  function getDueLabel(d: string | null): { text: string; style: string } {
    if (!d) return { text: 'No date', style: 'bg-gray-100 text-gray-500' }
    if (d < today) return { text: `${Math.abs(Math.floor((new Date(d + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000))}d overdue`, style: 'bg-red-50 text-red-700' }
    if (d === today) return { text: 'Today', style: 'bg-amber-50 text-amber-700' }
    const diff = Math.floor((new Date(d + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000)
    if (diff === 1) return { text: 'Tomorrow', style: 'bg-blue-50 text-blue-700' }
    if (diff < 7) return { text: new Date(d + 'T00:00:00').toLocaleDateString('en-NG', { weekday: 'short' }), style: 'bg-gray-100 text-gray-600' }
    return { text: new Date(d + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }), style: 'bg-gray-100 text-gray-600' }
  }

  const priorityBorder: Record<string, string> = { urgent: 'border-l-red-500', high: 'border-l-amber-500', medium: 'border-l-blue-400', low: 'border-l-gray-300' }
  const filtered = getFiltered()
  const todayCount = tasks.filter(t => t.status !== 'completed' && t.due_date === today).length
  const overdueCount = tasks.filter(t => t.status !== 'completed' && t.due_date && t.due_date < today).length

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {todayCount > 0 && `${todayCount} due today`}
            {todayCount > 0 && overdueCount > 0 && ' \u00B7 '}
            {overdueCount > 0 && <span className="text-red-500">{overdueCount} overdue</span>}
            {todayCount === 0 && overdueCount === 0 && 'You are all caught up'}
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>+ New task</button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <div className="space-y-3">
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="What needs to be done?" autoFocus
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select value={newType} onChange={e => setNewType(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="task">Task</option><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="follow_up">Follow-up</option>
              </select>
              <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
              <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="time" value={newDueTime} onChange={e => setNewDueTime(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={newAccountId} onChange={e => setNewAccountId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="">Link to account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={newContactId} onChange={e => setNewContactId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="">Link to contact</option>{(newAccountId ? allContacts.filter(c => c.account_id === newAccountId) : allContacts).map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Notes (optional)" rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <div className="flex gap-2">
              <button onClick={createTask} disabled={saving || !newTitle.trim()} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>{saving ? 'Creating...' : 'Create task'}</button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-4 w-fit">
        {([
          { key: 'upcoming' as TabFilter, label: 'Upcoming' },
          { key: 'today' as TabFilter, label: `Today${todayCount > 0 ? ` (${todayCount})` : ''}` },
          { key: 'overdue' as TabFilter, label: `Overdue${overdueCount > 0 ? ` (${overdueCount})` : ''}` },
          { key: 'completed' as TabFilter, label: 'Done' },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'} ${t.key === 'overdue' && overdueCount > 0 ? 'text-red-500' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
          <p className="text-2xl mb-2">{tab === 'completed' ? '\u{2705}' : tab === 'today' ? '\u{2600}\uFE0F' : '\u{1F4CB}'}</p>
          <p className="text-sm text-gray-600 mb-1">{tab === 'completed' ? 'No completed tasks yet' : tab === 'today' ? 'Nothing due today' : tab === 'overdue' ? 'Nothing overdue' : 'No tasks yet'}</p>
          {tab !== 'completed' && <button onClick={() => setShowCreate(true)} className="mt-3 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>Create a task</button>}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(task => {
            const due = getDueLabel(task.due_date)
            return (
              <div key={task.id} className={`bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3 border-l-[3px] ${priorityBorder[task.priority] || ''}`}>
                <button onClick={() => toggleComplete(task.id, task.status)}
                  className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${task.status === 'completed' ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 hover:border-purple-400'}`}>
                  {task.status === 'completed' && <span className="text-[10px]">{'\u2713'}</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs">{TYPE_ICONS[task.task_type] || '\u{1F4CB}'}</span>
                    <span className={`text-sm ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.title}</span>
                  </div>
                  {task.description && <p className="text-xs text-gray-500 ml-5 mb-1">{task.description}</p>}
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 ml-5 flex-wrap">
                    {task.account && <Link href={`/accounts/${task.account_id}`} className="text-purple-500 hover:underline">{task.account.name}</Link>}
                    {task.contact && <span>{'\u00B7'} {task.contact.full_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {due.text && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${due.style}`}>{due.text}</span>}
                  <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-400 text-xs p-1" title="Delete">{'\u2715'}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
