// Domain event type definitions
// Events drive side-effects: training load recalc, AI brief generation, notifications, etc.

// ─── Event Names ──────────────────────────────────────────────────────────────

export const DOMAIN_EVENTS = {
  // Nutrition
  MEAL_CREATED: 'meal.created',
  MEAL_UPDATED: 'meal.updated',
  MEAL_DELETED: 'meal.deleted',
  DAILY_LOG_COMPLETED: 'daily-log.completed',

  // Training
  WORKOUT_CREATED: 'workout.created',
  WORKOUT_UPDATED: 'workout.updated',
  WORKOUT_DELETED: 'workout.deleted',
  WORKOUT_SYNCED: 'workout.synced',
  TRAINING_LOAD_UPDATED: 'training-load.updated',

  // Body metrics & recovery
  BODY_METRIC_CREATED: 'body-metric.created',
  SLEEP_SYNCED: 'sleep.synced',
  RECOVERY_UPDATED: 'recovery.updated',

  // Goals
  GOAL_CREATED: 'goal.created',
  GOAL_UPDATED: 'goal.updated',
  GOAL_STATUS_CHANGED: 'goal.status-changed',
  GOAL_ACHIEVED: 'goal.achieved',

  // AI
  AI_INSIGHT_GENERATED: 'ai.insight.generated',
  AI_INSIGHT_ACKNOWLEDGED: 'ai.insight.acknowledged',

  // Integrations
  TP_SYNC_STARTED: 'tp.sync.started',
  TP_SYNC_COMPLETED: 'tp.sync.completed',
  TP_SYNC_FAILED: 'tp.sync.failed',
  GARMIN_SYNC_COMPLETED: 'garmin.sync.completed',

  // Import
  EXCEL_IMPORT_COMPLETED: 'excel-import.completed',
} as const

export type DomainEventName = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS]

// ─── Base Event ───────────────────────────────────────────────────────────────

export type BaseEvent<T extends DomainEventName, P = Record<string, unknown>> = {
  eventName: T
  userId: string
  occurredAt: Date
  payload: P
}

// ─── Nutrition Events ─────────────────────────────────────────────────────────

export type MealCreatedEvent = BaseEvent<
  'meal.created',
  { mealId: string; dailyLogId: string; date: string }
>

export type MealUpdatedEvent = BaseEvent<
  'meal.updated',
  { mealId: string; dailyLogId: string }
>

export type MealDeletedEvent = BaseEvent<
  'meal.deleted',
  { mealId: string; dailyLogId: string }
>

export type DailyLogCompletedEvent = BaseEvent<
  'daily-log.completed',
  { dailyLogId: string; date: string; consumedCalories: number; deficit: number }
>

// ─── Training Events ──────────────────────────────────────────────────────────

export type WorkoutCreatedEvent = BaseEvent<
  'workout.created',
  { workoutId: string; date: string; tss: number | null; source: string }
>

export type WorkoutSyncedEvent = BaseEvent<
  'workout.synced',
  { workoutId: string; date: string; tss: number | null; source: string; created: boolean }
>

export type TrainingLoadUpdatedEvent = BaseEvent<
  'training-load.updated',
  { date: string; ctl: number; atl: number; tsb: number }
>

// ─── Recovery Events ─────────────────────────────────────────────────────────

export type BodyMetricCreatedEvent = BaseEvent<
  'body-metric.created',
  { metricId: string; date: string; weightKg?: number }
>

export type RecoveryUpdatedEvent = BaseEvent<
  'recovery.updated',
  { metricId: string; date: string; readinessScore?: number; status?: string }
>

export type SleepSyncedEvent = BaseEvent<
  'sleep.synced',
  { metricId: string; date: string; totalSleepMinutes?: number; sleepScore?: number }
>

// ─── Goal Events ─────────────────────────────────────────────────────────────

export type GoalStatusChangedEvent = BaseEvent<
  'goal.status-changed',
  {
    goalId: string
    previousStatus: string
    newStatus: string
    reason?: string
  }
>

export type GoalAchievedEvent = BaseEvent<
  'goal.achieved',
  { goalId: string; startWeight: number; targetWeight: number; daysToAchieve: number }
>

// ─── AI Events ───────────────────────────────────────────────────────────────

export type AIInsightGeneratedEvent = BaseEvent<
  'ai.insight.generated',
  {
    insightId: string
    insightType: string
    deliveryMoment: string
    model: string
    totalTokens: number
  }
>

// ─── Sync Events ─────────────────────────────────────────────────────────────

export type TPSyncCompletedEvent = BaseEvent<
  'tp.sync.completed',
  {
    syncLogId: string
    recordsCreated: number
    recordsUpdated: number
    syncType: string
  }
>

export type ExcelImportCompletedEvent = BaseEvent<
  'excel-import.completed',
  {
    sessionId: string
    rowsImported: number
    rowsFailed: number
    dateRangeStart?: string
    dateRangeEnd?: string
  }
>

// ─── Union Type ───────────────────────────────────────────────────────────────

export type DomainEvent =
  | MealCreatedEvent
  | MealUpdatedEvent
  | MealDeletedEvent
  | DailyLogCompletedEvent
  | WorkoutCreatedEvent
  | WorkoutSyncedEvent
  | TrainingLoadUpdatedEvent
  | BodyMetricCreatedEvent
  | RecoveryUpdatedEvent
  | SleepSyncedEvent
  | GoalStatusChangedEvent
  | GoalAchievedEvent
  | AIInsightGeneratedEvent
  | TPSyncCompletedEvent
  | ExcelImportCompletedEvent
