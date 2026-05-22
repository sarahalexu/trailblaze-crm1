// src/app/api/v1/contacts/route.ts
// Public REST API for contacts - authenticated via API key

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function authenticateApiKey(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const rawKey = authHeader.substring(7);
  const keyPrefix = rawKey.substring(0, 10);

  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const { data: apiKey } = await supabaseAdmin
    .from('api_keys')
    .select('id, org_id, scopes, is_active, expires_at, request_count')
    .eq('key_prefix', keyPrefix)
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();

  if (!apiKey) return null;
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) return null;

  await supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString(), request_count: apiKey.request_count + 1 })
    .eq('id', apiKey.id);

  return { org_id: apiKey.org_id, scopes: apiKey.scopes || ['read'], key_id: apiKey.id };
}

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  if (!auth.scopes.includes('read')) return NextResponse.json({ error: 'Missing read scope' }, { status: 403 });

  const contactId = req.nextUrl.searchParams.get('id');
  const accountId = req.nextUrl.searchParams.get('account_id');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
  const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

  if (contactId) {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('org_id', auth.org_id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    return NextResponse.json({ contact: data });
  }

  let query = supabaseAdmin
    .from('contacts')
    .select('id, full_name, email, phone_number, whatsapp_number, job_title, role_type, account_id, created_at', { count: 'exact' })
    .eq('org_id', auth.org_id)
    .order('full_name')
    .range(offset, offset + limit - 1);

  if (accountId) query = query.eq('account_id', accountId);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ contacts: data, total: count, limit, offset });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  if (!auth.scopes.includes('write')) return NextResponse.json({ error: 'Missing write scope' }, { status: 403 });

  const body = await req.json();
  const { full_name, email, phone_number, whatsapp_number, job_title, role_type, account_id } = body;

  if (!full_name) return NextResponse.json({ error: 'full_name is required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('contacts')
    .insert({
      org_id: auth.org_id,
      full_name,
      email: email || null,
      phone_number: phone_number || null,
      whatsapp_number: whatsapp_number || null,
      job_title: job_title || null,
      role_type: role_type || null,
      account_id: account_id || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contact: data }, { status: 201 });
}
