// src/lib/paystack.ts
// TrailBlaze CRM — Paystack Payment Integration

const PAYSTACK_API_URL = 'https://api.paystack.co'
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || ''

interface InitializePaymentParams {
  email: string
  amount: number // in kobo (NGN * 100)
  reference?: string
  plan?: string // Paystack plan code for subscriptions
  metadata?: Record<string, any>
  callbackUrl?: string
}

interface PaystackResponse {
  success: boolean
  data?: any
  error?: string
}

// ============================================
// Initialize a payment transaction
// ============================================
export async function initializePayment(params: InitializePaymentParams): Promise<PaystackResponse> {
  try {
    const body: any = {
      email: params.email,
      amount: params.amount,
      currency: 'NGN',
      callback_url: params.callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing/callback`,
      metadata: {
        ...params.metadata,
        custom_fields: [
          { display_name: 'Product', variable_name: 'product', value: 'TrailBlaze CRM' },
        ],
      },
    }

    if (params.reference) body.reference = params.reference
    if (params.plan) body.plan = params.plan

    const response = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return { success: data.status, data: data.data, error: data.message }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============================================
// Verify a transaction
// ============================================
export async function verifyTransaction(reference: string): Promise<PaystackResponse> {
  try {
    const response = await fetch(`${PAYSTACK_API_URL}/transaction/verify/${reference}`, {
      headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET}` },
    })
    const data = await response.json()
    return { success: data.status && data.data?.status === 'success', data: data.data, error: data.message }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============================================
// Create a subscription plan in Paystack
// ============================================
export async function createPlan(params: {
  name: string
  interval: 'monthly' | 'annually'
  amount: number // in kobo
}): Promise<PaystackResponse> {
  try {
    const response = await fetch(`${PAYSTACK_API_URL}/plan`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: params.name,
        interval: params.interval,
        amount: params.amount,
        currency: 'NGN',
      }),
    })
    const data = await response.json()
    return { success: data.status, data: data.data, error: data.message }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============================================
// Create a subscription for a customer
// ============================================
export async function createSubscription(params: {
  customer: string // customer email or code
  plan: string // plan code
  authorization?: string // payment authorization code from previous transaction
}): Promise<PaystackResponse> {
  try {
    const response = await fetch(`${PAYSTACK_API_URL}/subscription`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
    const data = await response.json()
    return { success: data.status, data: data.data, error: data.message }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============================================
// Cancel a subscription
// ============================================
export async function cancelSubscription(subscriptionCode: string, emailToken: string): Promise<PaystackResponse> {
  try {
    const response = await fetch(`${PAYSTACK_API_URL}/subscription/disable`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
    })
    const data = await response.json()
    return { success: data.status, data: data.data, error: data.message }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============================================
// Verify Paystack webhook signature
// ============================================
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const crypto = require('crypto')
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(body)
    .digest('hex')
  return hash === signature
}

// ============================================
// Plan pricing in kobo (NGN * 100)
// ============================================
export const PLAN_PRICING = {
  growth: {
    monthly: 2000000, // ₦20,000
    annual: 19200000, // ₦192,000 (₦16,000/mo × 12)
  },
  scale: {
    monthly: 4500000, // ₦45,000
    annual: 43200000, // ₦432,000 (₦36,000/mo × 12)
  },
}
