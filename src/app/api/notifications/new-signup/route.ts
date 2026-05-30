// src/app/api/notifications/new-signup/route.ts
// Call this after a new user signs up to notify the admin (Sarah)
// Add to your signup/setup-org flow: fetch('/api/notifications/new-signup', { method: 'POST', body: JSON.stringify({ userId, orgId }) })

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BREVO_API_KEY = process.env.MAILERLITE_API_KEY
const ADMIN_EMAIL = 'sarah@trailblazeafrica.com'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await req.json()

    // Get the new user's details
    const { data: newUser } = await supabaseAdmin.from('users').select('full_name, email').eq('id', userId).single()
    const { data: org } = await supabaseAdmin.from('organizations').select('name, plan_tier').eq('id', orgId).single()

    if (!newUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const userName = newUser.full_name || 'Unknown'
    const userEmail = newUser.email || 'Unknown'
    const orgName = org?.name || 'Unknown'
    const plan = org?.plan_tier || 'starter'

    // Find the super admin to notify (first admin user)
    const { data: adminUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    // Create in-app notification for admin
    if (adminUser) {
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: adminUser.id,
          org_id: orgId,
          type: 'team_mention',
          title: 'New signup',
          message: `${userName} (${userEmail}) just signed up for ${orgName} on the ${plan} plan.`,
        })
      } catch (e) {
        console.error('Failed to create signup notification:', e)
      }
    }

    // Send email notification to admin
    if (BREVO_API_KEY) {
      try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: { name: 'TrailBlaze CRM', email: 'support@trailblazeafrica.com' },
            to: [{ email: ADMIN_EMAIL, name: 'Sarah' }],
            subject: `New CRM Signup: ${userName}`,
            htmlContent: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 24px;">
                <h2 style="color: #2b0548;">New Signup</h2>
                <p><strong>Name:</strong> ${userName}</p>
                <p><strong>Email:</strong> ${userEmail}</p>
                <p><strong>Organization:</strong> ${orgName}</p>
                <p><strong>Plan:</strong> ${plan}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString('en-NG')}</p>
                <a href="https://crm.trailblazeafrica.com/super-admin" style="display:inline-block; background:#2b0548; color:#e1b3ee; padding:10px 20px; border-radius:8px; text-decoration:none; margin-top:12px;">View in Admin</a>
              </div>
            `,
          }),
        })
      } catch (e) {
        console.error('Failed to send signup email:', e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Signup notification error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
