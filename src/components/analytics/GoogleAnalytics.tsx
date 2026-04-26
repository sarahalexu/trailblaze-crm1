// src/components/analytics/GoogleAnalytics.tsx
// Add this component to your root layout (src/app/layout.tsx)
// Usage: <GoogleAnalytics measurementId="G-XXXXXXXXXX" />

'use client'

import Script from 'next/script'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export default function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
            cookie_flags: 'SameSite=None;Secure',
          });
        `}
      </Script>
    </>
  )
}

// Custom event tracking helper — use throughout the app
// Import: import { trackEvent } from '@/components/analytics/GoogleAnalytics'
export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params)
  }
}

// Pre-defined events for key user actions
export const CRMEvents = {
  signUp: () => trackEvent('sign_up', { method: 'email' }),
  signUpGoogle: () => trackEvent('sign_up', { method: 'google' }),
  accountCreated: (industry?: string) => trackEvent('account_created', { industry }),
  firstAccountCreated: () => trackEvent('first_account_created'),
  interactionLogged: (channel: string) => trackEvent('interaction_logged', { channel }),
  sequenceCreated: (channel: string) => trackEvent('sequence_created', { channel }),
  contactEnrolled: () => trackEvent('contact_enrolled'),
  keepScoreUpdated: (total: number) => trackEvent('keep_score_updated', { total }),
  playbookActivated: (name: string) => trackEvent('playbook_activated', { playbook_name: name }),
  aiUsed: (action: string) => trackEvent('ai_feature_used', { action }),
  csvImported: (count: number) => trackEvent('csv_imported', { account_count: count }),
  demoDataLoaded: () => trackEvent('demo_data_loaded'),
  tourStarted: () => trackEvent('product_tour_started'),
  tourCompleted: () => trackEvent('product_tour_completed'),
  planUpgradeClicked: (fromPlan: string) => trackEvent('upgrade_clicked', { from_plan: fromPlan }),
  feedbackSubmitted: (type: string) => trackEvent('feedback_submitted', { type }),
  darkModeToggled: (enabled: boolean) => trackEvent('dark_mode_toggled', { enabled }),
}
