// src/app/api/portal/[token]/feedback/route.ts
// Public API - handles feedback submissions from client portal

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    // Validate token
    const { data: access } = await supabaseAdmin
      .from('portal_access')
      .select('*')
      .eq('access_token', token)
      .eq('is_active', true)
      .single();

    if (!access) {
      return NextResponse.json({ error: 'Invalid access.' }, { status: 403 });
    }

    const permissions = access.permissions || {};
    if (!permissions.submit_feedback) {
      return NextResponse.json({ error: 'Feedback not enabled.' }, { status: 403 });
    }

    const { rating, message, category } = await req.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('portal_feedback').insert({
      org_id: access.org_id,
      account_id: access.account_id,
      contact_id: access.contact_id,
      portal_access_id: access.id,
      rating,
      message: message || null,
      category: category || 'general',
    });

    if (error) throw error;

    // Also create a notification for the account manager
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('assigned_user_id, name')
      .eq('id', access.account_id)
      .single();

    if (account?.assigned_user_id) {
      await supabaseAdmin.from('notifications').insert({
        user_id: account.assigned_user_id,
        org_id: access.org_id,
        type: 'portal_feedback',
        title: 'New Portal Feedback',
        message: `${access.contact_id ? 'A client' : 'Someone'} left ${rating}-star feedback for ${account.name}.`,
        reference_type: 'account',
        reference_id: access.account_id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Portal feedback error:', err);
    return NextResponse.json({ error: 'Failed to submit.' }, { status: 500 });
  }
}
