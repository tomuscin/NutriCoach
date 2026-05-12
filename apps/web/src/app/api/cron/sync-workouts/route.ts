// GET /api/cron/sync-workouts
// Every hour: sync workouts for all users due for sync.
// Vercel Cron: 0 * * * *

import * as Sentry from '@sentry/nextjs'
import { getUsersDueForSync, runTrainingPeaksSync } from '@/lib/integrations/sync/training-sync'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  const auth = new Headers(request.headers).get('authorization')
  const secret = process.env.CRON_SECRET
  return !secret || auth === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return Sentry.startSpan({ name: 'cron.sync-workouts' }, async () => {
    const userIds = await getUsersDueForSync()
    logger.info({ count: userIds.length }, 'Workout sync cron: users due')

    const results = await Promise.allSettled(
      userIds.map(userId => runTrainingPeaksSync(userId)),
    )

    const synced = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length

    logger.info({ synced, failed, total: userIds.length }, 'Workout sync cron complete')
    return Response.json({ ok: true, synced, failed, total: userIds.length })
  })
}
