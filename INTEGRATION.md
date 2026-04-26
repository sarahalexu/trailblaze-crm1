# TrailBlaze CRM v8 — Integration Guide
# Add these files to your existing v7 codebase

## FILES IN THIS PACKAGE:

### New files to ADD (copy directly):
- supabase/migrations/005_birthday_feedback.sql → Run in Supabase SQL Editor
- src/app/api/birthday/check/route.ts → Birthday cron endpoint
- src/app/api/demo/generate/route.ts → Demo data API (replace v7 version)
- src/components/ui/FeedbackButton.tsx → Bug report floating button
- src/components/ui/Illustrations.tsx → SVG illustrations for empty states
- src/components/analytics/GoogleAnalytics.tsx → GA4 tracking + event helpers
- src/lib/rate-limit.ts → Rate limiting for API routes
- src/lib/sanitize.ts → Input sanitization
- src/lib/sentry.ts → Error monitoring helper

### Files to REPLACE:
- next.config.js → Replace with new version (adds security headers)

### Files to EDIT (add imports):

#### In src/app/layout.tsx — add GoogleAnalytics and FeedbackButton:
```tsx
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'
import FeedbackButton from '@/components/ui/FeedbackButton'
// ... existing imports

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <GoogleAnalytics />
        <OfflineIndicator />
        {children}
        <FeedbackButton />
        <CookieConsent />
      </body>
    </html>
  )
}
```

#### In src/app/api/ai/analyze/route.ts — add rate limiting:
```tsx
import { rateLimit, getClientIP } from '@/lib/rate-limit'
// At the top of your POST handler:
const ip = getClientIP(request)
const check = rateLimit(`ai:${ip}`, 10, 60000) // 10 AI calls per minute
if (!check.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
```

#### In src/app/api/sequences/process/route.ts — add birthday check:
Add to your cron-job.org setup: create a SECOND cron job pointing to:
https://crm.trailblazeafrica.com/api/birthday/check?secret=YOUR_CRON_SECRET
Schedule: Once daily at 7:00 AM WAT

## ENVIRONMENT VARIABLES TO ADD IN VERCEL:
- NEXT_PUBLIC_GA_MEASUREMENT_ID = G-XXXXXXXXXX (from Google Analytics)
- NEXT_PUBLIC_SENTRY_DSN = (from Sentry, when set up)
