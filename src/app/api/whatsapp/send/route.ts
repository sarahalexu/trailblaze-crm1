// src/app/api/whatsapp/send/route.ts
// Sends WhatsApp messages on behalf of an organization
// Used by: direct chat UI, sequence processor, manual sends

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getOrgWhatsAppConfig,
  sendTextMessage,
  sendTemplateMessage,
  sendMediaMessage,
  logWhatsAppMessage,
  logAsInteraction,
} from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's org
    const { data: userData } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      to,              // phone number to send to
      type,            // 'text', 'template', 'image', 'document'
      message,         // text content (for type: text)
      template_name,   // template name (for type: template)
      template_lang,   // template language code (default: en)
      template_params, // array of {type, text} for template variables
      media_url,       // URL for media messages
      caption,         // caption for media
      filename,        // filename for documents
      contact_id,      // optional: link to a contact
      account_id,      // optional: link to an account
    } = body;

    if (!to) {
      return NextResponse.json({ error: 'Phone number (to) is required' }, { status: 400 });
    }

    // Get org's WhatsApp credentials
    const config = await getOrgWhatsAppConfig(userData.org_id);

    if (!config) {
      return NextResponse.json(
        { error: 'WhatsApp is not connected. Go to Settings > WhatsApp to set it up.' },
        { status: 400 }
      );
    }

    if (!config.is_verified) {
      return NextResponse.json(
        { error: 'WhatsApp connection has not been verified. Go to Settings > WhatsApp to test your connection.' },
        { status: 400 }
      );
    }

    let result;
    let logContent = '';
    let logType = 'text';
    let logTemplateName = undefined;
    let logTemplateParams = undefined;

    switch (type || 'text') {
      case 'text':
        if (!message) {
          return NextResponse.json({ error: 'Message is required for text messages' }, { status: 400 });
        }
        result = await sendTextMessage(config, to, message);
        logContent = message;
        logType = 'text';
        break;

      case 'template':
        if (!template_name) {
          return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
        }
        result = await sendTemplateMessage(
          config,
          to,
          template_name,
          template_lang || 'en',
          template_params
        );
        logContent = `[Template: ${template_name}]`;
        logType = 'template';
        logTemplateName = template_name;
        logTemplateParams = template_params;
        break;

      case 'image':
      case 'document':
      case 'video':
      case 'audio':
        if (!media_url) {
          return NextResponse.json({ error: 'Media URL is required' }, { status: 400 });
        }
        result = await sendMediaMessage(config, to, type, media_url, caption, filename);
        logContent = caption || `[${type}]`;
        logType = type;
        break;

      default:
        return NextResponse.json({ error: `Unsupported message type: ${type}` }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json(
        { error: `Failed to send: ${result.error}` },
        { status: 500 }
      );
    }

    // Log the message
    await logWhatsAppMessage({
      org_id: userData.org_id,
      account_id: account_id || undefined,
      contact_id: contact_id || undefined,
      user_id: userData.org_id ? user.id : undefined,
      whatsapp_message_id: result.message_id,
      from_number: config.display_phone_number || config.phone_number_id,
      to_number: to,
      direction: 'outbound',
      message_type: logType,
      content: logContent,
      template_name: logTemplateName,
      template_params: logTemplateParams,
      status: 'sent',
    });

    // Also log as interaction if account_id provided
    if (account_id) {
      await logAsInteraction({
        org_id: userData.org_id,
        account_id,
        contact_id,
        user_id: user.id,
        direction: 'outbound',
        content: logContent,
      });
    }

    return NextResponse.json({
      success: true,
      message_id: result.message_id,
    });
  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
