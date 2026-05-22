// src/app/(dashboard)/pipeline/custom/[id]/page.tsx
// Kanban view for custom pipelines (same pattern as retention/sales)

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Stage {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

interface PipelineItem {
  id: string;
  name: string;
  stage_id: string;
  health_score_total?: number;
  health_status?: string;
  contract_value_annual?: number;
  assigned_user_id?: string;
  // deal fields
  value?: number;
  probability?: number;
  expected_close_date?: string;
}

export default function CustomPipelinePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const pipelineId = params.id as string;

  const [pipeline, setPipeline] = useState<any>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [dragItem, setDragItem] = useState<string | null>(null);

  useEffect(() => {
    loadPipeline();
  }, [pipelineId]);

  async function loadPipeline() {
    setLoading(true);
    try {
      // Load pipeline info
      const { data: pl } = await supabase
        .from('pipelines')
        .select('*')
        .eq('id', pipelineId)
        .single();

      if (!pl) {
        router.push('/pipeline/retention');
        return;
      }
      setPipeline(pl);

      // Load stages
      const { data: stageData } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('sort_order');

      setStages(stageData || []);

      // Load items (could be accounts or deals depending on pipeline type)
      if (pl.pipeline_type === 'sales' || pl.pipeline_type === 'investor_relations' || pl.pipeline_type === 'donor_management') {
        const { data: dealData } = await supabase
          .from('deals')
          .select('*')
          .eq('pipeline_id', pipelineId)
          .neq('status', 'lost');
        setItems(dealData || []);
      } else {
        const { data: accountData } = await supabase
          .from('accounts')
          .select('*')
          .eq('pipeline_id', pipelineId);
        setItems(accountData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDrop(itemId: string, newStageId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item || item.stage_id === newStageId) return;

    // Optimistic update
    setItems(items.map((i) => (i.id === itemId ? { ...i, stage_id: newStageId } : i)));

    // Determine table
    const table = item.value !== undefined ? 'deals' : 'accounts';
    await supabase.from(table).update({ stage_id: newStageId }).eq('id', itemId);
  }

  function getItemsForStage(stageId: string) {
    return items.filter((i) => i.stage_id === stageId);
  }

  function getStageTotal(stageId: string) {
    const stageItems = getItemsForStage(stageId);
    return stageItems.reduce((sum, i) => sum + (i.value || i.contract_value_annual || 0), 0);
  }

  function formatCurrency(amount: number) {
    if (!amount) return '';
    return '₦' + amount.toLocaleString();
  }

  function getHealthColor(status: string) {
    if (status === 'healthy') return 'bg-green-500';
    if (status === 'at_risk') return 'bg-yellow-500';
    if (status === 'critical') return 'bg-red-500';
    return 'bg-gray-400';
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-96 bg-gray-200 dark:bg-gray-700 rounded w-72" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {pipeline?.name || 'Pipeline'}
          </h1>
          {pipeline?.description && (
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
              {pipeline.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Table
            </button>
          </div>

          <button
            onClick={() => router.push(`/pipeline/create`)}
            className="px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
          >
            + New Pipeline
          </button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        /* Kanban View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageItems = getItemsForStage(stage.id);
            const total = getStageTotal(stage.id);

            return (
              <div
                key={stage.id}
                className="flex-shrink-0 w-72"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragItem) handleDrop(dragItem, stage.id);
                  setDragItem(null);
                }}
              >
                {/* Stage header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="font-medium text-sm text-gray-900 dark:text-white">
                      {stage.name}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                      {stageItems.length}
                    </span>
                  </div>
                  {total > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(total)}
                    </span>
                  )}
                </div>

                {/* Cards */}
                <div className="space-y-2 min-h-[200px] bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
                  {stageItems.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => setDragItem(item.id)}
                      onDragEnd={() => setDragItem(null)}
                      onClick={() => {
                        if (item.value !== undefined) {
                          // It's a deal - could link to deal detail
                        } else {
                          router.push(`/accounts/${item.id}`);
                        }
                      }}
                      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                        dragItem === item.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          {item.name}
                        </p>
                        {item.health_status && (
                          <div
                            className={`w-2 h-2 rounded-full mt-1 ${getHealthColor(item.health_status)}`}
                            title={item.health_status}
                          />
                        )}
                      </div>
                      {(item.value || item.contract_value_annual) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatCurrency(item.value || item.contract_value_annual || 0)}
                        </p>
                      )}
                      {item.probability !== undefined && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-0.5">
                            <span>Probability</span>
                            <span>{item.probability}%</span>
                          </div>
                          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${item.probability}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {stageItems.length === 0 && (
                    <div className="flex items-center justify-center h-24 text-gray-400 text-xs">
                      Drag items here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Stage</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Value</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const stage = stages.find((s) => s.id === item.stage_id);
                return (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => {
                      if (item.value === undefined) router.push(`/accounts/${item.id}`);
                    }}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex px-2 py-0.5 rounded text-xs text-white font-medium"
                        style={{ backgroundColor: stage?.color || '#6B7280' }}
                      >
                        {stage?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {formatCurrency(item.value || item.contract_value_annual || 0)}
                    </td>
                    <td className="px-4 py-3">
                      {item.health_status && (
                        <span className={`inline-flex items-center gap-1 text-xs ${
                          item.health_status === 'healthy' ? 'text-green-600' :
                          item.health_status === 'at_risk' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${getHealthColor(item.health_status)}`} />
                          {item.health_status.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No items in this pipeline yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
