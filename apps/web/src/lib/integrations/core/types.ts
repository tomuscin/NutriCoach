// Integration Core Types — provider abstraction
// All providers implement HealthDataProvider interface.

import type { IntegrationProvider, IntegrationStatus, SyncStatus, SyncType } from '@prisma/client'

export type { IntegrationProvider, IntegrationStatus, SyncStatus, SyncType }

// ─── Provider interface ────────────────────────────────────────────────────────

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  scope?: string
}

export interface SyncResult {
  status: SyncStatus
  recordsProcessed: number
  recordsCreated: number
  recordsUpdated: number
  recordsSkipped: number
  recordsFailed: number
  errors?: Array<{ record: string; message: string }>
}

export interface HealthDataProvider {
  readonly provider: IntegrationProvider

  /** Build OAuth authorization URL */
  buildAuthUrl(state: string): string

  /** Exchange code → tokens */
  exchangeCode(code: string): Promise<OAuthTokens>

  /** Refresh expired access token */
  refreshTokens(refreshToken: string): Promise<OAuthTokens>

  /** Sync workouts for a date range */
  syncWorkouts(userId: string, tokens: OAuthTokens, since: Date): Promise<SyncResult>

  /** Sync daily/recovery metrics */
  syncRecoveryMetrics(userId: string, tokens: OAuthTokens, since: Date): Promise<SyncResult>

  /** Sync athlete profile (FTP, weight, LTHR) */
  syncAthleteProfile(userId: string, tokens: OAuthTokens): Promise<void>

  /** Validate incoming webhook signature */
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean
}

// ─── Integration errors ────────────────────────────────────────────────────────

export class IntegrationError extends Error {
  constructor(
    message: string,
    public readonly provider: IntegrationProvider,
    public readonly code: IntegrationErrorCode,
    public readonly retryable: boolean = false,
  ) {
    super(message)
    this.name = 'IntegrationError'
  }
}

export type IntegrationErrorCode =
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REVOKED'
  | 'RATE_LIMITED'
  | 'PROVIDER_DOWN'
  | 'INVALID_SCOPE'
  | 'INVALID_SIGNATURE'
  | 'SYNC_FAILED'
  | 'AUTH_FAILED'
  | 'INVALID_RESPONSE'

// ─── Normalized workout type ───────────────────────────────────────────────────

export interface NormalizedWorkout {
  externalId: string
  date: Date
  startedAt?: Date
  finishedAt?: Date
  durationMinutes: number
  title?: string
  sportType: string           // will be mapped to SportType enum
  distanceKm?: number
  elevationGainM?: number
  avgHR?: number
  maxHR?: number
  avgPowerW?: number
  normalizedPowerW?: number
  caloriesBurned?: number
  tss?: number
  intensityFactor?: number
  ftpSnapshot?: number
  rpe?: number
  isPlanned: boolean
  plannedDurationMin?: number
  plannedTSS?: number
  indoor?: boolean
  raw: Record<string, unknown>  // original provider payload
}

// ─── Normalized recovery metric ───────────────────────────────────────────────

export interface NormalizedRecoveryMetric {
  date: Date
  externalId?: string
  hrv?: number
  restingHR?: number
  readinessScore?: number
  recoveryScore?: number
}
