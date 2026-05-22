// src/lib/whatsapp.ts
// Core WhatsApp Cloud API helper functions
// All functions pull credentials from the database per organization

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

// ============================================================
// Types
// ============================================================

export interface WhatsAppConfig {
  id: string;
  org_id: string;
  access_token: string;
  phone_number_id: string;
  business_account_id: string;
  verify_token: string;
  display_phone_number: string | null;
  business_name: string | null;
  is_active: boolean;
  is_verified: boolean;
}

export interface SendMessageResult {
  success: boolean;
  message_id?: string;
  error?: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: any[];
}

// ============================================================
// Get org's WhatsApp credentials from database
// ============================================================

export async function getOrgWhatsAppConfig(orgId: string): Promise<WhatsAppConfig | null> {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_config')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data as WhatsAppConfig;
}

// Look up which org owns a given phone number ID (for incoming webhooks)
export async function getOrgByPhoneNumberId(phoneNumberId: string): Promise<WhatsAppConfig | null> {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_config')
    .select('*')
    .eq('phone_number_id', phoneNumberId)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data as WhatsAppConfig;
}

// ============================================================
// Send a text message
// ============================================================

export async function sendTextMessage(
  config: WhatsAppConfig,
  toNumber: string,
  text: string
): Promise<SendMessageResult> {
  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${config.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhoneNumber(toNumber),
          type: 'text',
          text: { body: text },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      message_id: data.messages?.[0]?.id,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// Send a template message (required for initiating conversations)
// ============================================================

export async function sendTemplateMessage(
  config: WhatsAppConfig,
  toNumber: string,
  templateName: string,
  languageCode: string = 'en',
  parameters?: { type: string; text: string }[]
): Promise<SendMessageResult> {
  try {
    const templateBody: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhoneNumber(toNumber),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    };

    if (parameters && parameters.length > 0) {
      templateBody.template.components = [
        {
          type: 'body',
          parameters: parameters.map((p) => ({
            type: 'text',
            text: p.text,
          })),
        },
      ];
    }

    const response = await fetch(
      `${WHATSAPP_API_URL}/${config.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateBody),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      message_id: data.messages?.[0]?.id,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// Send media message (image, document, video)
// ============================================================

export async function sendMediaMessage(
  config: WhatsAppConfig,
  toNumber: string,
  mediaType: 'image' | 'document' | 'video' | 'audio',
  mediaUrl: string,
  caption?: string,
  filename?: string
): Promise<SendMessageResult> {
  try {
    const mediaBody: any = { link: mediaUrl };
    if (caption) mediaBody.caption = caption;
    if (filename && mediaType === 'document') mediaBody.filename = filename;

    const response = await fetch(
      `${WHATSAPP_API_URL}/${config.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhoneNumber(toNumber),
          type: mediaType,
          [mediaType]: mediaBody,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      message_id: data.messages?.[0]?.id,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// Fetch org's approved message templates from Meta
// ============================================================

export async function fetchTemplatesFromMeta(config: WhatsAppConfig): Promise<WhatsAppTemplate[]> {
  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${config.business_account_id}/message_templates?status=APPROVED`,
      {
        headers: {
          'Authorization': `Bearer ${config.access_token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Failed to fetch templates:', data.error);
      return [];
    }

    return (data.data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      language: t.language,
      category: t.category,
      status: t.status,
      components: t.components || [],
    }));
  } catch (err) {
    console.error('Error fetching templates:', err);
    return [];
  }
}

// ============================================================
// Test connection by verifying credentials with Meta
// ============================================================

export async function testConnection(
  accessToken: string,
  phoneNumberId: string
): Promise<{
  success: boolean;
  phone_display?: string;
  business_name?: string;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `Invalid credentials (HTTP ${response.status})`,
      };
    }

    return {
      success: true,
      phone_display: data.display_phone_number,
      business_name: data.verified_name,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// Log a WhatsApp message to the database
// ============================================================

export async function logWhatsAppMessage(params: {
  org_id: string;
  account_id?: string;
  contact_id?: string;
  user_id?: string;
  whatsapp_message_id?: string;
  from_number: string;
  to_number: string;
  direction: 'inbound' | 'outbound';
  message_type?: string;
  content?: string;
  template_name?: string;
  template_params?: any;
  status?: string;
}) {
  const { error } = await supabaseAdmin.from('whatsapp_messages').insert({
    org_id: params.org_id,
    account_id: params.account_id || null,
    contact_id: params.contact_id || null,
    user_id: params.user_id || null,
    whatsapp_message_id: params.whatsapp_message_id || null,
    from_number: params.from_number,
    to_number: params.to_number,
    direction: params.direction,
    message_type: params.message_type || 'text',
    content: params.content || null,
    template_name: params.template_name || null,
    template_params: params.template_params || null,
    status: params.status || 'sent',
  });

  if (error) console.error('Failed to log WhatsApp message:', error);
}

// Also log as an interaction (shows in account timeline)
export async function logAsInteraction(params: {
  org_id: string;
  account_id: string;
  contact_id?: string;
  user_id?: string;
  direction: 'inbound' | 'outbound';
  content: string;
}) {
  const { error } = await supabaseAdmin.from('interactions').insert({
    org_id: params.org_id,
    account_id: params.account_id,
    contact_id: params.contact_id || null,
    user_id: params.user_id || null,
    channel: 'whatsapp',
    direction: params.direction,
    subject: `WhatsApp ${params.direction === 'inbound' ? 'received' : 'sent'}`,
    content: params.content,
    follow_up_required: params.direction === 'inbound',
  });

  if (error) console.error('Failed to log interaction:', error);
}

// ============================================================
// Match incoming phone number to a contact in the org
// ============================================================

export async function findContactByWhatsApp(orgId: string, phoneNumber: string) {
  const cleaned = cleanPhoneNumber(phoneNumber);

  // Try whatsapp_number first, then phone_number
  const { data } = await supabaseAdmin
    .from('contacts')
    .select('id, full_name, email, whatsapp_number, phone_number, account_id, org_id')
    .eq('org_id', orgId)
    .or(`whatsapp_number.ilike.%${cleaned},phone_number.ilike.%${cleaned}`)
    .limit(1)
    .single();

  return data || null;
}

// ============================================================
// Update message delivery/read status (called from webhook)
// ============================================================

export async function updateMessageStatus(
  whatsappMessageId: string,
  status: 'delivered' | 'read' | 'failed',
  errorMessage?: string
) {
  const updates: any = { status };
  if (status === 'delivered') updates.delivered_at = new Date().toISOString();
  if (status === 'read') updates.read_at = new Date().toISOString();
  if (errorMessage) updates.error_message = errorMessage;

  await supabaseAdmin
    .from('whatsapp_messages')
    .update(updates)
    .eq('whatsapp_message_id', whatsappMessageId);
}

// ============================================================
// Helpers
// ============================================================

function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d]/g, '');
  // Nigerian local format: 0803... -> 234803...
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '234' + cleaned.substring(1);
  }
  return cleaned;
}

export { cleanPhoneNumber };
