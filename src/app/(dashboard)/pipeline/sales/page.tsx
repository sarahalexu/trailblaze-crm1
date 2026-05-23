'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Deal, PipelineStage } from '@/lib/types'
import Link from 'next/link'
import { DealTableView, ViewToggle } from '@/components/ui/PipelineTableView'
import PipelineHeader from '@/components/pipeline/PipelineHeader'

export default function SalesPipelinePage() {
  const [stages, setStages] = useState<(PipelineStage & { deals: Deal[] })[]>(
    []
  )
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [draggedDeal, setDraggedDeal] = useState<string | null>(null)
  const [totalValue, setTotalValue] = useState(0)
  const [weightedValue, setWeightedValue] = useState(0)

  const [showNewDeal, setShowNewDeal] = useState(false)
  const [dealName, setDealName] = useState('')
  const [dealValue, setDealValue] = useState('')
  const [dealProbability, setDealProbability] = useState('20')
  const [dealCloseDate, setDealCloseDate] = useState('')
  const [dealNotes, setDealNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const [pipelineId, setPipelineId] = useState<string | null>(null)
  const [firstStageId, setFirstStageId] = useState<string | null>(null)

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

    const { data: pipelineData } = await supabase
      .from('pipelines')
      .select('*')
      .eq('org_id', profile.org_id)
      .eq('pipeline_type', 'sales')
      .eq('is_default', true)
      .single()

    if (!pipelineData) {
      setLoading(false)
      return
    }

    setPipelineId(pipelineData.id)

    const { data: stagesData } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', pipelineData.id)
      .order('sort_order')

    const { data: dealsData } = await supabase
      .from('deals')
      .select(`*, contact:contacts(id, full_name)`)
      .eq('pipeline_id', pipelineData.id)

    const allDeals = dealsData || []

    const stagesWithDeals = (stagesData || []).map(stage => ({
      ...stage,
      deals: allDeals.filter(deal => deal.stage_id === stage.id),
    }))

    setStages(stagesWithDeals)

    if (stagesData && stagesData.length > 0) {
      setFirstStageId(stagesData[0].id)
    }

    // Metrics
    const openDeals = allDeals.filter(deal => deal.status === 'open')

    setTotalValue(
      openDeals.reduce((sum, deal) => sum + (deal.value || 0), 0)
    )

    setWeightedValue(
      openDeals.reduce(
        (sum, deal) =>
          sum + (deal.value || 0) * (deal.probability / 100),
        0
      )
    )

    setLoading(false)
  }

  async function moveDeal(dealId: string, newStageId: string) {
    const wonStage = stages.find(
      stage => stage.name.toLowerCase() === 'won'
    )

    const lostStage = stages.find(
      stage => stage.name.toLowerCase() === 'lost'
    )

    const updateData: Record<string, any> = {
      stage_id: newStageId,
    }

    if (wonStage && newStageId === wonStage.id) {
      updateData.status = 'won'
      updateData.probability = 100
    } else if (lostStage && newStageId === lostStage.id) {
      updateData.status = 'lost'
      updateData.probability = 0
    }

    const { error } = await supabase
      .from('deals')
      .update(updateData)
      .eq('id', dealId)

    if (!error) {
      loadPipeline()
    }
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

    if (draggedDeal) {
      moveDeal(draggedDeal, stageId)
      setDraggedDeal(null)
    }
  }

  function formatNaira(amount: number): string {
    if (amount >= 1000000) {
      return '₦' + (amount / 1000000).toFixed(1) + 'M'
    }

    if (amount >= 1000) {
      return '₦' + (amount / 1000).toFixed(0) + 'K'
    }

    return '₦' + amount.toLocaleString()
  }

  async function createDeal() {
    if (!dealName || !pipelineId || !firstStageId) return

    setSaving(true)

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) return

    const { data: profile } = await supabase
      .from('users')
      .select('id, org_id')
      .eq('auth_id', authUser.id)
      .single()

    if (!profile) return

    await supabase.from('deals').insert({
      org_id: profile.org_id,
      name: dealName,
      value: dealValue ? parseFloat(dealValue) : null,
      pipeline_id: pipelineId,
      stage_id: firstStageId,
      assigned_user_id: profile.id,
      probability: parseInt(dealProbability) || 20,
      expected_close_date: dealCloseDate || null,
      notes: dealNotes || null,
      status: 'open',
    })

    setSaving(false)
    setShowNewDeal(false)

    setDealName('')
    setDealValue('')
    setDealProbability('20')
    setDealCloseDate('')
    setDealNotes('')

    loadPipeline()
  }

  // Flatten deals for table view
  const allDeals = stages.flatMap(stage => stage.deals)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
        <PipelineHeader title="Sales Pipeline" />

          <p className="text-sm text-gray-500 mt-0.5">
            Track deals from lead to close. Won deals automatically create
            accounts in your retention pipeline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ViewToggle view={view} onToggle={setView} />

          <button
            onClick={() => setShowNewDeal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: '#2b0548', color: '#e1b3ee' }}
          >
            + New deal
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">
            Total pipeline value
          </div>

          <div className="text-2xl font-medium text-gray-900">
            {formatNaira(totalValue)}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">
            Weighted value
          </div>

          <div
            className="text-2xl font-medium"
            style={{ color: '#5a1890' }}
          >
            {formatNaira(Math.round(weightedValue))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 hidden lg:block">
          <div className="text-xs text-gray-500 mb-1">
            Open deals
          </div>

          <div className="text-2xl font-medium text-gray-900">
            {
              stages.reduce(
                (sum, stage) =>
                  sum +
                  stage.deals.filter(deal => deal.status === 'open').length,
                0
              )
            }
          </div>
        </div>
      </div>

      {/* View switch */}
      {view === 'table' ? (
        <DealTableView deals={allDeals} />
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pb-4"
          style={{ minHeight: '400px' }}
        >
          {stages.map(stage => {
            const stageValue = stage.deals.reduce(
              (sum, deal) => sum + (deal.value || 0),
              0
            )

            return (
              <div
                key={stage.id}
                className="flex-1 min-w-[200px] max-w-[280px] flex flex-col"
              >
                {/* Header */}
                <div
                  className="rounded-t-lg px-3 py-2 flex items-center justify-between"
                  style={{ background: stage.color }}
                >
                  <span className="text-xs font-medium text-gray-900/80">
                    {stage.name}
                  </span>

                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/30 text-gray-900/60">
                    {stage.deals.length}
                  </span>
                </div>

                {/* Stage value */}
                {stageValue > 0 && (
                  <div className="border-x border-gray-200 px-3 py-1.5 bg-gray-50 text-xs text-gray-500">
                    {formatNaira(stageValue)}
                  </div>
                )}

                {/* Deals */}
                <div
                  className="flex-1 border border-t-0 border-gray-200 rounded-b-lg p-2 space-y-2 transition-colors"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, stage.id)}
                >
                  {stage.deals.length === 0 ? (
                    <div className="text-xs text-gray-400 text-center py-8">
                      No deals
                    </div>
                  ) : (
                    stage.deals.map(deal => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={() => setDraggedDeal(deal.id)}
                        className="bg-white border border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-gray-300 transition-colors"
                      >
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {deal.name}
                        </div>

                        <div className="text-xs text-gray-400 mb-2">
                          {deal.contact?.full_name || 'No contact'} ·{' '}
                          {deal.probability}%
                        </div>

                        <div className="text-xs font-medium text-gray-700">
                          {formatNaira(deal.value || 0)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info */}
      <div className="mt-4 px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-xs text-purple-800">
          <span className="font-medium">Auto-conversion:</span> When you move a
          deal to "Won," TrailBlaze CRM automatically creates an account in your
          retention pipeline at the "Onboarding" stage.
        </p>
      </div>

      {/* Modal */}
      {showNewDeal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setShowNewDeal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Create new deal
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Deal / Company name *
                </label>

                <input
                  type="text"
                  value={dealName}
                  onChange={e => setDealName(e.target.value)}
                  placeholder="e.g. Sterling Bank onboarding"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Deal value (₦)
                  </label>

                  <input
                    type="number"
                    value={dealValue}
                    onChange={e => setDealValue(e.target.value)}
                    placeholder="e.g. 2000000"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Win probability (%)
                  </label>

                  <select
                    value={dealProbability}
                    onChange={e => setDealProbability(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="10">10% — Early stage</option>
                    <option value="20">20% — Qualified</option>
                    <option value="40">40% — Proposal sent</option>
                    <option value="60">60% — In negotiation</option>
                    <option value="80">80% — Verbal yes</option>
                    <option value="90">90% — Contract sent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Expected close date
                </label>

                <input
                  type="date"
                  value={dealCloseDate}
                  onChange={e => setDealCloseDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Notes
                </label>

                <textarea
                  value={dealNotes}
                  onChange={e => setDealNotes(e.target.value)}
                  rows={2}
                  placeholder="Any context about this deal..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewDeal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700"
              >
                Cancel
              </button>

              <button
                onClick={createDeal}
                disabled={saving || !dealName}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: '#2b0548', color: '#e1b3ee' }}
              >
                {saving ? 'Creating...' : 'Create deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}