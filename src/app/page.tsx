'use client'
import Link from 'next/link'
import { useState } from 'react'

export default function LandingPage() {
  const [annual, setAnnual] = useState(false)
  return (
    <div className="min-h-screen bg-white" style={{fontFamily:"'DM Sans',-apple-system,sans-serif"}}>
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold" style={{background:'#2b0548',color:'#e1b3ee'}}>TB</div><span className="text-base font-semibold text-gray-900">TrailBlaze CRM</span></div>
        <div className="flex items-center gap-3"><Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">Sign in</Link><Link href="/signup" className="px-4 py-2 rounded-lg text-sm font-medium" style={{background:'#2b0548',color:'#e1b3ee'}}>Get started free</Link></div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-6" style={{background:'#f8f4ff',color:'#5a1890'}}>Nigeria's first account management CRM</div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-5" style={{letterSpacing:'-0.03em',lineHeight:1.15}}>Stop losing customers.<br/>Start managing relationships.</h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">TrailBlaze CRM scores every client relationship, automates follow-ups through email and WhatsApp, and uses AI to predict which accounts need attention before they churn.</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/signup" className="px-6 py-3 rounded-xl text-sm font-medium" style={{background:'#2b0548',color:'#e1b3ee',boxShadow:'0 2px 8px rgba(43,5,72,0.3)'}}>Start free — no credit card</Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[{i:'💓',t:'KEEP Health Scoring',d:'Score every client on Know, Engage, Exceed, Prevent. See instantly who is healthy, at risk, or critical.'},{i:'⚡',t:'Automated Sequences',d:'Follow-up emails and WhatsApp that send from YOUR name. Stops when they reply. Feels completely personal.'},{i:'🤖',t:'AI-Powered Insights',d:'One click: AI analyzes the account, predicts churn risk, suggests the next action, or drafts a follow-up message.'},{i:'↻',t:'Retention Pipeline',d:'The only CRM with a pipeline for keeping customers. Plus a sales pipeline with auto deal-to-account conversion.'},{i:'💬',t:'Native WhatsApp',d:'Send automated WhatsApp follow-ups, log conversations, and manage client relationships where business actually happens.'},{i:'📋',t:'Built-in Playbooks',d:'Step-by-step workflows for onboarding, QBRs, recovery, expansion, and renewals. Built from real consulting experience.'}].map(f=>(
            <div key={f.t} className="border border-gray-200 rounded-2xl p-6 hover:border-purple-200 transition-all"><div className="text-2xl mb-3">{f.i}</div><h3 className="text-base font-semibold text-gray-900 mb-2">{f.t}</h3><p className="text-sm text-gray-500 leading-relaxed">{f.d}</p></div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-16"><div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Built for how African businesses actually operate</h2>
        <p className="text-sm text-gray-500 mb-10">Priced in Naira. Native WhatsApp. No annual lock-in.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[{v:'30-40%',l:'of customers lost annually'},{v:'₦20K',l:'/user/month for premium features'},{v:'5x',l:'cheaper to retain than acquire'},{v:'20+',l:'features for account management'}].map(s=>(<div key={s.l}><div className="text-2xl font-bold mb-1" style={{color:'#5a1890'}}>{s.v}</div><div className="text-xs text-gray-500">{s.l}</div></div>))}
        </div>
      </div></section>

      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h2>
          <div className="flex items-center justify-center gap-3 mt-4">
            <span className={`text-sm ${!annual?'text-gray-900 font-medium':'text-gray-400'}`}>Monthly</span>
            <button onClick={()=>setAnnual(!annual)} className={`w-12 h-6 rounded-full transition-colors ${annual?'bg-purple-600':'bg-gray-300'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${annual?'translate-x-6':'translate-x-0.5'}`}/></button>
            <span className={`text-sm ${annual?'text-gray-900 font-medium':'text-gray-400'}`}>Annual <span className="text-xs text-green-600">Save 20%</span></span>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[{n:'Free',p:0,f:['1 user','15 accounts','1 sequence','KEEP scoring','2 playbooks']},{n:'Growth',p:annual?16000:20000,pop:true,f:['10 users','500 accounts','10 sequences','AI features','Email tracking','WhatsApp','All playbooks','Data export']},{n:'Scale',p:annual?36000:45000,f:['50 users','Unlimited everything','Custom playbooks','API access','Advanced analytics','Priority support']}].map(p=>(
            <div key={p.n} className={`rounded-2xl border-2 p-6 relative ${p.pop?'border-purple-300':'border-gray-200'}`} style={p.pop?{boxShadow:'0 4px 20px rgba(90,24,144,0.1)'}:{}}>
              {p.pop&&<div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{background:'#5a1890'}}>Most popular</div>}
              <h3 className="text-lg font-semibold">{p.n}</h3>
              <div className="mt-2 mb-5">{p.p===0?<span className="text-3xl font-bold">Free</span>:<><span className="text-3xl font-bold">₦{p.p.toLocaleString()}</span><span className="text-sm text-gray-500">/user/mo</span></>}</div>
              <div className="space-y-2.5 mb-6">{p.f.map(f=><div key={f} className="flex items-center gap-2 text-sm text-gray-700"><span className="text-green-500 text-xs">✓</span>{f}</div>)}</div>
              <Link href="/signup" className="block w-full py-2.5 rounded-xl text-sm font-medium text-center" style={p.pop?{background:'#2b0548',color:'#e1b3ee'}:{background:'#f3f4f6',color:'#374151'}}>Get started</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16" style={{background:'#2b0548'}}><div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to stop losing customers?</h2>
        <p className="text-sm mb-6" style={{color:'#e1b3ee'}}>Free forever. No credit card. Set up in 5 minutes.</p>
        <Link href="/signup" className="inline-block px-6 py-3 bg-white rounded-xl text-sm font-medium" style={{color:'#2b0548'}}>Get started free</Link>
      </div></section>

      <footer className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-2"><div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-semibold" style={{background:'#2b0548',color:'#e1b3ee'}}>TB</div>TrailBlaze Africa</div>
        <div className="flex gap-6"><Link href="/legal/terms" className="hover:text-gray-600">Terms</Link><Link href="/legal/privacy" className="hover:text-gray-600">Privacy</Link><a href="mailto:sarah@trailblazeafrica.com" className="hover:text-gray-600">Contact</a></div>
      </footer>
    </div>
  )
}
