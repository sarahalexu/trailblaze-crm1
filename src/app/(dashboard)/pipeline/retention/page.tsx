'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Account, Pipeline, PipelineStage } from '@/lib/types'
import Link from 'next/link'
import { AccountTableView, ViewToggle } from '@/components/ui/PipelineTableView'
import PipelineHeader from '@/components/ui/PipelineHeader'
import CardPreview from '@/components/pipeline/CardPreview'

export default function RetentionPipelinePage() {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [stages, setStages] = useState<
    (PipelineStage & { accounts: Account[] })[]
  >([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [draggedAccount, setDraggedAccount] = useState<string | null>(null)

  // Preview modal state
  const [previewAccountId, setPreviewAccountId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadPipeline()
  }, [])

  async function loadPipeline() {
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

    // Get default retention pipeline
    const { data: pipelineData } = await supabase
      .from('pipelines')
      .select('*')
      .eq('org_id', profile.org_id)
      .eq('pipeline_type', 'retention')
      .eq('is_default', true)
      .single()

    if (!pipelineData) {
      setLoading(false)
      return
    }

    setPipeline(pipelineData)

    // Get stages
    const { data: stagesData } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', pipelineData.id)
      .order('sort_order')

    // Get accounts
    const { data: accountsData } = await supabase
      .from('accounts')
      .select('*')
      .eq('pipeline_id', pipelineData.id)

    const stagesWithAccounts = (stagesData || []).map(stage => ({
      ...stage,
      accounts: (accountsData || []).filter(
        account => account.stage_id === stage.id
      ),
    }))

    setStages(stagesWithAccounts)
    setLoading(false)
  }

  async function moveAccount(accountId: string, newStageId: string) {
    const { error } = await supabase
      .from('accounts')
      .update({ stage_id: newStageId })
      .eq('id', accountId)

    if (!error) {
      loadPipeline()
    }
  }

  function handleDragStart(accountId: string) {
    setDraggedAccount(accountId)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.currentTarget.classList.add('bg-gray-100')
  }

  function handleDragLeave(e: React.DragEvent) {
    e.currentTarget.classList.remove('bg-gray-100')
  }

  function handleDrop(e: React.DragEvent, stageId: string) {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-gray-100')

    if (draggedAccount) {
      moveAccount(draggedAccount, stageId)
      setDraggedAccount(null)
    }
  }

  function formatNaira(amount?: number): string {
    if (!amount) return '—'

    if (amount >= 1000000) {
      return '₦' + (amount / 1000000).toFixed(1) + 'M'
    }

    if (amount >= 1000) {
      return '₦' + (amount / 1000).toFixed(0) + 'K'
    }

    return '₦' + amount.toLocaleString()
  }

  // Flatten all accounts for table view
  const allAccounts = stages.flatMap(stage => stage.accounts)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
        <PipelineHeader title="Retention Pipeline" accountCount={stages.reduce((sum, s) => sum + s.accounts.length, 0)} />

          <p className="text-sm text-gray-500 mt-0.5">
            Track accounts from onboarding to renewal. Drag to move between
            stages.
          </p>
        </div>

        <ViewToggle view={view} onToggle={setView} />
      </div>

      {/* New Account */}
      <Link
        href="/accounts/new"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
        style={{ background: '#2b0548', color: '#e1b3ee' }}
      >
        + New account
      </Link>

      {/* View Switch */}
      {view === 'table' ? (
        <div className="mt-6">
          <AccountTableView accounts={allAccounts} />
        </div>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pb-4 mt-6"
          style={{ minHeight: '400px' }}
        >
          {stages.map(stage => (
            <div
              key={stage.id}
              className="flex-1 min-w-[200px] max-w-[280px] flex flex-col"
            >
              {/* Stage Header */}
              <div
                className="rounded-t-lg px-3 py-2 flex items-center justify-between"
                style={{ background: stage.color }}
              >
                <span className="text-xs font-medium text-gray-900/80">
                  {stage.name}
                </span>

                <span className="text-xs px-2 py-0.5 rounded-full bg-white/30 text-gray-900/60">
                  {stage.accounts.length}
                </span>
              </div>

              {/* Stage Body */}
              <div
                className="flex-1 border border-t-0 border-gray-200 rounded-b-lg p-2 space-y-2 transition-colors"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, stage.id)}
              >
                {stage.accounts.length === 0 ? (
                  <div className="text-xs text-gray-400 text-center py-8">
                    No accounts
                  </div>
                ) : (
                  stage.accounts.map(account => (
                    <div
                      key={account.id}
                      draggable
                      onDragStart={() => handleDragStart(account.id)}
                      onClick={() => setPreviewAccountId(account.id)}
                      className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer cursor-grab active:cursor-grabbing hover:border-gray-300 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {account.name}
                      </div>

                      <div className="text-xs text-gray-400 mb-2">
                        {account.industry}
                      </div>

                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-medium ${
                            account.health_score_total >= 15
                              ? 'text-green-700'
                              : account.health_score_total >= 10
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }`}
                        >
                          {account.health_score_total}/20
                        </span>

                        <span className="text-xs font-medium text-gray-700">
                          {formatNaira(account.contract_value_annual)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Card Preview Modal */}
      <CardPreview
        accountId={previewAccountId}
        onClose={() => setPreviewAccountId(null)}
      />
    </div>
  )
}