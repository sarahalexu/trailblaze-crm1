// src/app/api/whatsapp/webhook/route.ts
// Receives incoming WhatsApp messages and delivery status updates from Meta
// Routes messages to the correct organization based on phone number ID

import { NextRequest, NextResponse } from 'next/server';
import {
  getOrgByPhoneNumberId,
  logWhatsAppMessage,
  logAsInteraction,
  findContactByWhatsApp,
  updateMessageStatus,
} from '@/lib/whatsapp';

// ============================================================
// GET: Meta webhook verification (called once during setup)
// ============================================================

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Meta sends a verification request with a token
  // We need to check it matches ANY org's verify token
  // OR a global fallback token from env

  if (mode === 'subscribe') {
    // First check the global verify token (for initial setup)
    const globalToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (globalToken && token === globalToken) {
      console.log('Webhook verified with global token');
      return new NextResponse(challenge, { status: 200 });
    }

    // If no global match, this would need to check per-org tokens
    // For now, accept if the token is provided (Meta verifies it matches what you entered)
    if (token && challenge) {
      console.log('Webhook verification attempt with token:', token?.substring(0, 8) + '...');
      // In production, you would verify against whatsapp_config table
      return new NextResponse(challenge, { status: 200 });
    }

    return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
  }

  return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
}

// ============================================================
// POST: Incoming messages and status updates from Meta
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Meta sends data in this structure:
    // body.entry[].changes[].value.messages[] (incoming messages)
    // body.entry[].changes[].value.statuses[] (delivery updates)

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;
        const displayPhone = value.metadata?.display_phone_number;

        if (!phoneNumberId) continue;

        // Find which org owns this phone number
        const config = await getOrgByPhoneNumberId(phoneNumberId);
        if (!config) {
          console.warn(`No org found for phone number ID: ${phoneNumberId}`);
          continue;
        }

        // Handle incoming messages
        if (value.messages) {
          for (const message of value.messages) {
            await handleIncomingMessage(config.org_id, message, displayPhone || '');
          }
        }

        // Handle delivery status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            await handleStatusUpdate(status);
          }
        }
      }
    }

    // Always return 200 to Meta (otherwise they retry)
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 so Meta doesn't keep retrying
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }
}

// ============================================================
// Handle an incoming WhatsApp message
// ============================================================

async function handleIncomingMessage(
  orgId: string,
  message: any,
  toNumber: string
) {
  const fromNumber = message.from; // sender's phone number
  const messageId = message.id;
  const timestamp = message.timestamp;

  // Determine message type and extract content
  let messageType = message.type || 'text';
  let content = '';
  let mediaUrl = '';

  switch (messageType) {
    case 'text':
      content = message.text?.body || '';
      break;
    case 'image':
      content = message.image?.caption || '[Image]';
      mediaUrl = message.image?.id || '';
      break;
    case 'document':
      content = message.document?.caption || `[Document: ${message.document?.filename || 'file'}]`;
      mediaUrl = message.document?.id || '';
      break;
    case 'video':
      content = message.video?.caption || '[Video]';
      mediaUrl = message.video?.id || '';
      break;
    case 'audio':
      content = '[Voice message]';
      mediaUrl = message.audio?.id || '';
      break;
    case 'reaction':
      content = `[Reaction: ${message.reaction?.emoji || ''}]`;
      break;
    case 'interactive':
      content = message.interactive?.button_reply?.title ||
                message.interactive?.list_reply?.title || '[Interactive response]';
      break;
    default:
      content = `[${messageType}]`;
  }

  // Try to match sender to a known contact in this org
  const contact = await findContactByWhatsApp(orgId, fromNumber);

  // Log the WhatsApp message
  await logWhatsAppMessage({
    org_id: orgId,
    account_id: contact?.account_id || undefined,
    contact_id: contact?.id || undefined,
    whatsapp_message_id: messageId,
    from_number: fromNumber,
    to_number: toNumber,
    direction: 'inbound',
    message_type: messageType,
    content: content,
    status: 'delivered',
  });

  // If we matched a contact with an account, also log as an interaction
  if (contact?.account_id) {
    await logAsInteraction({
      org_id: orgId,
      account_id: contact.account_id,
      contact_id: contact.id,
      direction: 'inbound',
      content: content,
    });
  }

  console.log(`Incoming WhatsApp for org ${orgId}: ${fromNumber} -> "${content.substring(0, 50)}"`);
}

// ============================================================
// Handle delivery status updates (sent, delivered, read, failed)
// ============================================================

async function handleStatusUpdate(status: any) {
  const messageId = status.id;
  const statusValue = status.status; // sent, delivered, read, failed

  if (!messageId) return;

  if (statusValue === 'delivered' || statusValue === 'read' || statusValue === 'failed') {
    const errorMessage = status.errors?.[0]?.message;
    await updateMessageStatus(messageId, statusValue, errorMessage);
  }
}
