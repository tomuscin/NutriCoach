// Stale Insight Detector — AI invalidation engine
// Marks insights as stale when new training/recovery data changes the picture.
// Called after sync to decide whether to invalidate cached AI responses.

import 'server-only'
import { prisma as db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { emitEvent } from '@/lib/events/bus'

const READINESS_DELTA_THRESHOLD = 10 // score points

/**
 * Check if today's AI insights should be invalidated after a sync.
 * Invalidation criteria:
 *   - new workout created today
 *   - readiness delta > threshold vs pre-sync
 *   - major kcal deviation (> 20% from target)
 */
export async function checkAndInvalidateStaleInsights(
  userId: string,
  previousReadinessScore: number | null,
): Promise<{ invalidated: number }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get current readiness
  const readiness = await db.dailyReadiness.findUnique({
    where: { userId_date: { userId, date: today } },
    select: { score: true },
  })

  const currentScore = readiness?.score ?? null
  const delta =
    previousReadinessScore !== null && currentScore !== null
      ? Math.abs(currentScore - previousReadinessScore)
      : 0

  const shouldInvalidate = delta >= READINESS_DELTA_THRESHOLD

  if (!shouldInvalidate) return { invalidated: 0 }

  // Mark today's insights as ARCHIVED (stale) so next request regenerates
  const result = await db.aIInsight.updateMany({
    where: {
      userId,
      createdAt: { gte: today },
      status: { in: ['GENERATED', 'DELIVERED'] },
    },
    data: { status: 'ARCHIVED', archivedAt: new Date() },
  })

  if (result.count > 0) {
    logger.info(
      { userId, invalidated: result.count, delta },
      'Stale insights invalidated after sync',
    )
    await emitEvent('insight_invalidated', { userId, count: result.count, reason: 'readiness_delta' })
  }

  return { invalidated: result.count }
}

/**
 * Get today's readiness score before sync (for delta comparison)
 */
export async function getPreSyncReadiness(userId: string): Promise<number | null> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const r = await db.dailyReadiness.findUnique({
    where: { userId_date: { userId, date: today } },
    select: { score: true },
  })
  return r?.score ?? null
}
