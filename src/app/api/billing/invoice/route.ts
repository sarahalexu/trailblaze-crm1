// src/app/api/billing/invoice/route.ts
// Generates a printable invoice for a specific payment

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const invoiceId = searchParams.get('id')
  if (!invoiceId) return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, org:organizations(name, billing_email)')
    .eq('id', invoiceId)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .logo { width: 44px; height: 44px; background: #2b0548; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #e1b3ee; font-weight: 600; font-size: 18px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-name { font-size: 18px; font-weight: 600; }
  .invoice-label { text-align: right; }
  .invoice-label h1 { font-size: 28px; color: #2b0548; margin-bottom: 4px; }
  .invoice-label .num { font-size: 14px; color: #666; }
  .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .details div { font-size: 13px; color: #666; line-height: 1.8; }
  .details strong { color: #111; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
  th { text-align: left; padding: 12px 16px; background: #f8f4ff; font-size: 12px; color: #5a1890; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e9e5ff; }
  td { padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
  .total-row td { border-top: 2px solid #2b0548; font-weight: 600; font-size: 16px; background: #faf8ff; }
  .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #999; text-align: center; line-height: 1.8; }
  .paid-badge { display: inline-block; background: #ecfdf5; color: #065f46; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 500; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style></head><body>
  <div class="no-print" style="text-align:center;margin-bottom:20px">
    <button onclick="window.print()" style="padding:10px 24px;background:#2b0548;color:#e1b3ee;border:none;border-radius:8px;font-size:14px;cursor:pointer">Download / Print</button>
  </div>

  <div class="header">
    <div class="brand">
      <div class="logo">TB</div>
      <div>
        <div class="brand-name">TrailBlaze Africa</div>
        <div style="font-size:12px;color:#666">Nigeria's Account Management Ecosystem</div>
      </div>
    </div>
    <div class="invoice-label">
      <h1>INVOICE</h1>
      <div class="num">${invoice.invoice_number}</div>
      <div style="margin-top:8px"><span class="paid-badge">${invoice.status === 'paid' ? '✓ Paid' : invoice.status}</span></div>
    </div>
  </div>

  <div class="details">
    <div>
      <strong>From:</strong><br>
      TrailBlaze Africa<br>
      Lagos, Nigeria<br>
      sarah@trailblazeafrica.com<br>
      trailblazeafrica.com
    </div>
    <div style="text-align:right">
      <strong>To:</strong><br>
      ${invoice.org?.name || 'Customer'}<br>
      ${invoice.customer_email || ''}<br><br>
      <strong>Date:</strong> ${new Date(invoice.paid_at || invoice.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
      <strong>Reference:</strong> ${invoice.paystack_reference || '—'}
    </div>
  </div>

  <table>
    <thead><tr>
      <th>Description</th>
      <th>Qty</th>
      <th>Unit Price</th>
      <th style="text-align:right">Amount</th>
    </tr></thead>
    <tbody>
      <tr>
        <td>TrailBlaze CRM — ${invoice.plan_tier.charAt(0).toUpperCase() + invoice.plan_tier.slice(1)} Plan (${invoice.billing_cycle})</td>
        <td>${invoice.user_count} user${invoice.user_count !== 1 ? 's' : ''}</td>
        <td>₦${(invoice.amount / (invoice.user_count || 1)).toLocaleString()}</td>
        <td style="text-align:right">₦${Number(invoice.amount).toLocaleString()}</td>
      </tr>
      <tr class="total-row">
        <td colspan="3">Total</td>
        <td style="text-align:right">₦${Number(invoice.amount).toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div style="background:#f8f4ff;padding:16px 20px;border-radius:8px;font-size:13px;color:#5a1890;margin-bottom:32px">
    Payment received via Paystack on ${new Date(invoice.paid_at || invoice.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}. Thank you for your business.
  </div>

  <div class="footer">
    TrailBlaze Africa · Lagos, Nigeria · trailblazeafrica.com · sarah@trailblazeafrica.com<br>
    This invoice was generated automatically by TrailBlaze CRM.
  </div>
</body></html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
