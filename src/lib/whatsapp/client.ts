// src/lib/whatsapp/client.ts
// TrailBlaze CRM — WhatsApp Cloud API Integration

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0'

interface SendMessageParams {
  phoneNumberId: string
  accessToken: string
  to: string // recipient phone number in international format
  message: string
  type?: 'text' | 'template'
  templateName?: string
  templateLanguage?: string
  templateComponents?: any[]
}

interface SendMessageResult {
  success: boolean
  messageId?: string
  error?: string
}

// ============================================
// Send a text message via WhatsApp Cloud API
// ============================================
export async function sendWhatsAppMessage(params: SendMessageParams): Promise<SendMessageResult> {
  const { phoneNumberId, accessToken, to, message, type = 'text' } = params

  try {
    let body: any

    if (type === 'template' && params.templateName) {
      body = {
        messaging_product: 'whatsapp',
        to: formatPhoneNumber(to),
        type: 'template',
        template: {
          name: params.templateName,
          language: { code: params.templateLanguage || 'en' },
          components: params.templateComponents || [],
        },
      }
    } else {
      body = {
        messaging_product: 'whatsapp',
        to: formatPhoneNumber(to),
        type: 'text',
        text: { body: message },
      }
    }

    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()

    if (response.ok && data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id }
    }

    return {
      success: false,
      error: data.error?.message || 'Failed to send message',
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============================================
// Mark a message as read
// ============================================
export async function markMessageAsRead(
  phoneNumberId: string,
  accessToken: string,
  messageId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      }
    )
    return response.ok
  } catch {
    return false
  }
}

// ============================================
// Get WhatsApp Business profile
// ============================================
export async function getBusinessProfile(phoneNumberId: string, accessToken: string) {
  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    )
    const data = await response.json()
    return data.data?.[0] || null
  } catch {
    return null
  }
}

// ============================================
// Parse incoming webhook payload
// ============================================
export interface IncomingWhatsAppMessage {
  from: string // sender phone number
  messageId: string
  timestamp: string
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'reaction' | 'unknown'
  text?: string
  mediaId?: string
  caption?: string
  contactName?: string
}

export function parseWebhookPayload(body: any): IncomingWhatsAppMessage[] {
  const messages: IncomingWhatsAppMessage[] = []

  try {
    const entries = body.entry || []
    for (const entry of entries) {
      const changes = entry.changes || []
      for (const change of changes) {
        if (change.field !== 'messages') continue
        const value = change.value
        if (!value.messages) continue

        const contacts = value.contacts || []

        for (const msg of value.messages) {
          const contact = contacts.find((c: any) => c.wa_id === msg.from)

          const parsed: IncomingWhatsAppMessage = {
            from: msg.from,
            messageId: msg.id,
            timestamp: msg.timestamp,
            type: msg.type || 'unknown',
            contactName: contact?.profile?.name,
          }

          if (msg.type === 'text') {
            parsed.text = msg.text?.body
          } else if (['image', 'document', 'audio', 'video'].includes(msg.type)) {
            parsed.mediaId = msg[msg.type]?.id
            parsed.caption = msg[msg.type]?.caption
          }

          messages.push(parsed)
        }
      }
    }
  } catch (error) {
    console.error('Webhook parse error:', error)
  }

  return messages
}

// ============================================
// Parse status updates from webhook
// ============================================
export interface WhatsAppStatusUpdate {
  messageId: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipientId: string
  errorCode?: number
  errorTitle?: string
}

export function parseStatusUpdates(body: any): WhatsAppStatusUpdate[] {
  const updates: WhatsAppStatusUpdate[] = []

  try {
    const entries = body.entry || []
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue
        const statuses = change.value?.statuses || []

        for (const status of statuses) {
          updates.push({
            messageId: status.id,
            status: status.status,
            timestamp: status.timestamp,
            recipientId: status.recipient_id,
            errorCode: status.errors?.[0]?.code,
            errorTitle: status.errors?.[0]?.title,
          })
        }
      }
    }
  } catch (error) {
    console.error('Status parse error:', error)
  }

  return updates
}

// ============================================
// Helpers
// ============================================
function formatPhoneNumber(phone: string): string {
  // Remove spaces, dashes, and ensure starts with country code
  let cleaned = phone.replace(/[\s\-()]/g, '')
  // Nigerian numbers: convert 0xxx to 234xxx
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '234' + cleaned.slice(1)
  }
  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1)
  }
  return cleaned
}

export function isValidWhatsAppNumber(phone: string): boolean {
  const cleaned = formatPhoneNumber(phone)
  return /^\d{10,15}$/.test(cleaned)
}
