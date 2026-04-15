// src/app/(dashboard)/admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SUPER_ADMIN_EMAILS } from '@/lib/super-admin'
import { useRouter } from 'next/navigation'

interface PlatformMetrics {
  total_orgs: number
  total_users: number
  total_accounts: number
  total_interactions: number
  total_deals: number
  plans: { plan_tier: string; count: number }[]
  recent_signups: { name: string; email: string; plan_tier: string; created_at: string }[]
}

export default function SuperAdminPage() {
  const [authorized, setAuthorized] = useState(false)
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [orgs, setOrgs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAccess()
  }, [])

  async function checkAccess() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !SUPER_ADMIN_EMAILS.includes(user.email || '')) {
      router.push('/dashboard')
      return
    }
    setAuthorized(true)
    loadMetrics()
  }

  async function loadMetrics() {
    // These queries use the service role via API route
    const res = await fetch('/api/admin/metrics')
    if (res.ok) {
      const data = await res.json()
      setMetrics(data.metrics)
      setOrgs(data.organizations || [])
    }
    setLoading(false)
  }

  if (!authorized || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-medium text-gray-900">Platform admin</h1>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Super admin</span>
        </div>
        <p className="text-sm text-gray-500">Full platform overview. Only visible to platform owners.</p>
      </div>

      {metrics && (
        <>
          {/* Platform-wide metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Organizations', value: metrics.total_orgs },
              { label: 'Total users', value: metrics.total_users },
              { label: 'Total accounts', value: metrics.total_accounts },
              { label: 'Total deals', value: metrics.total_deals },
              { label: 'Interactions', value: metrics.total_interactions },
            ].map(m => (
              <div key={m.label} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-xs text-gray-500 mb-1">{m.label}</div>
                <div className="text-2xl font-medium text-gray-900">{m.value?.toLocaleString() || 0}</div>
              </div>
            ))}
          </div>

          {/* Plan distribution */}
          {metrics.plans && (
            <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
              <h2 className="text-sm font-medium text-gray-900 mb-3">Plan distribution</h2>
              <div className="grid grid-cols-5 gap-3">
                {['beta', 'starter', 'growth', 'scale', 'enterprise'].map(tier => {
                  const plan = metrics.plans?.find(p => p.plan_tier === tier)
                  return (
                    <div key={tier} className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-medium text-gray-900">{plan?.count || 0}</div>
                      <div className="text-xs text-gray-500 capitalize">{tier}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* All organizations */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">All organizations</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-xs font-medium text-gray-500">Organization</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500">Plan</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500">Users</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500">Accounts</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map(org => (
                <tr key={org.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 font-medium text-gray-900">{org.name}</td>
                  <td className="py-2.5 capitalize">{org.plan_tier}</td>
                  <td className="py-2.5">{org.user_count || 0}</td>
                  <td className="py-2.5">{org.account_count || 0}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      org.subscription_status === 'active' || org.subscription_status === 'beta'
                        ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>{org.subscription_status}</span>
                  </td>
                  <td className="py-2.5 text-gray-500">
                    {new Date(org.created_at).toLocaleDateString('en-NG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
