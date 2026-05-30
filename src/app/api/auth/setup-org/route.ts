// src/app/api/auth/setup-org/route.ts

import { getAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabaseAdmin = getAdminClient()

  try {
    const {
      auth_id,
      full_name,
      email,
      date_of_birth,
      org_name,
      industry,
    } = await request.json()

    if (!auth_id || !full_name || !email || !org_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const slug =
      org_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Math.random().toString(36).substring(2, 6)

    // CREATE ORGANIZATION
    const { data: org, error: orgError } = await (supabaseAdmin
      .from('organizations') as any)
      .insert([
        {
          name: org_name,
          slug,
          industry,
          plan_tier: 'beta',
          subscription_status: 'beta',
        },
      ])
      .select()
      .single()

    if (orgError) {
      throw orgError
    }

    // CREATE USER
    const { data: newUser, error: userError } = await (supabaseAdmin
      .from('users') as any)
      .insert([
        {
          org_id: org.id,
          auth_id,
          email,
          full_name,
          date_of_birth,
          role: 'admin',
        },
      ])
      .select()
      .single()

    if (userError) {
      throw userError
    }

    // RUN SETUP FUNCTION
    const { error: setupError } = await (supabaseAdmin as any).rpc(
      'setup_new_organization',
      {
        p_org_id: org.id,
        p_plan_tier: 'beta',
      }
    )

    if (setupError) {
      throw setupError
    }

    // SEND WELCOME EMAIL (non-blocking)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/billing/lifecycle-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'welcome',
        userId: newUser.id,
        orgId: org.id,
      }),
    }).catch((err) => {
      console.error('Welcome email failed:', err)
    })

    return NextResponse.json({
      success: true,
      org_id: org.id,
    })
  } catch (error: any) {
    console.error('Org setup error:', error)

    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    )
  }
}