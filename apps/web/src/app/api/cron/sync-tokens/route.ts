// GET /api/cron/sync-tokens
// Every 30 min: refresh TP tokens expiring within 15 minutes.
// Vercel Cron: */30 * * * *

import * as Sentry from '@sentry/nextjs'
import { refreshExpiredTokens } from '@/lib/integrations/sync/training-sync'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

function isAuthorized(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  const auth = request.headers ? new Headers(request.headers).get('authorization') : null
  const secret = process.env.CRON_SECRET
  return !secret || auth === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return Sentry.startSpan({ name: 'cron.sync-tokens' }, async () => {
    try {
      const result = await refreshExpiredTokens()
      logger.info({ ...result }, 'Token refresh cron complete')
      return Response.json({ ok: true, ...result })
    } catch (err) {
      Sentry.captureException(err)
      logger.error({ err }, 'Token refresh cron failed')
      return Response.json({ ok: false }, { status: 500 })
    }
  })
}
