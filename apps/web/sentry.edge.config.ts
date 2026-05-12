// Sentry — Edge Runtime configuration
// Runs in Middleware and Edge API routes.
// Minimal config — Edge has limited APIs (no fs, no Node.js builtins).

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',

  // Low sample rate for Edge — middleware runs on every request
  tracesSampleRate: 0,

  // No replays in Edge
  // No Prisma integration in Edge (no Node.js runtime)
})
