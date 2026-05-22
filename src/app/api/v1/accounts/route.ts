// src/app/api/v1/accounts/route.ts
// Public REST API for external integrations
// Authenticated via API key in Authorization header

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validate API key and return org_id + scopes
async function authenticateApiKey(req: NextRequest): Promise<{
  org_id: string;
  scopes: string[];
  key_id: string;
} | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const rawKey = authHeader.substring(7);
  const keyPrefix = rawKey.substring(0, 10);

  // Hash the provided key
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Look up the key
  const { data: apiKey } = await supabaseAdmin
    .from('api_keys')
    .select('id, org_id, scopes, is_active, expires_at')
    .eq('key_prefix', keyPrefix)
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();

  if (!apiKey) return null;

  // Check expiry
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) return null;

  // Update usage stats
  await supabaseAdmin
    .from('api_keys')
    .update({
      last_used_at: new Date().toISOString(),
      request_count: (apiKey as any).request_count + 1,
    })
    .eq('id', apiKey.id);

  return {
    org_id: apiKey.org_id,
    scopes: apiKey.scopes || ['read'],
    key_id: apiKey.id,
  };
}

function unauthorized() {
  return NextResponse.json(
    { error: 'Invalid or missing API key. Include: Authorization: Bearer tb_xxx' },
    { status: 401 }
  );
}

function forbidden(scope: string) {
  return NextResponse.json(
    { error: `This API key does not have '${scope}' permission.` },
    { status: 403 }
  );
}

// GET /api/v1/accounts - List accounts
// GET /api/v1/accounts?id=xxx - Get single account
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) return unauthorized();
  if (!auth.scopes.includes('read')) return forbidden('read');

  const accountId = req.nextUrl.searchParams.get('id');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
  const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');
  const status = req.nextUrl.searchParams.get('status'); // healthy, at_risk, critical

  if (accountId) {
    const { data, error } = await supabaseAdmin
      .from('accounts')
      .select('*, contacts(id, full_name, email, whatsapp_number, role_type)')
      .eq('id', accountId)
      .eq('org_id', auth.org_id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    return NextResponse.json({ account: data });
  }

  let query = supabaseAdmin
    .from('accounts')
    .select('id, name, industry, health_status, health_score_total, contract_value_annual, renewal_date, status, last_interaction_at, created_at', { count: 'exact' })
    .eq('org_id', auth.org_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('health_status', status);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    accounts: data,
    total: count,
    limit,
    offset,
  });
}

// POST /api/v1/accounts - Create account
export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) return unauthorized();
  if (!auth.scopes.includes('write')) return forbidden('write');

  try {
    const body = await req.json();

    const { name, industry, website, contract_value_annual, renewal_date, notes } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Get default retention pipeline
    const { data: defaultPipeline } = await supabaseAdmin
      .from('pipelines')
      .select('id, pipeline_stages(id, sort_order)')
      .eq('org_id', auth.org_id)
      .eq('pipeline_type', 'retention')
      .eq('is_default', true)
      .single();

    const firstStage = defaultPipeline?.pipeline_stages
      ?.sort((a: any, b: any) => a.sort_order - b.sort_order)?.[0];

    const { data: account, error } = await supabaseAdmin
      .from('accounts')
      .insert({
        org_id: auth.org_id,
        name,
        industry: industry || null,
        website: website || null,
        contract_value_annual: contract_value_annual || null,
        renewal_date: renewal_date || null,
        notes: notes || null,
        pipeline_id: defaultPipeline?.id || null,
        stage_id: firstStage?.id || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ account }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/v1/accounts - Update account
export async function PATCH(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) return unauthorized();
  if (!auth.scopes.includes('write')) return forbidden('write');

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Only allow safe fields
    const allowed = ['name', 'industry', 'website', 'contract_value_annual', 'renewal_date', 'notes', 'status'];
    const filtered: any = {};
    for (const key of allowed) {
      if (key in updates) filtered[key] = updates[key];
    }

    const { data, error } = await supabaseAdmin
      .from('accounts')
      .update(filtered)
      .eq('id', id)
      .eq('org_id', auth.org_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ account: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
