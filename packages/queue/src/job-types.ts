// Job type definitions — all job payloads are typed here

// ─── Queue Names ─────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  AI_JOBS: 'nutricoach:ai',
  SYNC_JOBS: 'nutricoach:sync',
  NOTIFICATION_JOBS: 'nutricoach:notifications',
  IMPORT_JOBS: 'nutricoach:imports',
  ANALYTICS_JOBS: 'nutricoach:analytics',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

// ─── AI Job Types ─────────────────────────────────────────────────────────────

export type AIJobName =
  | 'ai:morning-brief'
  | 'ai:midday-check'
  | 'ai:evening-review'
  | 'ai:weekly-summary'
  | 'ai:goal-update'
  | 'ai:recovery-alert'

export type AIJobPayload = {
  userId: string
  date: string          // ISO date YYYY-MM-DD
  jobName: AIJobName
  promptVersion: string
}

// ─── Sync Job Types ───────────────────────────────────────────────────────────

export type SyncJobName =
  | 'sync:trainingpeaks'
  | 'sync:garmin'
  | 'sync:trainingpeaks-profile'

export type SyncJobPayload = {
  userId: string
  integrationId: string
  syncType: 'WORKOUTS' | 'BODY_METRICS' | 'SLEEP' | 'RECOVERY' | 'ATHLETE_PROFILE' | 'FULL'
  fromDate?: string    // ISO date, optional — syncs from last sync if omitted
  toDate?: string
}

// ─── Notification Job Types ───────────────────────────────────────────────────

export type NotificationJobName =
  | 'notification:send-email'
  | 'notification:send-push'
  | 'notification:digest'

export type NotificationJobPayload = {
  userId: string
  notificationId: string
  channel: 'EMAIL' | 'PUSH' | 'IN_APP'
}

// ─── Import Job Types ─────────────────────────────────────────────────────────

export type ImportJobName = 'import:excel'

export type ImportJobPayload = {
  userId: string
  sessionId: string    // ExcelImportSession.id
  filePath: string     // temp file path on disk
}

// ─── Analytics Job Types ──────────────────────────────────────────────────────

export type AnalyticsJobName =
  | 'analytics:compute-training-load'
  | 'analytics:update-hrv-baseline'
  | 'analytics:update-ftp-per-kg'

export type AnalyticsJobPayload = {
  userId: string
  date?: string  // if omitted, uses today
}

// ─── Union Types ──────────────────────────────────────────────────────────────

export type JobName =
  | AIJobName
  | SyncJobName
  | NotificationJobName
  | ImportJobName
  | AnalyticsJobName

export type JobPayload =
  | AIJobPayload
  | SyncJobPayload
  | NotificationJobPayload
  | ImportJobPayload
  | AnalyticsJobPayload

// ─── Job Options ─────────────────────────────────────────────────────────────

export const JOB_OPTIONS = {
  AI: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5_000 } as const,
    removeOnComplete: 100,  // keep last 100
    removeOnFail: 50,
  },
  SYNC: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10_000 } as const,
    removeOnComplete: 50,
    removeOnFail: 25,
  },
  NOTIFICATION: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 30_000 } as const,
    removeOnComplete: 100,
    removeOnFail: 50,
  },
  IMPORT: {
    attempts: 1,    // no retry for imports — user must re-submit
    removeOnComplete: 20,
    removeOnFail: 20,
  },
  ANALYTICS: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2_000 } as const,
    removeOnComplete: 50,
    removeOnFail: 10,
  },
} as const
