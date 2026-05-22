// src/app/api/whatsapp/templates/route.ts
// Fetches and caches approved WhatsApp message templates from Meta

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getOrgWhatsAppConfig, fetchTemplatesFromMeta } from '@/lib/whatsapp';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const config = await getOrgWhatsAppConfig(userData.org_id);

    if (!config) {
      return NextResponse.json(
        { error: 'WhatsApp not connected' },
        { status: 400 }
      );
    }

    // Check if we should use cached templates or fetch fresh
    const forceRefresh = req.nextUrl.searchParams.get('refresh') === 'true';

    if (!forceRefresh) {
      // Return cached templates if synced within last hour
      const { data: cached } = await supabaseAdmin
        .from('whatsapp_templates')
        .select('*')
        .eq('org_id', userData.org_id)
        .gte('last_synced_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (cached && cached.length > 0) {
        return NextResponse.json({ templates: cached, cached: true });
      }
    }

    // Fetch fresh from Meta
    const templates = await fetchTemplatesFromMeta(config);

    // Clear old cache and insert fresh
    await supabaseAdmin
      .from('whatsapp_templates')
      .delete()
      .eq('org_id', userData.org_id);

    if (templates.length > 0) {
      await supabaseAdmin.from('whatsapp_templates').insert(
        templates.map((t) => ({
          org_id: userData.org_id,
          template_id: t.id,
          name: t.name,
          language: t.language,
          category: t.category,
          status: t.status,
          components: t.components,
          last_synced_at: new Date().toISOString(),
        }))
      );
    }

    return NextResponse.json({ templates, cached: false });
  } catch (error: any) {
    console.error('Templates fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
