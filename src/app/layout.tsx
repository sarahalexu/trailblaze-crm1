// src/app/layout.tsx

import type { Metadata } from 'next'
import '@/styles/globals.css'

import * as Sentry from '@sentry/nextjs'

import CookieConsent from '@/components/ui/CookieConsent'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'
import FeedbackButton from '@/components/ui/FeedbackButton'

export function generateMetadata(): Metadata {
  return {
    title: 'TrailBlaze CRM — Account Management Platform',
    description:
      'AI-powered account management platform with native WhatsApp integration, built for African businesses.',
    icons: { icon: '/favicon.ico' },

    other: {
      ...Sentry.getTraceData(),
    },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <GoogleAnalytics />
        {children}
        <CookieConsent />
        <FeedbackButton />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
                  .then(function(reg) {
                    reg.update();
                  })
                  .catch(function() {});
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  regs.forEach(function(reg) { reg.update(); });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}