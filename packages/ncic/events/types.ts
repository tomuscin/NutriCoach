/**
 * NCIC Runtime Event Taxonomy
 *
 * These are RUNTIME events — higher-level than domain CRUD events.
 * They represent meaningful moments in the user's health & performance journey
 * that the conversational runtime needs to react to.
 *
 * Distinct from @nutricoach/events (domain/CRUD-level events).
 * NCIC events are the nervous system signals — not the raw database mutations.
 */

// ─── Event Priority ───────────────────────────────────────────────────────────

export type EventPriority = 'critical' | 'high' | 'normal' | 'silent'

// ─── Event Sources ────────────────────────────────────────────────────────────

export type EventSource =
  | 'user-input'       // user typed / submitted
  | 'sync-trainingpeaks'
  | 'sync-garmin'
  | 'excel-import'
  | 'system'           // automated calculation / scheduled
  | 'ai-analysis'      // AI-generated result
  | 'webhook'

// ─── Base Runtime Event ───────────────────────────────────────────────────────

export interface BaseRuntimeEvent<
  TType extends string,
  TPayload = Record<string, unknown>,
> {
  /** Unique event ID — UUID v4 */
  id: string
  /** Canonical event type identifier */
  type: TType
  /** User this event belongs to */
  userId: string
  /** ISO timestamp of when the event occurred */
  timestamp: string
  /** System or integration that produced this event */
  source: EventSource
  /** Event-specific data */
  payload: TPayload
  /** Processing priority — determines handler ordering */
  priority: EventPriority
}

// ─── Runtime Event Types ──────────────────────────────────────────────────────

export const RUNTIME_EVENT_TYPES = {
  FOOD_LOGGED: 'food.logged',
  MEAL_ANALYZED: 'meal.analyzed',
  TRAINING_LOGGED: 'training.logged',
  RECOVERY_UPDATED: 'recovery.updated',
  DAILY_REFLECTION_LOGGED: 'daily-reflection.logged',
  CONVERSATION_STARTED: 'conversation.started',
  CONVERSATION_ENDED: 'conversation.ended',
  USER_FEEDBACK_LOGGED: 'user-feedback.logged',
} as const

export type RuntimeEventType = (typeof RUNTIME_EVENT_TYPES)[keyof typeof RUNTIME_EVENT_TYPES]

// ─── Concrete Runtime Events ──────────────────────────────────────────────────

/**
 * User has logged food / a meal entry.
 * Triggers: signal normalization → nutrition signal → runtime context update.
 */
export interface FoodLoggedEvent extends BaseRuntimeEvent<
  'food.logged',
  {
    mealId: string
    dailyLogId: string
    date: string
    /** Raw user input description — pre-analysis */
    rawDescription?: string
    estimatedCalories?: number
    estimatedProteinG?: number
    estimatedCarbsG?: number
    estimatedFatG?: number
  }
> { priority: 'high' | 'normal' }

/**
 * AI or system has completed macro analysis of a logged meal.
 * Triggers: nutrition signal update → daily context recalculation.
 */
export interface MealAnalyzedEvent extends BaseRuntimeEvent<
  'meal.analyzed',
  {
    mealId: string
    dailyLogId: string
    date: string
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
    confidence: 'high' | 'medium' | 'low'
    analysisModel?: string
  }
> { priority: 'normal' | 'silent' }

/**
 * User has logged a training session.
 * Triggers: training signal normalization → PMC update → TSB recalculation.
 */
export interface TrainingLoggedEvent extends BaseRuntimeEvent<
  'training.logged',
  {
    workoutId: string
    date: string
    durationMinutes: number
    distanceKm?: number
    estimatedCalories?: number
    avgHeartRate?: number
    tss?: number
    sport?: string
  }
> { priority: 'high' | 'normal' }

/**
 * Recovery data has been updated (HRV, sleep, readiness).
 * Triggers: recovery signal normalization → readiness score update.
 */
export interface RecoveryUpdatedEvent extends BaseRuntimeEvent<
  'recovery.updated',
  {
    metricId: string
    date: string
    readinessScore?: number
    hrvMs?: number
    sleepScore?: number
    totalSleepMinutes?: number
    restingHeartRate?: number
    status?: 'optimal' | 'good' | 'moderate' | 'poor'
  }
> { priority: 'high' | 'normal' }

/**
 * User has submitted a daily reflection / diary entry.
 * Triggers: behavioral signal update → conversational memory update.
 */
export interface DailyReflectionLoggedEvent extends BaseRuntimeEvent<
  'daily-reflection.logged',
  {
    date: string
    mood?: number        // 1–5
    energyLevel?: number // 1–5
    stressLevel?: number // 1–5
    notes?: string
    tags?: string[]
  }
> { priority: 'normal' | 'silent' }

/**
 * Conversational session has started.
 * Triggers: context assembly → memory retrieval → runtime state snapshot.
 */
export interface ConversationStartedEvent extends BaseRuntimeEvent<
  'conversation.started',
  {
    conversationId: string
    sessionType: 'chat' | 'coaching' | 'check-in' | 'quick-log'
    channel: 'web' | 'mobile' | 'api'
    intentHint?: string
  }
> { priority: 'high' | 'critical' }

/**
 * Conversational session has ended.
 * Triggers: memory persistence → session summary → behavioral signal update.
 */
export interface ConversationEndedEvent extends BaseRuntimeEvent<
  'conversation.ended',
  {
    conversationId: string
    durationSeconds: number
    messageCount: number
    resolvedIntent?: string
    userSatisfied?: boolean
  }
> { priority: 'normal' | 'silent' }

/**
 * User has provided explicit feedback on an AI response or recommendation.
 * Triggers: behavioral signal update → model feedback loop (future).
 */
export interface UserFeedbackLoggedEvent extends BaseRuntimeEvent<
  'user-feedback.logged',
  {
    targetId: string   // id of the insight / message / recommendation rated
    targetType: 'ai-insight' | 'recommendation' | 'meal-analysis' | 'workout-plan'
    rating: 1 | 2 | 3 | 4 | 5
    comment?: string
    acknowledged: boolean
  }
> { priority: 'silent' | 'normal' }

// ─── Union Type ───────────────────────────────────────────────────────────────

export type RuntimeEvent =
  | FoodLoggedEvent
  | MealAnalyzedEvent
  | TrainingLoggedEvent
  | RecoveryUpdatedEvent
  | DailyReflectionLoggedEvent
  | ConversationStartedEvent
  | ConversationEndedEvent
  | UserFeedbackLoggedEvent
