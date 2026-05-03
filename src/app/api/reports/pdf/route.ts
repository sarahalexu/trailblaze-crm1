// src/app/api/reports/pdf/route.ts
// Generates a printable branded report — user opens in browser and prints/saves as PDF

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('org_id, full_name').eq('auth_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: org } = await supabase.from('organizations').select('name').eq('id', profile.org_id).single()
  const { data: accounts } = await supabase.from('accounts').select('*').eq('org_id', profile.org_id).order('health_score_total')
  const { data: interactions } = await supabase.from('interactions').select('channel, direction, created_at').eq('org_id', profile.org_id)

  const accs = accounts || []
  const ints = interactions || []
  const healthy = accs.filter(a => a.health_status === 'healthy').length
  const atRisk = accs.filter(a => a.health_status === 'at_risk').length
  const critical = accs.filter(a => a.health_status === 'critical').length
  const totalRevenue = accs.reduce((s, a) => s + (a.contract_value_annual || 0), 0)
  const revenueAtRisk = accs.filter(a => a.health_status !== 'healthy').reduce((s, a) => s + (a.contract_value_annual || 0), 0)
  const avgHealth = accs.length > 0 ? (accs.reduce((s, a) => s + (a.health_score_total || 0), 0) / accs.length).toFixed(1) : '0'

  // Activity by channel
  const channels: Record<string, number> = {}
  ints.forEach(i => { channels[i.channel] = (channels[i.channel] || 0) + 1 })

  // Upcoming renewals (30 days)
  const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30)
  const renewals = accs.filter(a => a.renewal_date && new Date(a.renewal_date) <= thirtyDays && new Date(a.renewal_date) >= new Date())

  const fmtN = (n: number) => n >= 1000000 ? '₦' + (n / 1000000).toFixed(1) + 'M' : '₦' + n.toLocaleString()
  const today = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Account Health Report — ${org?.name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111;padding:40px;max-width:900px;margin:0 auto;font-size:13px;line-height:1.6}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #2b0548}
.logo{display:flex;align-items:center;gap:12px}
.logo-icon{width:40px;height:40px;background:#2b0548;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#e1b3ee;font-weight:600;font-size:16px}
.logo-text{font-size:16px;font-weight:600;color:#2b0548}
.meta{text-align:right;font-size:11px;color:#666}
h1{font-size:22px;color:#2b0548;margin-bottom:4px}
h2{font-size:14px;color:#2b0548;margin:24px 0 12px;padding-bottom:6px;border-bottom:1px solid #e5e7eb}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.card{background:#f8f4ff;border-radius:8px;padding:14px;text-align:center}
.card-value{font-size:24px;font-weight:700;color:#2b0548}
.card-label{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px}
.card-sub{font-size:11px;color:#999;margin-top:2px}
.bar-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.bar-label{width:80px;font-size:11px;color:#666;text-align:right}
.bar-track{flex:1;height:12px;background:#f3f4f6;border-radius:6px;overflow:hidden}
.bar-fill{height:100%;border-radius:6px}
.bar-value{width:30px;font-size:11px;color:#333;font-weight:500}
table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12px}
th{text-align:left;padding:8px 10px;background:#f8f4ff;color:#5a1890;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e9e5ff}
td{padding:8px 10px;border-bottom:1px solid #f3f4f6}
.status{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:500}
.s-healthy{background:#ecfdf5;color:#065f46}
.s-at_risk{background:#fffbeb;color:#92400e}
.s-critical{background:#fef2f2;color:#991b1b}
.ft{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:10px;color:#999;text-align:center}
.np{text-align:center;margin-bottom:20px}
@media print{.np{display:none}body{padding:20px}}
</style></head><body>
<div class="np"><button onclick="window.print()" style="padding:10px 24px;background:#2b0548;color:#e1b3ee;border:none;border-radius:8px;cursor:pointer;font-size:13px">Download as PDF / Print</button></div>

<div class="hdr">
  <div class="logo"><div class="logo-icon">TB</div><div><div class="logo-text">TrailBlaze CRM</div><div style="font-size:11px;color:#666">Account Health Report</div></div></div>
  <div class="meta"><div style="font-size:14px;font-weight:600;color:#111">${org?.name || 'Organization'}</div><div>${today}</div><div>Generated by ${profile.full_name}</div></div>
</div>

<h1>Executive Summary</h1>
<p style="color:#666;margin-bottom:16px">Overview of account health, revenue exposure, and engagement activity across your portfolio.</p>

<div class="grid">
  <div class="card"><div class="card-value">${accs.length}</div><div class="card-label">Total accounts</div></div>
  <div class="card"><div class="card-value">${avgHealth}</div><div class="card-label">Avg KEEP score</div><div class="card-sub">out of 20</div></div>
  <div class="card"><div class="card-value" style="color:#dc2626">${fmtN(revenueAtRisk)}</div><div class="card-label">Revenue at risk</div><div class="card-sub">${atRisk + critical} accounts</div></div>
  <div class="card"><div class="card-value">${renewals.length}</div><div class="card-label">Renewals (30d)</div><div class="card-sub">${fmtN(renewals.reduce((s: number, a: any) => s + (a.contract_value_annual || 0), 0))}</div></div>
</div>

<h2>Account Health Distribution</h2>
<div style="margin-bottom:20px">
  ${[{l:'Healthy',v:healthy,c:'#1D9E75'},{l:'At Risk',v:atRisk,c:'#d97706'},{l:'Critical',v:critical,c:'#dc2626'}].map(d => `
  <div class="bar-row">
    <div class="bar-label">${d.l}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${accs.length > 0 ? (d.v / accs.length * 100) : 0}%;background:${d.c}"></div></div>
    <div class="bar-value">${d.v}</div>
  </div>`).join('')}
</div>

<h2>Activity Summary (${ints.length} total interactions)</h2>
<div style="margin-bottom:20px">
  ${Object.entries(channels).sort((a, b) => b[1] - a[1]).map(([ch, count]) => `
  <div class="bar-row">
    <div class="bar-label">${ch}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${ints.length > 0 ? (count / ints.length * 100) : 0}%;background:#5a1890"></div></div>
    <div class="bar-value">${count}</div>
  </div>`).join('')}
</div>

<h2>All Accounts (sorted by health score)</h2>
<table>
  <thead><tr><th>Account</th><th>Industry</th><th>KEEP</th><th>Status</th><th>Contract Value</th><th>Renewal</th><th>Last Contact</th></tr></thead>
  <tbody>
    ${accs.map(a => `<tr>
      <td style="font-weight:500">${a.name}</td>
      <td>${a.industry || '—'}</td>
      <td><strong>${a.health_score_total}</strong>/20</td>
      <td><span class="status s-${a.health_status}">${a.health_status === 'at_risk' ? 'At risk' : a.health_status}</span></td>
      <td>${a.contract_value_annual ? fmtN(a.contract_value_annual) : '—'}</td>
      <td>${a.renewal_date ? new Date(a.renewal_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : '—'}</td>
      <td>${a.last_interaction_at ? new Date(a.last_interaction_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : 'Never'}</td>
    </tr>`).join('')}
  </tbody>
</table>

${atRisk + critical > 0 ? `
<h2>Accounts Requiring Attention</h2>
<table>
  <thead><tr><th>Account</th><th>KEEP Score</th><th>Status</th><th>Revenue at Risk</th><th>Days Since Contact</th></tr></thead>
  <tbody>
    ${accs.filter(a => a.health_status !== 'healthy').map(a => {
      const daysSince = a.last_interaction_at ? Math.floor((Date.now() - new Date(a.last_interaction_at).getTime()) / 86400000) : 999
      return `<tr>
        <td style="font-weight:500">${a.name}</td>
        <td><strong>${a.health_score_total}</strong>/20 (K:${a.health_score_know} E:${a.health_score_engage} Ex:${a.health_score_exceed} P:${a.health_score_prevent})</td>
        <td><span class="status s-${a.health_status}">${a.health_status === 'at_risk' ? 'At risk' : a.health_status}</span></td>
        <td style="color:#dc2626;font-weight:500">${a.contract_value_annual ? fmtN(a.contract_value_annual) : '—'}</td>
        <td>${daysSince > 900 ? 'Never contacted' : daysSince + ' days'}</td>
      </tr>`
    }).join('')}
  </tbody>
</table>` : ''}

${renewals.length > 0 ? `
<h2>Upcoming Renewals (Next 30 Days)</h2>
<table>
  <thead><tr><th>Account</th><th>Renewal Date</th><th>Contract Value</th><th>Health</th></tr></thead>
  <tbody>
    ${renewals.map(a => `<tr>
      <td style="font-weight:500">${a.name}</td>
      <td>${new Date(a.renewal_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
      <td>${a.contract_value_annual ? fmtN(a.contract_value_annual) : '—'}</td>
      <td><span class="status s-${a.health_status}">${a.health_score_total}/20</span></td>
    </tr>`).join('')}
  </tbody>
</table>` : ''}

<div class="ft">
  <p>Generated by TrailBlaze CRM on ${today} · trailblazeafrica.com</p>
  <p style="margin-top:4px">This report contains confidential business information. Do not share externally without authorization.</p>
</div>
</body></html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
