// src/app/api/track/open/route.ts
import { getAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const trackingId = searchParams.get('t')
  if (trackingId) {
    try {
      const supabaseAdmin = getAdminClient()
      const now = new Date().toISOString()
      const { data: tracking } = await supabaseAdmin.from('email_tracking').select('id, open_count, first_opened_at, send_log_id').eq('tracking_id', trackingId).single()
      if (tracking) {
        await supabaseAdmin.from('email_tracking').update({
          open_count: (tracking.open_count || 0) + 1,
          first_opened_at: tracking.first_opened_at || now,
          last_opened_at: now,
          user_agent: request.headers.get('user-agent') || '',
        }).eq('id', tracking.id)
        if (tracking.send_log_id) {
          await supabaseAdmin.from('sequence_send_log').update({ status: 'opened', opened_at: now }).eq('id', tracking.send_log_id).is('opened_at', null)
        }
      }
    } catch (e) {}
  }
  return new NextResponse(PIXEL, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' } })
}
