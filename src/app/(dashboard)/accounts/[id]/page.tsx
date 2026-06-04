// src/app/(dashboard)/accounts/[id]/page.tsx
// COMPLETE: All tabs wired - Timeline, Contacts, Playbooks, Stakeholders, Portal, Health
// Includes: Email composer, task creation, AI panel, KEEP scoring

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Account, Contact, Interaction } from '@/lib/types'
import Link from 'next/link'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import { useParams } from 'next/navigation'
import Icons from '@/components/ui/Icons'
import UnifiedTimeline from '@/components/timeline/UnifiedTimeline'
import EmailComposer from '@/components/email/EmailComposer'
import StakeholderMap from '@/components/stakeholder/StakeholderMap'
import PortalAccessManager from '@/components/portal/PortalAccessManager'

type TabKey = 'timeline' | 'contacts' | 'playbooks' | 'stakeholders' | 'portal' | 'health'

export default function AccountDetailPage() {
  const { id } = useParams()
  const [account, setAccount] = useState<Account | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [playbooks, setPlaybooks] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [healthHistory, setHealthHistory] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('timeline')
  const [loading, setLoading] = useState(true)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [showInteractionModal, setShowInteractionModal] = useState(false)
  const [showPlaybookModal, setShowPlaybookModal] = useState(false)
  const [showEmailComposer, setShowEmailComposer] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [keepScores, setKeepScores] = useState({ k: 0, e: 0, ex: 0, p: 0 })
  const { check, UpgradeModal } = usePlanLimits()

  // Interaction form
  const [intChannel, setIntChannel] = useState('call')
  const [intDirection, setIntDirection] = useState('outbound')
  const [intSubject, setIntSubject] = useState('')
  const [intContent, setIntContent] = useState('')
  const [intFollowUp, setIntFollowUp] = useState(false)
  const [intFollowUpDate, setIntFollowUpDate] = useState('')
  const [intContactId, setIntContactId] = useState('')

  // Task form
  const [taskTitle, setTaskTitle] = useState('')
  const [taskType, setTaskType] = useState('follow_up')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskContactId, setTaskContactId] = useState('')

  const [saving, setSaving] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAction, setAiAction] = useState('')
  const [showAiPanel, setShowAiPanel] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadAccount() }, [id])

  async function loadAccount() {
    const { data: accountData } = await supabase
      .from('accounts')
      .select('*, assigned_user:users!accounts_assigned_user_id_fkey(id, full_name, avatar_url), stage:pipeline_stages!accounts_stage_id_fkey(id, name, color)')
      .eq('id', id).single()
    if (accountData) {
      setAccount(accountData)
      setKeepScores({ k: accountData.health_score_know, e: accountData.health_score_engage, ex: accountData.health_score_exceed, p: accountData.health_score_prevent })
    }

    const { data: contactsData } = await supabase.from('contacts').select('*').eq('account_id', id).order('is_primary', { ascending: false })
    setContacts(contactsData || [])

    const { data: playbooksData } = await supabase.from('playbooks').select('*, steps:playbook_steps(*)').eq('is_active', true).or('is_system_default.eq.true')
    setPlaybooks((playbooksData || []).map(p => ({ ...p, steps: (p.steps || []).sort((a: any, b: any) => a.step_number - b.step_number) })))

    const { data: assignData } = await supabase.from('playbook_assignments')
      .select('*, playbook:playbooks(name, category), progress:playbook_step_progress(*, step:playbook_steps(title, step_number))')
      .eq('account_id', id).order('created_at', { ascending: false })
    setAssignments(assignData || [])

    const { data: historyData } = await supabase.from('health_score_history')
      .select('*, scored_by:users(full_name)')
      .eq('account_id', id).order('scored_at', { ascending: false }).limit(20)
    setHealthHistory(historyData || [])

    setLoading(false)
  }

  async function updateHealthScore() {
    if (!account) return
    setSaving(true)
    await supabase.from('accounts').update({
      health_score_know: keepScores.k, health_score_engage: keepScores.e,
      health_score_exceed: keepScores.ex, health_score_prevent: keepScores.p,
    }).eq('id', account.id)

    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', authUser?.id).single()
    if (profile) {
      await supabase.from('health_score_history').insert({
        account_id: account.id, org_id: profile.org_id, scored_by_user_id: profile.id,
        score_know: keepScores.k, score_engage: keepScores.e, score_exceed: keepScores.ex, score_prevent: keepScores.p,
        scoring_method: 'manual',
      })
    }
    setSaving(false); setShowScoreModal(false); loadAccount()
  }

  async function logInteraction() {
    if (!account || !intSubject) return
    setSaving(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', authUser?.id).single()
    if (!profile) return

    await supabase.from('interactions').insert({
      account_id: account.id, org_id: profile.org_id, user_id: profile.id,
      channel: intChannel, direction: intDirection, subject: intSubject, content: intContent,
      contact_id: intContactId || null, follow_up_required: intFollowUp, follow_up_date: intFollowUpDate || null,
    })

    setSaving(false); setShowInteractionModal(false)
    setIntSubject(''); setIntContent(''); setIntFollowUp(false); setIntFollowUpDate(''); setIntContactId('')
    loadAccount()
  }

  async function createTask() {
    if (!account || !taskTitle.trim()) return
    setSaving(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', authUser?.id).single()
    if (!profile) return

    await supabase.from('tasks').insert({
      org_id: profile.org_id, title: taskTitle.trim(), task_type: taskType,
      due_date: taskDueDate || null, account_id: account.id,
      contact_id: taskContactId || null,
      assigned_to_user_id: profile.id, created_by_user_id: profile.id,
    })

    setSaving(false); setShowTaskModal(false)
    setTaskTitle(''); setTaskType('follow_up'); setTaskDueDate(''); setTaskContactId('')
  }

  async function activatePlaybook(playbookId: string) {
    if (!account) return
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', authUser?.id).single()
    if (!profile) return
    const playbook = playbooks.find(p => p.id === playbookId)
    if (!playbook) return

    const { data: assignment } = await supabase.from('playbook_assignments').insert({
      playbook_id: playbookId, account_id: account.id, org_id: profile.org_id, assigned_by_user_id: profile.id,
    }).select().single()

    if (assignment && playbook.steps) {
      await supabase.from('playbook_step_progress').insert(
        playbook.steps.map((step: any) => ({ assignment_id: assignment.id, step_id: step.id, status: 'pending' }))
      )
    }
    setShowPlaybookModal(false); loadAccount()
  }

  async function updateStepProgress(progressId: string, newStatus: string) {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('users').select('id').eq('auth_id', authUser?.id).single()
    await supabase.from('playbook_step_progress').update({
      status: newStatus, completed_by_user_id: newStatus === 'completed' ? profile?.id : null,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    }).eq('id', progressId)

    const assignment = assignments.find(a => a.progress?.some((p: any) => p.id === progressId))
    if (assignment) {
      const allDone = assignment.progress.every((p: any) => p.id === progressId ? newStatus === 'completed' || newStatus === 'skipped' : p.status === 'completed' || p.status === 'skipped')
      if (allDone) await supabase.from('playbook_assignments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', assignment.id)
    }
    loadAccount()
  }

  function formatNaira(amount?: number): string {
    if (!amount) return '\u2014'
    if (amount >= 1000000) return '\u20A6' + (amount / 1000000).toFixed(1) + 'M'
    return '\u20A6' + amount.toLocaleString()
  }

  async function runAI(action: string) {
    if (!check('use_ai')) return
    setAiLoading(true); setAiAction(action); setShowAiPanel(true); setAiResult('')
    try {
      const res = await fetch('/api/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: id, action }) })
      const data = await res.json()
      setAiResult(data.result || data.error || 'Something went wrong.')
    } catch { setAiResult('Failed to connect to AI service.') }
    setAiLoading(false)
  }

  function formatDate(d?: string): string { return d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '\u2014' }

  function formatAIText(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
      if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>
      return part
    })
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" /></div>
  if (!account) return <div className="text-center py-16 text-gray-500">Account not found.</div>

  const total = account.health_score_total
  const primaryContact = contacts.find(c => c.is_primary) || contacts[0]

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/accounts" className="hover:text-gray-600">Accounts</Link><span>/</span><span className="text-gray-700">{account.name}</span>
      </div>

      {/* Account header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-xl font-medium text-gray-900">{account.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${account.health_status === 'healthy' ? 'bg-green-100 text-green-800' : account.health_status === 'at_risk' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                {account.health_status === 'at_risk' ? 'At risk' : account.health_status}
              </span>
              {account.stage && <span className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: account.stage.color + '30', color: account.stage.color }}>{account.stage.name}</span>}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
              {account.industry && <span>{account.industry}</span>}
              {account.assigned_user && <span>Managed by {account.assigned_user.full_name}</span>}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => runAI('risk_analysis')} className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
              <Icons.ai className="w-4 h-4" /> Risk analysis
            </button>
            <button onClick={() => runAI('next_action')} className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
              {'\u{1F4A1}'} Suggest action
            </button>
            <button onClick={() => runAI('draft_message')} className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
  {'\u{270F}\uFE0F'} AI draft message
</button>
            <button onClick={() => setShowTaskModal(true)} className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
              {'\u{1F4CB}'} Add task
            </button>
            <button onClick={() => setShowScoreModal(true)} className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
              <Icons.heart className="w-4 h-4" /> Update KEEP
            </button>
            <button onClick={() => setShowInteractionModal(true)} className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5" style={{ background: '#2b0548', color: '#e1b3ee' }}>
              <Icons.plus className="w-4 h-4" /> Log interaction
            </button>
            <button onClick={() => setShowEmailComposer(true)}
  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
  📧 Send email
</button>
          </div>
        </div>

        {/* KEEP display */}
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-1 bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Total score</div>
            <div className={`text-3xl font-medium ${total >= 15 ? 'text-green-700' : total >= 10 ? 'text-amber-700' : 'text-red-700'}`}>{total}<span className="text-sm text-gray-400">/20</span></div>
          </div>
          {[{ l: 'Know', s: account.health_score_know, c: '#5a1890' }, { l: 'Engage', s: account.health_score_engage, c: '#00adef' }, { l: 'Exceed', s: account.health_score_exceed, c: '#c9a54e' }, { l: 'Prevent', s: account.health_score_prevent, c: '#1D9E75' }].map(d => (
            <div key={d.l} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2"><span className="text-xs text-gray-500">{d.l}</span><span className="text-sm font-medium" style={{ color: d.c }}>{d.s}/5</span></div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${d.s * 20}%`, background: d.c }} /></div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">Contract:</span> <span className="font-medium">{formatNaira(account.contract_value_annual)}/yr</span></div>
          <div><span className="text-gray-500">Start:</span> <span className="font-medium">{formatDate(account.contract_start_date)}</span></div>
          <div><span className="text-gray-500">Renewal:</span> <span className="font-medium">{formatDate(account.renewal_date)}</span></div>
          <div><span className="text-gray-500">Last contact:</span> <span className="font-medium">{formatDate(account.last_interaction_at)}</span></div>
        </div>
        {account.notes && <div className="mt-3 pt-3 border-t border-gray-100"><p className="text-sm text-gray-600">{account.notes}</p></div>}
      </div>

      {/* AI Result Panel */}
      {showAiPanel && (
        <div className="bg-white border border-purple-200 rounded-xl mb-6">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">{'\u{1F916}'}</span>
              <h3 className="text-sm font-medium text-gray-900">{aiAction === 'risk_analysis' ? 'Risk Analysis' : aiAction === 'draft_message' ? 'Draft Message' : 'Suggested Next Action'}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">AI</span>
            </div>
            <button onClick={() => setShowAiPanel(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
          </div>
          <div className="px-5 pb-5">
            {aiLoading ? (
              <div className="flex items-center gap-3 py-4"><div className="w-5 h-5 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin" /><span className="text-sm text-gray-500">Analyzing {account.name}...</span></div>
            ) : (
<div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words max-h-[500px] overflow-y-auto">
{aiResult.split('\n').map((line, idx) => {
                  const t = line.trim()
                  if (!t) return <br key={idx} />
                  if (t.startsWith('### ')) return <h4 key={idx} className="font-semibold text-gray-900 mt-3 mb-1 text-sm">{t.slice(4)}</h4>
                  if (t.startsWith('## ')) return <h3 key={idx} className="font-semibold text-gray-900 mt-3 mb-1 text-sm">{t.slice(3)}</h3>
                  if (t.startsWith('- ') || t.startsWith('* ')) return <div key={idx} className="flex gap-2 ml-1 my-0.5"><span className="text-purple-500 flex-shrink-0">{'\u2022'}</span><span>{formatAIText(t.slice(2))}</span></div>
                  const numMatch = t.match(/^(\d+)\.\s(.+)/)
                  if (numMatch) return <div key={idx} className="flex gap-2 ml-1 my-0.5"><span className="text-purple-500 font-medium flex-shrink-0">{numMatch[1]}.</span><span>{formatAIText(numMatch[2])}</span></div>
                  return <p key={idx} className="my-0.5">{formatAIText(t)}</p>
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-5 overflow-x-auto">
        {([
          { key: 'timeline' as TabKey, label: 'Timeline' },
          { key: 'contacts' as TabKey, label: `Contacts (${contacts.length})` },
          { key: 'playbooks' as TabKey, label: `Playbooks (${assignments.filter(a => a.status === 'in_progress').length})` },
          { key: 'stakeholders' as TabKey, label: 'Stakeholders' },
          { key: 'portal' as TabKey, label: 'Client portal' },
          { key: 'health' as TabKey, label: 'Health history' },
        ]).map(tab => (
          <button key={tab.key} onClick={() => {
            // Paywall Scale features
            if (tab.key === 'stakeholders' && !check('stakeholder_map')) return
            if (tab.key === 'portal' && !check('client_portal')) return
            setActiveTab(tab.key)
          }} className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key ? 'border-purple-700 text-purple-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
            {(tab.key === 'stakeholders' || tab.key === 'portal') && <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-purple-100 text-purple-600">Scale</span>}
          </button>
        ))}
      </div>

      {/* TIMELINE TAB */}
      {activeTab === 'timeline' && (
        <UnifiedTimeline accountId={id as string} contacts={contacts.map(c => ({ id: c.id, full_name: c.full_name, email: c.email }))} />
      )}

      {/* CONTACTS TAB */}
      {activeTab === 'contacts' && (
        <div className="space-y-3">
          {contacts.length === 0 ? <div className="text-center py-12 text-sm text-gray-500">No contacts added yet.</div> :
            contacts.map(c => (
              <Link key={c.id} href={`/contacts/${c.id}`} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4 hover:border-gray-300 transition-colors block">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium" style={{ background: '#2b054815', color: '#5a1890' }}>
                  {c.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{c.full_name}</span>
                    {c.is_primary && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Primary</span>}
                    <span className="text-xs text-gray-400 capitalize">{(c.role_type || '').replace('_', ' ')}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {c.job_title && <span>{c.job_title}</span>}
                    {c.email && <span> {'\u00B7'} {c.email}</span>}
                    {c.whatsapp_number && <span> {'\u00B7'} {c.whatsapp_number}</span>}
                  </div>
                </div>
              </Link>
            ))}
        </div>
      )}

      {/* PLAYBOOKS TAB */}
      {activeTab === 'playbooks' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Active playbooks</h3>
            <button onClick={() => setShowPlaybookModal(true)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>+ Activate playbook</button>
          </div>
          {assignments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-2xl mb-2">{'\u{1F4D6}'}</p>
              <p className="text-sm text-gray-600 mb-1">No playbooks running on this account</p>
              <p className="text-xs text-gray-400 mb-4">Playbooks guide you through step-by-step workflows like onboarding, renewal prep, or recovery.</p>
              <button onClick={() => setShowPlaybookModal(true)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>Activate a playbook</button>
            </div>
          ) : assignments.map(a => {
            const progress = (a.progress || []).sort((x: any, y: any) => (x.step?.step_number || 0) - (y.step?.step_number || 0))
            const completed = progress.filter((p: any) => p.status === 'completed' || p.status === 'skipped').length
            const pct = progress.length > 0 ? Math.round((completed / progress.length) * 100) : 0
            return (
              <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div><div className="text-sm font-medium text-gray-900">{a.playbook?.name}</div><div className="text-xs text-gray-500">Started {formatDate(a.started_at)}</div></div>
                  <div className="text-sm font-medium" style={{ color: '#5a1890' }}>{pct}%</div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#5a1890' }} /></div>
                <div className="space-y-2">
                  {progress.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <button onClick={() => updateStepProgress(p.id, p.status === 'completed' ? 'pending' : 'completed')}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${p.status === 'completed' ? 'border-green-500 bg-green-500 text-white' : p.status === 'skipped' ? 'border-gray-300 bg-gray-100' : 'border-gray-300 hover:border-purple-400'}`}>
                        {p.status === 'completed' && <span className="text-xs">{'\u2713'}</span>}
                      </button>
                      <div className="flex-1"><div className={`text-sm ${p.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{p.step?.title || 'Step'}</div></div>
                      {p.status !== 'completed' && p.status !== 'skipped' && <button onClick={() => updateStepProgress(p.id, 'skipped')} className="text-xs text-gray-400 hover:text-gray-600">Skip</button>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* STAKEHOLDERS TAB */}
      {activeTab === 'stakeholders' && account && (
        <StakeholderMap accountId={account.id} orgId={account.org_id} />
      )}

      {/* CLIENT PORTAL TAB */}
      {activeTab === 'portal' && account && (
        <PortalAccessManager accountId={account.id} orgId={account.org_id} />
      )}

      {/* HEALTH HISTORY TAB */}
      {activeTab === 'health' && (
        <div>
          {healthHistory.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-2xl mb-2">{'\u{1F4C8}'}</p>
              <p className="text-sm text-gray-600 mb-1">No health score history yet</p>
              <p className="text-xs text-gray-400 mb-4">Score this account using the KEEP framework to start tracking changes over time.</p>
              <button onClick={() => setShowScoreModal(true)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>Score this account</button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">K</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">E</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">E</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">P</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Total</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Scored by</th>
                </tr></thead>
                <tbody>
                  {healthHistory.map(h => (
                    <tr key={h.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-500">{formatDate(h.scored_at)}</td>
                      <td className="py-3 px-4" style={{ color: '#5a1890' }}>{h.score_know}</td>
                      <td className="py-3 px-4" style={{ color: '#00adef' }}>{h.score_engage}</td>
                      <td className="py-3 px-4" style={{ color: '#c9a54e' }}>{h.score_exceed}</td>
                      <td className="py-3 px-4" style={{ color: '#1D9E75' }}>{h.score_prevent}</td>
                      <td className="py-3 px-4 font-medium">{h.score_total}/20</td>
                      <td className="py-3 px-4 text-gray-500 hidden md:table-cell">{h.scored_by?.full_name || '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* KEEP SCORE MODAL */}
      {showScoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowScoreModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Update KEEP score</h3>
            <p className="text-sm text-gray-500 mb-5">Rate each dimension from 0 to 5.</p>
            {[{ key: 'k', label: 'Know', desc: 'Understanding of client business and goals', color: '#5a1890' }, { key: 'e', label: 'Engage', desc: 'Frequency and quality of interactions', color: '#00adef' }, { key: 'ex', label: 'Exceed', desc: 'Delivering beyond expectations', color: '#c9a54e' }, { key: 'p', label: 'Prevent', desc: 'Proactive risk identification', color: '#1D9E75' }].map(dim => (
              <div key={dim.key} className="mb-4">
                <div className="flex items-center justify-between mb-1"><span className="text-sm font-medium" style={{ color: dim.color }}>{dim.label}</span><span className="text-sm font-medium text-gray-900">{keepScores[dim.key as keyof typeof keepScores]}/5</span></div>
                <p className="text-xs text-gray-400 mb-2">{dim.desc}</p>
                <input type="range" min="0" max="5" step="1" value={keepScores[dim.key as keyof typeof keepScores]} onChange={e => setKeepScores(prev => ({ ...prev, [dim.key]: parseInt(e.target.value) }))} className="w-full" style={{ accentColor: dim.color }} />
              </div>
            ))}
            <div className="bg-gray-50 rounded-lg p-3 mb-5 text-center"><div className="text-xs text-gray-500">Total</div><div className="text-2xl font-medium" style={{ color: '#2b0548' }}>{keepScores.k + keepScores.e + keepScores.ex + keepScores.p}/20</div></div>
            <div className="flex gap-3">
              <button onClick={() => setShowScoreModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={updateHealthScore} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>{saving ? 'Saving...' : 'Save score'}</button>
            </div>
          </div>
        </div>
      )}

      {/* LOG INTERACTION MODAL */}
      {showInteractionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowInteractionModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Log interaction</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-gray-600 mb-1">Channel</label><select value={intChannel} onChange={e => setIntChannel(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"><option value="call">{'\u{1F4DE}'} Call</option><option value="meeting">{'\u{1F91D}'} Meeting</option><option value="email">{'\u{1F4E7}'} Email</option><option value="whatsapp">{'\u{1F4AC}'} WhatsApp</option><option value="in_person">{'\u{1F464}'} In person</option><option value="other">{'\u{1F4DD}'} Other</option></select></div>
                <div><label className="block text-sm text-gray-600 mb-1">Direction</label><select value={intDirection} onChange={e => setIntDirection(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"><option value="outbound">Outbound</option><option value="inbound">Inbound</option></select></div>
              </div>
              {contacts.length > 0 && <div><label className="block text-sm text-gray-600 mb-1">Contact</label><select value={intContactId} onChange={e => setIntContactId(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"><option value="">Select contact</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select></div>}
              <div><label className="block text-sm text-gray-600 mb-1">Subject *</label><input type="text" value={intSubject} onChange={e => setIntSubject(e.target.value)} placeholder="e.g. Quarterly review call" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" /></div>
              <div><label className="block text-sm text-gray-600 mb-1">Notes</label><textarea value={intContent} onChange={e => setIntContent(e.target.value)} rows={3} placeholder="Key points, decisions, action items..." className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" /></div>
              <div className="flex items-center gap-3"><input type="checkbox" id="followup" checked={intFollowUp} onChange={e => setIntFollowUp(e.target.checked)} className="w-4 h-4 rounded" /><label htmlFor="followup" className="text-sm text-gray-700">Follow-up required</label>{intFollowUp && <input type="date" value={intFollowUpDate} onChange={e => setIntFollowUpDate(e.target.value)} className="px-2 py-1 border border-gray-300 rounded text-sm" />}</div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowInteractionModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={logInteraction} disabled={saving || !intSubject} className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>{saving ? 'Saving...' : 'Log interaction'}</button>
            </div>
          </div>
        </div>
      )}

      {/* TASK MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowTaskModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add task for {account.name}</h3>
            <div className="space-y-3">
              <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="What needs to be done?" autoFocus className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <select value={taskType} onChange={e => setTaskType(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="follow_up">{'\u{1F514}'} Follow-up</option><option value="call">{'\u{1F4DE}'} Call</option><option value="email">{'\u{1F4E7}'} Email</option><option value="meeting">{'\u{1F91D}'} Meeting</option><option value="task">{'\u{1F4CB}'} Task</option>
                </select>
                <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              {contacts.length > 0 && <select value={taskContactId} onChange={e => setTaskContactId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"><option value="">Link to contact (optional)</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowTaskModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={createTask} disabled={saving || !taskTitle.trim()} className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>{saving ? 'Creating...' : 'Create task'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVATE PLAYBOOK MODAL */}
      {showPlaybookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowPlaybookModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Activate playbook</h3>
            <p className="text-sm text-gray-500 mb-5">Choose a playbook to start on {account.name}.</p>
            <div className="space-y-3">
              {playbooks.map(pb => {
                const alreadyActive = assignments.some(a => a.playbook_id === pb.id && a.status === 'in_progress')
                return (
                  <div key={pb.id} className={`border rounded-lg p-4 ${alreadyActive ? 'border-gray-200 bg-gray-50' : 'border-gray-200 hover:border-purple-300 cursor-pointer'}`} onClick={() => !alreadyActive && activatePlaybook(pb.id)}>
                    <div className="flex items-center justify-between">
                      <div><div className="text-sm font-medium text-gray-900">{pb.name}</div><div className="text-xs text-gray-500 mt-0.5">{pb.steps?.length || 0} steps {'\u00B7'} {pb.category}</div></div>
                      {alreadyActive ? <span className="text-xs text-gray-400">Already active</span> : <span className="text-xs font-medium" style={{ color: '#5a1890' }}>Activate</span>}
                    </div>
                    {pb.description && <p className="text-xs text-gray-400 mt-2">{pb.description}</p>}
                  </div>
                )
              })}
            </div>
            <button onClick={() => setShowPlaybookModal(false)} className="w-full mt-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
          </div>
        </div>
      )}

      <EmailComposer
        isOpen={showEmailComposer}
        onClose={() => setShowEmailComposer(false)}
        onSent={() => loadAccount()}
        toEmail={primaryContact?.email || undefined}
        toName={primaryContact?.full_name}
        accountId={account.id}
        contactId={primaryContact?.id}
      />

      <UpgradeModal />
    </div>
  )
}
