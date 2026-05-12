// src/app/layout.tsx
import type { Metadata } from 'next'
import '@/styles/globals.css'
import CookieConsent from '@/components/ui/CookieConsent'
import OfflineIndicator from '@/components/ui/OfflineIndicator'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'
import FeedbackButton from '@/components/ui/FeedbackButton'

export const metadata: Metadata = {
  title: 'TrailBlaze CRM — Account Management Platform',
  description: 'AI-powered account management platform with native WhatsApp integration, built for African businesses.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <OfflineIndicator />
        {children}
        <CookieConsent />
        <FeedbackButton />
      </body>
    </html>
  )
}
