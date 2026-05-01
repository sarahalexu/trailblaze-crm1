'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import AccessCodeEntry from '@/components/ui/AccessCodeEntry'
declare global { interface Window { PaystackPop: any } }
import { usePlanLimits } from '@/hooks/usePlanLimits'


export default function BillingPage() {
  const [org, setOrg] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [users, setUsers] = useState(1)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string|null>(null)
  const [cycle, setCycle] = useState<'monthly'|'annual'>('monthly')
  const supabase = createClient()
  const { check, UpgradeModal } = usePlanLimits()


  useEffect(() => {
    if (!document.querySelector('script[src*="paystack"]')) { const s=document.createElement('script'); s.src='https://js.paystack.co/v2/inline.js'; document.head.appendChild(s) }
    load()
    if (!check('create_account')) return
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    const { data: p } = await supabase.from('users').select('org_id').eq('auth_id', user.id).single(); if (!p) return
    const { data: o } = await supabase.from('organizations').select('*').eq('id', p.org_id).single(); setOrg(o)
    const { count } = await supabase.from('users').select('*',{count:'exact',head:true}).eq('org_id', p.org_id); setUsers(count||1)
    const { data: inv } = await supabase.from('invoices').select('*').eq('org_id', p.org_id).order('created_at', { ascending: false }).limit(10)
    setInvoices(inv||[])
    setLoading(false)
  }

  async function pay(tier: string) {
    if (!org) return; setProcessing(tier)
    const price = tier==='growth'?20000:45000, disc = cycle==='annual'?0.8:1
    const total = Math.round(price * users * disc * (cycle==='annual'?12:1) * 100)
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    const { data: p } = await supabase.from('users').select('email').eq('auth_id', user.id).single()
    try {
      const ps = new window.PaystackPop()
      ps.newTransaction({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
        email: p?.email || user.email, amount: total, currency: 'NGN',
        ref: `TB-${tier}-${org.id.slice(0,8)}-${Date.now()}`,
        metadata: { org_id: org.id, plan_tier: tier, billing_cycle: cycle, user_count: users },
        onSuccess: async () => {
          await supabase.from('organizations').update({ plan_tier: tier, subscription_status: 'active', previous_plan_tier: org.plan_tier }).eq('id', org.id)
          setProcessing(null); window.location.reload()
        },
        onCancel: () => setProcessing(null),
      })
    } catch { setProcessing(null); alert('Payment failed. Try again.') }
  }

  
  async function handleDowngrade() {

    if (!confirm('Are you sure? You will lose access to premium features.')) return
  
    const reason = prompt('Optional: why are you downgrading?')
  
    await fetch('/api/billing/downgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_plan: 'starter',
        reason
      }),
    })
  
    window.location.reload()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"/></div>

  const plans = [
    { tier:'starter', name:'Free', price:0, features:['1 user','15 accounts','1 sequence (25 contacts)','25 emails/day','2 playbooks','Basic reporting'], excluded:['Email tracking','AI features','WhatsApp sequences','Data export'] },
    { tier:'growth', name:'Growth', price:cycle==='annual'?16000:20000, popular:true, features:['10 users','500 accounts','10 sequences (200 contacts)','200 emails/day','Email tracking','AI features','WhatsApp sequences','All 5 playbooks','50 snippets','Data export'], excluded:['Custom playbooks','API access'] },
    { tier:'scale', name:'Scale', price:cycle==='annual'?36000:45000, features:['50 users','Unlimited accounts','Unlimited sequences','1,000 emails/day','Advanced analytics','Custom playbooks','Stakeholder mapping','API access'], excluded:[] },
  ]

  const canUp = (t: string) => { const o2 = ['starter','growth','scale']; return o2.indexOf(t) > o2.indexOf(org?.plan_tier==='beta'?'scale':org?.plan_tier||'starter') }

  return (
    <div className="max-w-4xl">
      <div className="mb-6"><h1 className="text-xl font-semibold text-gray-900">Billing</h1><p className="text-sm text-gray-500 mt-0.5">Manage your plan and payments.</p></div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1"><h3 className="text-sm font-medium text-gray-900">Current plan</h3><span className="text-xs px-2.5 py-0.5 rounded-full font-medium capitalize" style={{background:'rgba(90,24,144,0.08)',color:'#5a1890'}}>{org?.plan_tier==='beta'?'Beta (all features)':org?.plan_tier}</span></div>
            <p className="text-xs text-gray-500">{users} user{users!==1?'s':''} · {org?.name}{org?.access_expires_at ? ` · Access expires ${new Date(org.access_expires_at).toLocaleDateString('en-NG')}` : ''}</p>
          </div>
          {org?.plan_tier !== 'starter' && org?.plan_tier !== 'beta' && <button onClick={downgrade} className="text-xs text-red-500 hover:underline">Downgrade to Free</button>}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mb-6">
        <span className={`text-sm ${cycle==='monthly'?'text-gray-900 font-medium':'text-gray-400'}`}>Monthly</span>
        <button onClick={() => setCycle(c => c==='monthly'?'annual':'monthly')} className={`w-12 h-6 rounded-full transition-colors ${cycle==='annual'?'bg-purple-600':'bg-gray-300'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${cycle==='annual'?'translate-x-6':'translate-x-0.5'}`}/></button>
        <span className={`text-sm ${cycle==='annual'?'text-gray-900 font-medium':'text-gray-400'}`}>Annual <span className="text-xs text-green-600 font-medium">Save 20%</span></span>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {plans.map(p => (
          <div key={p.tier} className={`bg-white rounded-2xl border-2 p-5 relative ${p.popular?'border-purple-300':'border-gray-200'}`} style={p.popular?{boxShadow:'0 4px 20px rgba(90,24,144,0.1)'}:{}}>
            {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{background:'#5a1890'}}>Most popular</div>}
            <h3 className="text-base font-semibold text-gray-900">{p.name}</h3>
            <div className="mt-2 mb-4">{p.price===0?<span className="text-2xl font-bold">Free</span>:<><span className="text-2xl font-bold">₦{p.price.toLocaleString()}</span><span className="text-xs text-gray-500">/user/mo{cycle==='annual'?' (billed annually)':''}</span></>}</div>
            <div className="space-y-2 mb-5">
              {p.features.map(f => <div key={f} className="flex items-start gap-2 text-xs text-gray-700"><span className="text-green-500 mt-0.5">✓</span>{f}</div>)}
              {p.excluded.map(f => <div key={f} className="flex items-start gap-2 text-xs text-gray-400"><span className="mt-0.5">—</span>{f}</div>)}
            </div>
            {org?.plan_tier===p.tier || (org?.plan_tier==='beta' && p.tier==='starter') ? (
  <>
    <div className="w-full py-2.5 rounded-xl text-sm text-center border-2 border-gray-200 text-gray-400 font-medium">
      Current plan
    </div>

    {org?.plan_tier !== 'starter' && (
      <button
        onClick={handleDowngrade}
        className="text-xs text-red-500 hover:underline mt-2"
      >
        Downgrade to Free plan
      </button>
    )}
  </>
) : canUp(p.tier) ? (
  <button
    onClick={() => pay(p.tier)}
    disabled={!!processing}
    className="w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
    style={p.popular
      ? { background:'#2b0548', color:'#e1b3ee' }
      : { background:'#f3f4f6', color:'#374151' }
    }
  >
    {processing===p.tier ? 'Processing...' : `Upgrade to ${p.name}`}
  </button>
) : (
  <div className="w-full py-2.5 rounded-xl text-sm text-center text-gray-400">
    —
  </div>
)}
      </div>
      ))}

      <div className="mt-8">
  <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment history</h3>
  {invoices.map(inv => (
    <div key={inv.id} className="flex items-center justify-between py-3 border-b border-gray-100">
      <div>
        <div className="text-sm text-gray-900">{inv.invoice_number}</div>
        <div className="text-xs text-gray-500">{new Date(inv.paid_at).toLocaleDateString('en-NG')}</div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">₦{Number(inv.amount).toLocaleString()}</span>
        <a href={`/api/billing/invoice?id=${inv.id}`} target="_blank"
          className="text-xs text-purple-700 hover:underline">View invoice</a>
      </div>
    </div>
  ))}
</div>


      <div className="bg-gray-900 rounded-2xl p-6 mb-8 text-white flex items-center justify-between flex-wrap gap-3">
        <div><h3 className="text-base font-semibold mb-1">Enterprise</h3><p className="text-sm text-gray-400">Custom pricing. Dedicated AM, SSO, white-label.</p></div>
        <a href="mailto:sarah@trailblazeafrica.com?subject=Enterprise inquiry" className="px-5 py-2.5 bg-white text-gray-900 rounded-xl text-sm font-medium">Contact sales</a>
      </div>

      <AccessCodeEntry onSuccess={() => window.location.reload()} />

      <UpgradeModal />

    </div>
  )
}
