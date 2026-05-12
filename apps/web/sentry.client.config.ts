// Sentry — Client-side configuration
// Runs in the browser. Captures React errors, performance, and session replays.

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',

  // Performance sampling — lower in production to control volume
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay — capture full session on errors
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text/inputs for privacy (health data is sensitive)
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],

  // Strip sensitive cookies and auth headers before sending
  beforeSend(event) {
    if (event.request?.cookies) {
      delete event.request.cookies
    }
    if (event.request?.headers) {
      const safe = { ...event.request.headers }
      delete safe['authorization']
      delete safe['cookie']
      event.request.headers = safe
    }
    return event
  },

  // Ignore noisy browser errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured with keys: message',
    /^Network Error$/,
    /Loading chunk \d+ failed/,
  ],
})
