'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null)
  const [orgs, setOrgs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ok, setOk] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('users').select('email').eq('auth_id', user.id).single()
      if (p?.email !== 'sarah@trailblazeafrica.com') { setLoading(false); return }
      setOk(true)
      const { data: allOrgs } = await supabase.from('organizations').select('*').order('created_at', { ascending: false })
      setOrgs(allOrgs || [])
      const { count: tu } = await supabase.from('users').select('*', { count: 'exact', head: true })
      const { count: ta } = await supabase.from('accounts').select('*', { count: 'exact', head: true })
      const { count: ti } = await supabase.from('interactions').select('*', { count: 'exact', head: true })
      const { data: fb } = await supabase.from('feedback').select('*').eq('status', 'new').order('created_at', { ascending: false }).limit(10)
      setStats({ tu: tu||0, ta: ta||0, ti: ti||0, fb: fb||[] })
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"/></div>
  if (!ok) return <div className="text-center py-16 text-sm text-gray-500">Access denied.</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-semibold text-gray-900">Super Admin</h1><p className="text-sm text-gray-500">Platform-wide metrics.</p></div>
        <Link href="/admin/codes" className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>Access Codes</Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[{l:'Organizations',v:orgs.length,c:'#5a1890'},{l:'Users',v:stats?.tu,c:'#00adef'},{l:'Accounts',v:stats?.ta,c:'#1D9E75'},{l:'Interactions',v:stats?.ti,c:'#c9a54e'}].map((m,i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4"><div className="text-xs text-gray-500 mb-1">{m.l}</div><div className="text-2xl font-semibold" style={{color:m.c}}>{m.v}</div></div>
        ))}
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Organizations ({orgs.length})</h3>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-gray-50">
          <th className="text-left py-3 px-4 text-xs text-gray-500">Name</th><th className="text-left py-3 px-4 text-xs text-gray-500">Plan</th><th className="text-left py-3 px-4 text-xs text-gray-500">Joined</th><th className="text-left py-3 px-4 text-xs text-gray-500">Expires</th>
        </tr></thead><tbody>{orgs.map(o => (
          <tr key={o.id} className="border-b border-gray-100"><td className="py-3 px-4 font-medium">{o.name}</td><td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize" style={{background:'rgba(90,24,144,0.08)',color:'#5a1890'}}>{o.plan_tier}</span></td><td className="py-3 px-4 text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString('en-NG')}</td><td className="py-3 px-4 text-xs text-gray-500">{o.access_expires_at?new Date(o.access_expires_at).toLocaleDateString('en-NG'):'—'}</td></tr>
        ))}</tbody></table></div>
      </div>
      {stats?.fb?.length > 0 && <div className="bg-white border border-gray-200 rounded-xl p-5"><h3 className="text-sm font-medium text-gray-900 mb-4">Bug Reports ({stats.fb.length})</h3>
        {stats.fb.map((f:any) => <div key={f.id} className="border-b border-gray-100 py-3"><div className="flex gap-2 mb-1"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 capitalize">{f.type}</span><span className="text-sm font-medium">{f.subject}</span></div>{f.description && <p className="text-xs text-gray-500">{f.description}</p>}<div className="text-[10px] text-gray-400 mt-1">{f.page} · {new Date(f.created_at).toLocaleString('en-NG')}</div></div>)}
      </div>}
    </div>
  )
}
