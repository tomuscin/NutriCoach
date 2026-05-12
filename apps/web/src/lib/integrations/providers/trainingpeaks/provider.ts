// TrainingPeaks Provider — implements HealthDataProvider
// Orchestrates OAuth + API calls + normalization for TP.

import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import type { HealthDataProvider, OAuthTokens, SyncResult } from '../../core/types'
import { IntegrationError } from '../../core/types'
import {
  exchangeCodeForTokens,
  fetchAthleteProfile,
  fetchWorkouts,
  refreshAccessToken,
} from './client'
import { normalizeTPWorkout } from '../../mapping/workout-mapper'
import { prisma as db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { encryptToken } from '@/lib/security/token-encryption'
import type { TPTokenResponse } from './types'

const AUTH_URL = 'https://oauth.trainingpeaks.com/OAuth/Authorize'

function toOAuthTokens(res: TPTokenResponse): OAuthTokens {
  return {
    accessToken: res.access_token,
    refreshToken: res.refresh_token,
    expiresAt: new Date(Date.now() + res.expires_in * 1000),
    scope: res.scope,
  }
}

function getRedirectUri(): string {
  const uri = process.env.TRAININGPEAKS_REDIRECT_URI
  if (!uri) throw new Error('TRAININGPEAKS_REDIRECT_URI not set')
  return uri
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export const trainingPeaksProvider: HealthDataProvider = {
  provider: 'TRAININGPEAKS',

  buildAuthUrl(state: string): string {
    const clientId = process.env.TRAININGPEAKS_CLIENT_ID
    if (!clientId) throw new Error('TRAININGPEAKS_CLIENT_ID not set')

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: getRedirectUri(),
      scope: process.env.TRAININGPEAKS_SCOPE ?? 'workouts:read athlete:read',
      state,
    })
    return `${AUTH_URL}?${params.toString()}`
  },

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const raw = await exchangeCodeForTokens(code, getRedirectUri())
    return toOAuthTokens(raw)
  },

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const raw = await refreshAccessToken(refreshToken)
    return toOAuthTokens(raw)
  },

  async syncAthleteProfile(userId: string, tokens: OAuthTokens): Promise<void> {
    const profile = await fetchAthleteProfile(tokens.accessToken)

    // Update user profile with TP athlete data (FTP, weight, LTHR)
    await db.userProfile.updateMany({
      where: { userId },
      data: {
        ...(profile.BikeThresholdPower ? { ftp: profile.BikeThresholdPower } : {}),
        ...(profile.Lthr ? { lthr: profile.Lthr } : {}),
        ...(profile.Weight ? { currentWeightKg: profile.Weight } : {}),
      },
    })

    // Store external athlete ID on integration
    await db.integration.updateMany({
      where: { userId, provider: 'TRAININGPEAKS' },
      data: { athleteExternalId: String(profile.AthleteId ?? profile.Id) },
    })

    logger.info({ userId, provider: 'TRAININGPEAKS' }, 'Athlete profile synced')
  },

  async syncWorkouts(userId: string, tokens: OAuthTokens, since: Date): Promise<SyncResult> {
    const integration = await db.integration.findUnique({
      where: { userId_provider: { userId, provider: 'TRAININGPEAKS' } },
      select: { athleteExternalId: true },
    })

    const athleteId = integration?.athleteExternalId
    if (!athleteId) {
      throw new IntegrationError(
        'No athlete ID — sync athlete profile first',
        'TRAININGPEAKS',
        'SYNC_FAILED',
      )
    }

    const now = new Date()
    const rawWorkouts = await fetchWorkouts(
      tokens.accessToken,
      athleteId,
      formatDate(since),
      formatDate(now),
    )

    const result: SyncResult = {
      status: 'SUCCESS',
      recordsProcessed: rawWorkouts.length,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      errors: [],
    }

    for (const raw of rawWorkouts) {
      try {
        const w = normalizeTPWorkout(raw)

        const existing = await db.workout.findFirst({
          where: { userId, externalId: w.externalId, source: 'TRAININGPEAKS' as never },
          select: { id: true, updatedAt: true },
        })

        const sportTypeValue = w.sportType as never // mapped to SportType enum

        if (!existing) {
          await db.workout.create({
            data: {
              userId,
              source: 'TRAININGPEAKS' as never,
              externalId: w.externalId,
              externalWorkoutType: raw.WorkoutType ?? null,
              date: w.date,
              startedAt: w.startedAt ?? null,
              finishedAt: w.finishedAt ?? null,
              durationMinutes: w.durationMinutes,
              title: w.title ?? null,
              sportType: sportTypeValue,
              distanceKm: w.distanceKm ?? null,
              elevationGainM: w.elevationGainM ?? null,
              avgHR: w.avgHR ?? null,
              maxHR: w.maxHR ?? null,
              avgPowerW: w.avgPowerW ?? null,
              normalizedPowerW: w.normalizedPowerW ?? null,
              caloriesBurned: w.caloriesBurned ?? null,
              tss: w.tss ?? null,
              intensityFactor: w.intensityFactor ?? null,
              ftpSnapshot: w.ftpSnapshot ?? null,
              rpe: w.rpe ?? null,
              isPlanned: w.isPlanned,
              plannedDurationMin: w.plannedDurationMin ?? null,
              plannedTSS: w.plannedTSS ?? null,
              indoor: w.indoor ?? false,
            },
          })
          result.recordsCreated++
        } else {
          await db.workout.update({
            where: { id: existing.id },
            data: {
              durationMinutes: w.durationMinutes,
              tss: w.tss ?? null,
              intensityFactor: w.intensityFactor ?? null,
              avgHR: w.avgHR ?? null,
              maxHR: w.maxHR ?? null,
              caloriesBurned: w.caloriesBurned ?? null,
            },
          })
          result.recordsUpdated++
        }
      } catch (err) {
        result.recordsFailed++
        result.errors?.push({
          record: String(raw.WorkoutId),
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    if (result.recordsFailed > 0 && result.recordsFailed < result.recordsProcessed) {
      result.status = 'PARTIAL_SUCCESS'
    } else if (result.recordsFailed === result.recordsProcessed && result.recordsProcessed > 0) {
      result.status = 'FAILED'
    }

    return result
  },

  async syncRecoveryMetrics(
    _userId: string,
    _tokens: OAuthTokens,
    _since: Date,
  ): Promise<SyncResult> {
    // TrainingPeaks v1 doesn't expose recovery/HRV data directly.
    // This will be populated from Garmin/Oura in future providers.
    return {
      status: 'SKIPPED',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
    }
  },

  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expected = createHmac('sha256', secret).update(payload).digest('hex')
      const expectedBuf = Buffer.from(expected, 'hex')
      const sigBuf = Buffer.from(signature, 'hex')
      if (expectedBuf.length !== sigBuf.length) return false
      return timingSafeEqual(expectedBuf, sigBuf)
    } catch {
      return false
    }
  },
}

// ─── Token persistence helpers ─────────────────────────────────────────────────

export async function persistTokens(userId: string, tokens: OAuthTokens): Promise<void> {
  await db.integration.update({
    where: { userId_provider: { userId, provider: 'TRAININGPEAKS' } },
    data: {
      accessToken: encryptToken(tokens.accessToken),
      refreshToken: encryptToken(tokens.refreshToken),
      tokenExpiresAt: tokens.expiresAt,
      scope: tokens.scope ?? null,
      status: 'ACTIVE',
      errorCount: 0,
      errorMessage: null,
    },
  })
}
