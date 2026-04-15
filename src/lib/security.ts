// src/lib/security.ts
// TrailBlaze CRM — Security utilities

// ============================================
// Rate limiter (in-memory for MVP, Redis for production)
// ============================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  identifier: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): { success: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: maxRequests - 1 }
  }

  if (entry.count >= maxRequests) {
    return { success: false, remaining: 0 }
  }

  entry.count++
  return { success: true, remaining: maxRequests - entry.count }
}

// ============================================
// Security headers
// ============================================
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://graph.facebook.com https://generativelanguage.googleapis.com",
    "frame-ancestors 'none'",
  ].join('; '),
}

// ============================================
// Input sanitization
// ============================================
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      (sanitized as any)[key] = sanitizeInput(sanitized[key])
    }
  }
  return sanitized
}

// ============================================
// Token/API key validation
// ============================================
export function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

// ============================================
// Encryption helpers for sensitive data (WhatsApp tokens etc)
// ============================================
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ''

export async function encryptSensitiveData(data: string): Promise<string> {
  // In production, use proper AES-256-GCM encryption
  // For MVP, we store tokens server-side only and never expose to client
  if (!ENCRYPTION_KEY) {
    console.warn('ENCRYPTION_KEY not set — sensitive data stored as-is')
    return data
  }

  // Using Web Crypto API for encryption
  const encoder = new TextEncoder()
  const keyData = encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'AES-GCM' }, false, ['encrypt']
  )

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  )

  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  return Buffer.from(combined).toString('base64')
}

export async function decryptSensitiveData(encryptedData: string): Promise<string> {
  if (!ENCRYPTION_KEY) return encryptedData

  const combined = Buffer.from(encryptedData, 'base64')
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)

  const encoder = new TextEncoder()
  const keyData = encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))

  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']
  )

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  return new TextDecoder().decode(decrypted)
}

// ============================================
// Password validation
// ============================================
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (password.length < 8) errors.push('Must be at least 8 characters')
  if (!/[A-Z]/.test(password)) errors.push('Must contain an uppercase letter')
  if (!/[a-z]/.test(password)) errors.push('Must contain a lowercase letter')
  if (!/[0-9]/.test(password)) errors.push('Must contain a number')
  return { valid: errors.length === 0, errors }
}

// ============================================
// Data export sanitization (prevent PII leaks)
// ============================================
export function sanitizeForExport(data: Record<string, any>[], sensitiveFields: string[]): Record<string, any>[] {
  return data.map(row => {
    const clean = { ...row }
    for (const field of sensitiveFields) {
      delete clean[field]
    }
    return clean
  })
}
