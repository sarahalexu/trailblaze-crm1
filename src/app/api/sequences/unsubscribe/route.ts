// src/app/api/sequences/unsubscribe/route.ts
// Handles unsubscribe requests from sequence emails
import { getAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const enrollmentId = searchParams.get('eid')
  const contactId = searchParams.get('cid')

  if (!enrollmentId && !contactId) {
    return new NextResponse(renderPage('Invalid unsubscribe link.', false), { headers: { 'Content-Type': 'text/html' } })
  }

  const supabaseAdmin = getAdminClient()

  try {
    if (enrollmentId) {
      // Unsubscribe from specific sequence
      await supabaseAdmin.from('sequence_enrollments')
        .update({ status: 'unsubscribed', completed_at: new Date().toISOString() })
        .eq('id', enrollmentId)
    }

    if (contactId) {
      // Unsubscribe from ALL sequences for this contact
      await supabaseAdmin.from('sequence_enrollments')
        .update({ status: 'unsubscribed', completed_at: new Date().toISOString() })
        .eq('contact_id', contactId)
        .eq('status', 'active')
    }

    return new NextResponse(renderPage('You have been unsubscribed successfully. You will no longer receive automated messages from this sequence.', true), {
      headers: { 'Content-Type': 'text/html' },
    })
  } catch (err) {
    return new NextResponse(renderPage('Something went wrong. Please contact the sender directly.', false), {
      headers: { 'Content-Type': 'text/html' },
    })
  }
}

function renderPage(message: string, success: boolean): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe — TrailBlaze CRM</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fb;padding:20px}
.box{text-align:center;max-width:420px;background:white;padding:40px;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06)}
.icon{width:48px;height:48px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:16px;background:${success ? '#ecfdf5' : '#fef2f2'}}
h1{font-size:18px;color:#111;margin-bottom:8px}p{font-size:14px;color:#666;line-height:1.6}
</style></head><body><div class="box"><div class="icon">${success ? '✓' : '⚠'}</div><h1>${success ? 'Unsubscribed' : 'Error'}</h1><p>${message}</p></div></body></html>`
}
