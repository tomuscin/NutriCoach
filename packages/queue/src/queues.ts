// Queue registry — creates and manages BullMQ queue instances
// Workers create their own connections — never share with queues.

import { Queue, QueueOptions } from 'bullmq'
import { redis } from './connection'
import {
  QUEUE_NAMES,
  JOB_OPTIONS,
  type AIJobPayload,
  type SyncJobPayload,
  type NotificationJobPayload,
  type ImportJobPayload,
  type AnalyticsJobPayload,
} from './job-types'

const sharedOptions: QueueOptions = {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
  },
}

// ─── Queue Singletons ─────────────────────────────────────────────────────────

const globalQueues = globalThis as unknown as {
  aiQueue: Queue<AIJobPayload> | undefined
  syncQueue: Queue<SyncJobPayload> | undefined
  notificationQueue: Queue<NotificationJobPayload> | undefined
  importQueue: Queue<ImportJobPayload> | undefined
  analyticsQueue: Queue<AnalyticsJobPayload> | undefined
}

export const aiQueue: Queue<AIJobPayload> =
  globalQueues.aiQueue ??
  new Queue<AIJobPayload>(QUEUE_NAMES.AI_JOBS, sharedOptions)

export const syncQueue: Queue<SyncJobPayload> =
  globalQueues.syncQueue ??
  new Queue<SyncJobPayload>(QUEUE_NAMES.SYNC_JOBS, sharedOptions)

export const notificationQueue: Queue<NotificationJobPayload> =
  globalQueues.notificationQueue ??
  new Queue<NotificationJobPayload>(QUEUE_NAMES.NOTIFICATION_JOBS, sharedOptions)

export const importQueue: Queue<ImportJobPayload> =
  globalQueues.importQueue ??
  new Queue<ImportJobPayload>(QUEUE_NAMES.IMPORT_JOBS, sharedOptions)

export const analyticsQueue: Queue<AnalyticsJobPayload> =
  globalQueues.analyticsQueue ??
  new Queue<AnalyticsJobPayload>(QUEUE_NAMES.ANALYTICS_JOBS, sharedOptions)

if (process.env.NODE_ENV !== 'production') {
  globalQueues.aiQueue = aiQueue
  globalQueues.syncQueue = syncQueue
  globalQueues.notificationQueue = notificationQueue
  globalQueues.importQueue = importQueue
  globalQueues.analyticsQueue = analyticsQueue
}

// ─── Queue Helpers ────────────────────────────────────────────────────────────

/** Schedule a morning brief for a specific user at their local time. */
export async function scheduleAIBrief(
  userId: string,
  date: string,
  deliveryTime: Date,
) {
  const delay = Math.max(0, deliveryTime.getTime() - Date.now())
  return aiQueue.add(
    'ai:morning-brief',
    { userId, date, jobName: 'ai:morning-brief', promptVersion: '1.0' },
    { ...JOB_OPTIONS.AI, delay },
  )
}

/** Queue a TP sync for a user. */
export async function queueTPSync(
  userId: string,
  integrationId: string,
  fromDate?: string,
) {
  return syncQueue.add(
    'sync:trainingpeaks',
    { userId, integrationId, syncType: 'WORKOUTS', fromDate },
    JOB_OPTIONS.SYNC,
  )
}

/** Queue training load recalculation after a workout is saved. */
export async function queueTrainingLoadUpdate(userId: string, date: string) {
  return analyticsQueue.add(
    'analytics:compute-training-load',
    { userId, date },
    {
      ...JOB_OPTIONS.ANALYTICS,
      // Deduplicate — only run once per user-date per minute
      jobId: `tl-${userId}-${date}`,
    },
  )
}
