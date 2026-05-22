// src/app/(dashboard)/analytics/page.tsx
// Advanced analytics with conversion tracking, pipeline metrics, and trends

'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface MetricCard {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

export default function AnalyticsPage() {
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [healthBreakdown, setHealthBreakdown] = useState({ healthy: 0, at_risk: 0, critical: 0 });
  const [pipelineMetrics, setPipelineMetrics] = useState<any[]>([]);
  const [recentConversions, setRecentConversions] = useState<any[]>([]);
  const [topAccounts, setTopAccounts] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  async function loadAnalytics() {
    setLoading(true);

    const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const since = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    // Accounts summary
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, health_status, health_score_total, contract_value_annual, created_at');

    const allAccounts = accounts || [];
    const totalAccounts = allAccounts.length;
    const totalRevenue = allAccounts.reduce((sum, a) => sum + (a.contract_value_annual || 0), 0);
    const avgHealth = totalAccounts > 0
      ? Math.round(allAccounts.reduce((sum, a) => sum + (a.health_score_total || 0), 0) / totalAccounts)
      : 0;

    const healthy = allAccounts.filter((a) => a.health_status === 'healthy').length;
    const atRisk = allAccounts.filter((a) => a.health_status === 'at_risk').length;
    const critical = allAccounts.filter((a) => a.health_status === 'critical').length;
    setHealthBreakdown({ healthy, at_risk: atRisk, critical });

    const newAccounts = allAccounts.filter((a) => a.created_at >= since).length;

    // Deals summary
    const { data: deals } = await supabase
      .from('deals')
      .select('id, value, status, created_at');

    const allDeals = deals || [];
    const wonDeals = allDeals.filter((d) => d.status === 'won');
    const wonRevenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const openDeals = allDeals.filter((d) => d.status === 'open');
    const pipelineValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    // Win rate
    const closedDeals = allDeals.filter((d) => d.status === 'won' || d.status === 'lost');
    const winRate = closedDeals.length > 0
      ? Math.round((wonDeals.length / closedDeals.length) * 100)
      : 0;

    // Interactions
    const { count: interactionCount } = await supabase
      .from('interactions')
      .select('id', { count: 'exact' })
      .gte('created_at', since);

    setMetrics([
      { label: 'Total Accounts', value: totalAccounts.toString(), change: `+${newAccounts} new`, changeType: 'positive' },
      { label: 'Annual Revenue', value: '₦' + totalRevenue.toLocaleString() },
      { label: 'Avg Health Score', value: `${avgHealth}/20`, changeType: avgHealth >= 14 ? 'positive' : avgHealth >= 10 ? 'neutral' : 'negative' },
      { label: 'Pipeline Value', value: '₦' + pipelineValue.toLocaleString(), change: `${openDeals.length} open deals` },
      { label: 'Won Revenue', value: '₦' + wonRevenue.toLocaleString(), change: `${wonDeals.length} deals won`, changeType: 'positive' },
      { label: 'Win Rate', value: `${winRate}%`, change: `${closedDeals.length} closed` },
      { label: 'Interactions', value: (interactionCount || 0).toString(), change: `last ${daysAgo}d` },
      { label: 'At-Risk Revenue', value: '₦' + allAccounts.filter((a) => a.health_status !== 'healthy').reduce((sum, a) => sum + (a.contract_value_annual || 0), 0).toLocaleString(), changeType: 'negative' },
    ]);

    // Pipeline breakdown
    const { data: pipelines } = await supabase
      .from('pipelines')
      .select('id, name, pipeline_type');

    const pipelineStats = [];
    for (const p of pipelines || []) {
      const { count } = await supabase
        .from(p.pipeline_type === 'sales' ? 'deals' : 'accounts')
        .select('id', { count: 'exact' })
        .eq('pipeline_id', p.id);

      pipelineStats.push({ name: p.name, type: p.pipeline_type, count: count || 0 });
    }
    setPipelineMetrics(pipelineStats);

    // Conversion events
    const { data: conversions } = await supabase
      .from('conversion_events')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);

    setRecentConversions(conversions || []);

    // Top accounts by value
    const sorted = [...allAccounts]
      .sort((a, b) => (b.contract_value_annual || 0) - (a.contract_value_annual || 0))
      .slice(0, 5);

    // Fetch names
    if (sorted.length > 0) {
      const { data: topData } = await supabase
        .from('accounts')
        .select('id, name, contract_value_annual, health_status, health_score_total')
        .in('id', sorted.map((s) => s.id));
      setTopAccounts(topData || []);
    }

    setLoading(false);
  }

  function getChangeColor(type?: string) {
    if (type === 'positive') return 'text-green-600';
    if (type === 'negative') return 'text-red-600';
    return 'text-gray-400';
  }

  function getHealthBarWidth(type: string) {
    const total = healthBreakdown.healthy + healthBreakdown.at_risk + healthBreakdown.critical;
    if (total === 0) return '0%';
    const val = type === 'healthy' ? healthBreakdown.healthy : type === 'at_risk' ? healthBreakdown.at_risk : healthBreakdown.critical;
    return `${(val / total) * 100}%`;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{m.label}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{m.value}</p>
            {m.change && (
              <p className={`text-xs mt-0.5 ${getChangeColor(m.changeType)}`}>{m.change}</p>
            )}
          </div>
        ))}
      </div>

      {/* Health distribution */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Health Distribution</h2>
        <div className="flex h-6 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-3">
          <div className="bg-green-500 transition-all" style={{ width: getHealthBarWidth('healthy') }} />
          <div className="bg-yellow-500 transition-all" style={{ width: getHealthBarWidth('at_risk') }} />
          <div className="bg-red-500 transition-all" style={{ width: getHealthBarWidth('critical') }} />
        </div>
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-300">Healthy ({healthBreakdown.healthy})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-gray-600 dark:text-gray-300">At Risk ({healthBreakdown.at_risk})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600 dark:text-gray-300">Critical ({healthBreakdown.critical})</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top accounts */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Accounts by Value</h2>
          <div className="space-y-3">
            {topAccounts.sort((a, b) => (b.contract_value_annual || 0) - (a.contract_value_annual || 0)).map((account, i) => (
              <div key={account.id} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{account.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      account.health_status === 'healthy' ? 'bg-green-500' :
                      account.health_status === 'at_risk' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-xs text-gray-400">{account.health_score_total}/20</span>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  ₦{(account.contract_value_annual || 0).toLocaleString()}
                </span>
              </div>
            ))}
            {topAccounts.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">No accounts yet.</p>
            )}
          </div>
        </div>

        {/* Pipeline breakdown */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pipelines</h2>
          <div className="space-y-3">
            {pipelineMetrics.map((p) => (
              <div key={p.name} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{p.type.replace('_', ' ')}</p>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent conversions */}
      {recentConversions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Conversion Events</h2>
          <div className="space-y-2">
            {recentConversions.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {c.event_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString('en-NG', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                {c.value && (
                  <span className="text-sm font-semibold text-green-600">
                    ₦{Number(c.value).toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
