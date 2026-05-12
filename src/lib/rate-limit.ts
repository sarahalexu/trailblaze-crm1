const map = new Map<string, { count: number; resetAt: number }>()
export function rateLimit(key: string, limit = 60, windowMs = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now(); const e = map.get(key)
  if (!e || e.resetAt < now) { map.set(key, { count: 1, resetAt: now + windowMs }); return { allowed: true, remaining: limit - 1 } }
  if (e.count >= limit) return { allowed: false, remaining: 0 }
  e.count++; return { allowed: true, remaining: limit - e.count }
}
export function getClientIP(req: Request): string { return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown' }
