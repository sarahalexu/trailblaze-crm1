// src/app/api/whatsapp/test/route.ts
// Tests WhatsApp credentials before saving them

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { testConnection } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can manage WhatsApp settings' }, { status: 403 });
    }

    const { access_token, phone_number_id } = await req.json();

    if (!access_token || !phone_number_id) {
      return NextResponse.json(
        { error: 'Access token and phone number ID are required' },
        { status: 400 }
      );
    }

    const result = await testConnection(access_token, phone_number_id);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('WhatsApp test error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Test failed' },
      { status: 500 }
    );
  }
}
