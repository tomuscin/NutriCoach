// @nutricoach/queue — main entrypoint

export { redis, createWorkerConnection, isRedisConfigured } from './connection'
export {
  aiQueue,
  syncQueue,
  notificationQueue,
  importQueue,
  analyticsQueue,
  scheduleAIBrief,
  queueTPSync,
  queueTrainingLoadUpdate,
} from './queues'
export {
  QUEUE_NAMES,
  JOB_OPTIONS,
  type QueueName,
  type JobName,
  type JobPayload,
  type AIJobName,
  type AIJobPayload,
  type SyncJobName,
  type SyncJobPayload,
  type NotificationJobName,
  type NotificationJobPayload,
  type ImportJobName,
  type ImportJobPayload,
  type AnalyticsJobName,
  type AnalyticsJobPayload,
} from './job-types'
