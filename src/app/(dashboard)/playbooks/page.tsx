// src/app/(dashboard)/playbooks/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Playbook, PlaybookStep, PlaybookAssignment } from '@/lib/types'

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<(Playbook & { steps: PlaybookStep[] })[]>([])
  const [activeAssignments, setActiveAssignments] = useState<any[]>([])
  const [selectedPlaybook, setSelectedPlaybook] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadPlaybooks() }, [])

  async function loadPlaybooks() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('users').select('org_id').eq('auth_id', user.id).single()
    if (!profile) return

    // Get all available playbooks (system + org)
    const { data: playbooksData } = await supabase
      .from('playbooks')
      .select('*, steps:playbook_steps(*)')
      .or(`is_system_default.eq.true,org_id.eq.${profile.org_id}`)
      .eq('is_active', true)
      .order('category')

    setPlaybooks((playbooksData || []).map(p => ({
      ...p,
      steps: (p.steps || []).sort((a: any, b: any) => a.step_number - b.step_number),
    })))

    // Get active assignments
    const { data: assignments } = await supabase
      .from('playbook_assignments')
      .select(`
        *,
        playbook:playbooks(name, category),
        account:accounts(id, name, health_score_total),
        progress:playbook_step_progress(*, step:playbook_steps(title, step_number))
      `)
      .eq('org_id', profile.org_id)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })

    setActiveAssignments(assignments || [])
    setLoading(false)
  }

  const categoryLabels: Record<string, string> = {
    onboarding: 'Onboarding',
    review: 'Business review',
    recovery: 'Recovery',
    expansion: 'Expansion',
    renewal: 'Renewal',
    custom: 'Custom',
  }

  const categoryColors: Record<string, string> = {
    onboarding: '#85B7EB',
    review: '#AFA9EC',
    recovery: '#F0997B',
    expansion: '#97C459',
    renewal: '#FAC775',
    custom: '#7e7e7e',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">Playbooks</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Guided workflows for every stage of the account lifecycle. Activate a playbook on any account.
        </p>
      </div>

      {/* Active playbook assignments */}
      {activeAssignments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Active playbooks ({activeAssignments.length})</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {activeAssignments.map(assignment => {
              const completedSteps = (assignment.progress || []).filter((p: any) => p.status === 'completed').length
              const totalSteps = (assignment.progress || []).length
              const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

              return (
                <div key={assignment.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{assignment.playbook?.name}</div>
                      <div className="text-xs text-gray-500">{assignment.account?.name}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: categoryColors[assignment.playbook?.category] + '20', color: categoryColors[assignment.playbook?.category] }}>
                      {categoryLabels[assignment.playbook?.category] || 'Custom'}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{completedSteps}/{totalSteps} steps</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%`, background: '#5a1890' }} />
                    </div>
                  </div>

                  {/* Next step */}
                  {(() => {
                    const nextStep = (assignment.progress || [])
                      .sort((a: any, b: any) => (a.step?.step_number || 0) - (b.step?.step_number || 0))
                      .find((p: any) => p.status !== 'completed' && p.status !== 'skipped')
                    if (nextStep) {
                      return (
                        <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                          Next: <span className="font-medium">{nextStep.step?.title}</span>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Playbook library */}
      <h2 className="text-sm font-medium text-gray-900 mb-3">Playbook library</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {playbooks.map(playbook => (
          <div key={playbook.id}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors cursor-pointer"
            onClick={() => setSelectedPlaybook(selectedPlaybook === playbook.id ? null : playbook.id)}>

            <div className="flex items-start justify-between mb-3">
              <span className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ background: categoryColors[playbook.category] + '20', color: categoryColors[playbook.category] }}>
                {categoryLabels[playbook.category] || 'Custom'}
              </span>
              {playbook.is_system_default && (
                <span className="text-[10px] text-gray-400">Built-in</span>
              )}
            </div>

            <h3 className="text-sm font-medium text-gray-900 mb-1">{playbook.name}</h3>
            <p className="text-xs text-gray-500 mb-3">{playbook.description}</p>
            <div className="text-xs text-gray-400">{playbook.steps?.length || 0} steps</div>

            {/* Expanded steps */}
            {selectedPlaybook === playbook.id && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                {playbook.steps?.map((step, i) => (
                  <div key={step.id} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500 flex-shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-900">{step.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{step.description}</div>
                      {step.suggested_timeline_days != null && (
                        <div className="text-[10px] text-gray-400 mt-1">
                          {step.suggested_timeline_days > 0
                            ? `By day ${step.suggested_timeline_days}`
                            : step.suggested_timeline_days < 0
                            ? `${Math.abs(step.suggested_timeline_days)} days before`
                            : 'On the day'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
