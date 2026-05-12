// Training Sync Engine — orchestrates a full sync cycle for a user
// Handles: token refresh, workout sync, training load computation, event emission
// Idempotent, retry-safe, serverless-safe.

import 'server-only'
import { prisma as db } from '@/lib/db'
import { logger, timer } from '@/lib/logger'
import { safeDecryptToken, encryptToken } from '@/lib/security/token-encryption'
import { trainingPeaksProvider, persistTokens } from '../providers/trainingpeaks/provider'
import { IntegrationError } from '../core/types'
import { computeAndPersistAdherence } from '@/lib/adherence/adherence-engine'
import { computeAndPersistReadiness } from '@/lib/readiness/readiness-engine'
import { emitEvent } from '@/lib/events/bus'
import * as Sentry from '@sentry/nextjs'

const TOKEN_REFRESH_BUFFER_MINUTES = 15

// ─── Main sync entry point ────────────────────────────────────────────────────

export async function runTrainingPeaksSync(userId: string): Promise<{
  success: boolean
  message: string
  workoutsCreated: number
  workoutsUpdated: number
}> {
  const t = timer(logger, 'tp-sync')

  // Load integration
  const integration = await db.integration.findUnique({
    where: { userId_provider: { userId, provider: 'TRAININGPEAKS' } },
  })

  if (!integration || integration.status === 'DISCONNECTED' || integration.status === 'REVOKED') {
    return { success: false, message: 'Integration not active', workoutsCreated: 0, workoutsUpdated: 0 }
  }

  // Create sync log
  const syncLog = await db.syncLog.create({
    data: {
      integrationId: integration.id,
      userId,
      syncType: 'WORKOUTS',
      status: 'RUNNING',
    },
  })

  let tokens: { accessToken: string; refreshToken: string; expiresAt: Date; scope?: string } = {
    accessToken: safeDecryptToken(integration.accessToken) ?? '',
    refreshToken: safeDecryptToken(integration.refreshToken) ?? '',
    expiresAt: integration.tokenExpiresAt ?? new Date(0),
    scope: integration.scope ?? undefined,
  }

  try {
    // Refresh token if needed
    const expiresInMs = tokens.expiresAt.getTime() - Date.now()
    const bufferMs = TOKEN_REFRESH_BUFFER_MINUTES * 60 * 1000
    if (expiresInMs < bufferMs && tokens.refreshToken) {
      logger.info({ userId }, 'Refreshing TP access token')
      tokens = await trainingPeaksProvider.refreshTokens(tokens.refreshToken)
      await persistTokens(userId, tokens)
    }

    if (!tokens.accessToken) {
      throw new IntegrationError('No valid access token', 'TRAININGPEAKS', 'TOKEN_EXPIRED')
    }

    // Determine sync window (from last sync or 90 days back)
    const since = integration.lastSyncAt
      ? new Date(integration.lastSyncAt.getTime() - 24 * 60 * 60 * 1000) // 1-day overlap
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days default

    // Sync athlete profile on first sync or every 24h
    const profileAgeMs = integration.lastSyncAt
      ? Date.now() - integration.lastSyncAt.getTime()
      : Infinity
    if (profileAgeMs > 24 * 60 * 60 * 1000) {
      await trainingPeaksProvider.syncAthleteProfile(userId, tokens)
    }

    // Sync workouts
    const result = await trainingPeaksProvider.syncWorkouts(userId, tokens, since)

    // Recompute training load (PMC) for affected dates
    if (result.recordsCreated > 0 || result.recordsUpdated > 0) {
      await recomputeTrainingLoad(userId, since)
    }

    // Update sync log
    await db.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: result.status,
        recordsProcessed: result.recordsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsSkipped: result.recordsSkipped,
        recordsFailed: result.recordsFailed,
        errors: (result.errors?.length ? result.errors : undefined) as never,
        finishedAt: new Date(),
      },
    })

    // Update integration
    const nextSync = new Date(Date.now() + (integration.syncFrequencyMinutes ?? 360) * 60 * 1000)
    await db.integration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        nextSyncAt: nextSync,
        status: 'ACTIVE',
        errorCount: 0,
        errorMessage: null,
      },
    })

    // Emit events for downstream recalculation
    if (result.recordsCreated > 0 || result.recordsUpdated > 0) {
      await emitEvent('workout_synced', { userId, count: result.recordsCreated + result.recordsUpdated })
      // Recalculate today's adherence and readiness
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      await computeAndPersistAdherence(userId, today).catch(() => {})
      await computeAndPersistReadiness(userId, today).catch(() => {})
      await emitEvent('readiness_recalculated', { userId })
    }

    const elapsed = t.end()
    logger.info({ userId, result, elapsed }, 'TP sync complete')

    return {
      success: true,
      message: `Synced ${result.recordsCreated} new, ${result.recordsUpdated} updated`,
      workoutsCreated: result.recordsCreated,
      workoutsUpdated: result.recordsUpdated,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const isRevoked = err instanceof IntegrationError && err.code === 'TOKEN_REVOKED'

    Sentry.captureException(err, { extra: { userId, provider: 'TRAININGPEAKS' } })

    await db.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'FAILED',
        errors: [{ record: 'sync', message }] as never,
        finishedAt: new Date(),
      },
    })

    await db.integration.update({
      where: { id: integration.id },
      data: {
        status: isRevoked ? 'REVOKED' : 'ERROR',
        errorMessage: message,
        errorCount: { increment: 1 },
        lastErrorAt: new Date(),
      },
    })

    logger.error({ userId, err: message }, 'TP sync failed')
    return { success: false, message, workoutsCreated: 0, workoutsUpdated: 0 }
  }
}

// ─── Get all users due for sync ───────────────────────────────────────────────

export async function getUsersDueForSync(): Promise<string[]> {
  const integrations = await db.integration.findMany({
    where: {
      provider: 'TRAININGPEAKS',
      status: 'ACTIVE',
      nextSyncAt: { lte: new Date() },
    },
    select: { userId: true },
    take: 50,
  })
  return integrations.map(i => i.userId)
}

// ─── Token refresh pass ───────────────────────────────────────────────────────

export async function refreshExpiredTokens(): Promise<{ refreshed: number; failed: number }> {
  const soon = new Date(Date.now() + TOKEN_REFRESH_BUFFER_MINUTES * 60 * 1000)
  const integrations = await db.integration.findMany({
    where: {
      provider: 'TRAININGPEAKS',
      status: 'ACTIVE',
      tokenExpiresAt: { lte: soon },
    },
    select: { id: true, userId: true, refreshToken: true },
    take: 100,
  })

  let refreshed = 0
  let failed = 0

  for (const integration of integrations) {
    const rawRefresh = safeDecryptToken(integration.refreshToken)
    if (!rawRefresh) { failed++; continue }

    try {
      const tokens = await trainingPeaksProvider.refreshTokens(rawRefresh)
      await db.integration.update({
        where: { id: integration.id },
        data: {
          accessToken: encryptToken(tokens.accessToken),
          refreshToken: encryptToken(tokens.refreshToken),
          tokenExpiresAt: tokens.expiresAt,
          status: 'ACTIVE',
          errorCount: 0,
        },
      })
      refreshed++
    } catch (err) {
      failed++
      const message = err instanceof Error ? err.message : 'refresh failed'
      const isRevoked = err instanceof IntegrationError && err.code === 'TOKEN_REVOKED'
      await db.integration.update({
        where: { id: integration.id },
        data: {
          status: isRevoked ? 'REVOKED' : 'ERROR',
          errorMessage: message,
          errorCount: { increment: 1 },
          lastErrorAt: new Date(),
        },
      })
    }
  }

  return { refreshed, failed }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function recomputeTrainingLoad(_userId: string, _since: Date): Promise<void> {
  // PMC recomputation is handled by the daily-scores cron.
  // Full recompute here would require scanning all workouts since `since` —
  // left as enhancement for ETAP 7 when training load service is promoted.
}
