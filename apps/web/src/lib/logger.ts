// Structured Logger — pino
// Server-only. Import only from Server Components, Server Actions, API routes.
// Usage:
//   import { logger } from '@/lib/logger'
//   import { dashboardLogger } from '@/lib/logger'
//   logger.info({ userId, ms }, 'dashboard loaded')

import 'server-only'
import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),

  // Always output ISO timestamps
  timestamp: pino.stdTimeFunctions.isoTime,

  // Field formatting
  formatters: {
    level(label) {
      return { level: label }
    },
    // Remove pid/hostname in production — Vercel adds its own
    bindings() {
      return {}
    },
  },

  // Base fields on every log line
  base: {
    app: 'leaxaro',
    env: process.env.NODE_ENV ?? 'development',
    version: process.env.npm_package_version ?? '0.1.0',
  },

  // Automatically redact sensitive fields wherever they appear in the log object
  redact: {
    paths: [
      'password',
      'token',
      'secret',
      'authorization',
      'cookie',
      'apiKey',
      'api_key',
      '*.password',
      '*.token',
      '*.secret',
      '*.apiKey',
      '*.api_key',
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
    ],
    censor: '[REDACTED]',
  },
})

// ─── Domain loggers (add module tag automatically) ────────────────────────────

export const dashboardLogger = logger.child({ module: 'dashboard' })
export const importLogger = logger.child({ module: 'import' })
export const authLogger = logger.child({ module: 'auth' })
export const healthLogger = logger.child({ module: 'health' })
export const aiLogger = logger.child({ module: 'ai' })

// ─── Timing helper ────────────────────────────────────────────────────────────

/**
 * Creates a stopwatch. Call `.end(fields?)` to log the elapsed time.
 * Usage:
 *   const t = timer(log, 'getDashboardData')
 *   // ...work...
 *   t.end({ userId })
 */
export function timer(
  log: pino.Logger,
  operation: string,
): { end: (extra?: Record<string, unknown>) => number } {
  const start = Date.now()
  return {
    end(extra?) {
      const ms = Date.now() - start
      const level = ms > 2000 ? 'warn' : ms > 500 ? 'info' : 'debug'
      log[level]({ operation, ms, ...extra }, `${operation} completed in ${ms}ms`)
      return ms
    },
  }
}
