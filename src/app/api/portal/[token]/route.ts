// src/app/api/portal/[token]/route.ts
// Public API - serves client portal data based on access token

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    // Look up portal access by token
    const { data: access, error } = await supabaseAdmin
      .from('portal_access')
      .select('*')
      .eq('access_token', token)
      .eq('is_active', true)
      .single();

    if (error || !access) {
      return NextResponse.json(
        { error: 'Invalid or expired access link.' },
        { status: 403 }
      );
    }

    // Check expiry
    if (access.expires_at && new Date(access.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This portal link has expired. Contact your account manager for a new one.' },
        { status: 403 }
      );
    }

    // Update last accessed
    await supabaseAdmin
      .from('portal_access')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', access.id);

    // Fetch account
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('name, health_status, health_score_total, health_score_know, health_score_engage, health_score_exceed, health_score_prevent, renewal_date, industry')
      .eq('id', access.account_id)
      .single();

    // Fetch contact
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('full_name, email')
      .eq('id', access.contact_id)
      .single();

    // Fetch org name
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name:id')
      .eq('id', access.org_id)
      .single();

    const permissions = access.permissions || {
      view_health: true,
      view_interactions: false,
      view_playbooks: false,
      submit_feedback: true,
    };

    // Fetch interactions if permitted
    let interactions: any[] = [];
    if (permissions.view_interactions) {
      const { data } = await supabaseAdmin
        .from('interactions')
        .select('id, channel, subject, content, created_at')
        .eq('account_id', access.account_id)
        .order('created_at', { ascending: false })
        .limit(20);
      interactions = data || [];
    }

    // Fetch playbook progress if permitted
    let playbooks: any[] = [];
    if (permissions.view_playbooks) {
      const { data: assignments } = await supabaseAdmin
        .from('playbook_assignments')
        .select('id, status, playbooks(name), playbook_step_progress(status)')
        .eq('account_id', access.account_id);

      playbooks = (assignments || []).map((a: any) => {
        const totalSteps = a.playbook_step_progress?.length || 1;
        const completedSteps = a.playbook_step_progress?.filter((s: any) => s.status === 'completed').length || 0;
        return {
          id: a.id,
          name: a.playbooks?.name || 'Playbook',
          status: a.status,
          progress: Math.round((completedSteps / totalSteps) * 100),
        };
      });
    }

    return NextResponse.json({
      account: account || {},
      contact: contact || {},
      org: { name: 'Your Account Manager' },
      permissions,
      interactions,
      playbooks,
    });
  } catch (err: any) {
    console.error('Portal error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
