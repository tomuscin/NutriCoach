// Sentry — Server-side configuration
// Runs in Node.js runtime (server components, server actions, API routes).
// Note: loaded via instrumentation.ts register() hook.

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Strip sensitive data before sending to Sentry
  beforeSend(event) {
    // Redact sensitive fields from extras
    if (event.extra) {
      const redacted = { ...event.extra }
      for (const key of Object.keys(redacted)) {
        if (/password|token|secret|authorization|cookie|api.?key/i.test(key)) {
          redacted[key] = '[REDACTED]'
        }
      }
      event.extra = redacted
    }
    // Never send stack traces of auth-related code to Sentry in production
    if (process.env.NODE_ENV === 'production' && event.exception) {
      const frames = event.exception.values?.[0]?.stacktrace?.frames ?? []
      // Remove absolute local paths
      for (const frame of frames) {
        if (frame.filename?.includes('/home/') || frame.filename?.includes('/Users/')) {
          frame.filename = frame.filename.replace(/^.*\/NutriCoach\//, '~/')
        }
      }
    }
    return event
  },
})
