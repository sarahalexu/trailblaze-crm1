import * as Sentry from '@sentry/nextjs'

export function captureError(error: Error, context?: Record<string, any>) {console.error('[TB Error]', error.message, context)

  Sentry.captureException(error, {
    extra: context,
  })
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') { console.log(`[TB ${level}]`, message)

  Sentry.captureMessage(message, level)
}