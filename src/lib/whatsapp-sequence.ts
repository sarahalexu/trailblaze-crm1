// src/lib/whatsapp-sequence.ts
// Helper for the sequence processor to send WhatsApp messages
// Import this in /api/sequences/process/route.ts

import {
  getOrgWhatsAppConfig,
  sendTextMessage,
  sendTemplateMessage,
  logWhatsAppMessage,
  logAsInteraction,
} from '@/lib/whatsapp';

interface SequenceWhatsAppParams {
  org_id: string;
  contact_id: string;
  account_id?: string;
  phone_number: string;  // contact's WhatsApp number
  message: string;       // the message text from the sequence step
  template_name?: string; // optional: use a template instead of text
  template_params?: { type: string; text: string }[];
  enrollment_id: string;
  step_id: string;
}

export async function sendSequenceWhatsApp(params: SequenceWhatsAppParams): Promise<{
  success: boolean;
  message_id?: string;
  error?: string;
}> {
  // Get the org's WhatsApp credentials from the database
  const config = await getOrgWhatsAppConfig(params.org_id);

  if (!config) {
    return {
      success: false,
      error: 'WhatsApp not connected for this organization',
    };
  }

  if (!config.is_verified) {
    return {
      success: false,
      error: 'WhatsApp connection not verified',
    };
  }

  let result;

  if (params.template_name) {
    // Send as template message
    result = await sendTemplateMessage(
      config,
      params.phone_number,
      params.template_name,
      'en',
      params.template_params
    );
  } else {
    // Send as text message (only works within 24-hour window)
    result = await sendTextMessage(config, params.phone_number, params.message);
  }

  if (result.success) {
    // Log to whatsapp_messages table
    await logWhatsAppMessage({
      org_id: params.org_id,
      account_id: params.account_id,
      contact_id: params.contact_id,
      whatsapp_message_id: result.message_id,
      from_number: config.display_phone_number || config.phone_number_id,
      to_number: params.phone_number,
      direction: 'outbound',
      message_type: params.template_name ? 'template' : 'text',
      content: params.message,
      template_name: params.template_name,
      template_params: params.template_params,
      status: 'sent',
    });

    // Also log as interaction in the account timeline
    if (params.account_id) {
      await logAsInteraction({
        org_id: params.org_id,
        account_id: params.account_id,
        contact_id: params.contact_id,
        direction: 'outbound',
        content: params.template_name
          ? `[Sequence] Template: ${params.template_name}`
          : `[Sequence] ${params.message}`,
      });
    }
  }

  return result;
}
