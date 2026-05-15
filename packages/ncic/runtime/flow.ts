/**
 * NCIC Runtime Flow
 *
 * Wires together: event → signal normalization → runtime state update.
 *
 * This is the "nervous system" flow:
 *   1. Event arrives (e.g., FoodLoggedEvent)
 *   2. Signal is normalized (deterministic)
 *   3. Runtime state snapshot is updated
 *   4. Downstream handlers can react (e.g., daily context update)
 *
 * Usage: call registerRuntimeFlowHandlers() once at app startup.
 *
 * Future (ETAP 5): RuntimeFlow feeds into NCIC context assembly
 * which generates conversational context for the AI runtime.
 */

import { subscribe } from './bus'
import {
  normalizeFoodLoggedEvent,
  normalizeMealAnalyzedEvent,
  normalizeTrainingLoggedEvent,
  normalizeRecoveryUpdatedEvent,
  normalizeDailyReflectionEvent,
  normalizeConversationStartedEvent,
  normalizeConversationEndedEvent,
} from '../signals/normalizer'
import type { NormalizedSignal } from '../signals/types'
import type {
  FoodLoggedEvent,
  MealAnalyzedEvent,
  TrainingLoggedEvent,
  RecoveryUpdatedEvent,
  DailyReflectionLoggedEvent,
  ConversationStartedEvent,
  ConversationEndedEvent,
  UserFeedbackLoggedEvent,
} from '../events/types'
import type { RuntimeContextSnapshot } from './state'
import { createEmptySnapshot } from './state'

// ─── In-memory Runtime State Store ───────────────────────────────────────────
// Keyed by `${userId}:${date}` — scoped to daily context.
// Future: replaced by a proper runtime context store (ETAP 5).

const runtimeStateStore = new Map<string, RuntimeContextSnapshot>()

function stateKey(userId: string, date: string): string {
  return `${userId}:${date}`
}

export function getRuntimeState(userId: string, date: string): RuntimeContextSnapshot {
  const key = stateKey(userId, date)
  return runtimeStateStore.get(key) ?? createEmptySnapshot(userId, date)
}

function upsertRuntimeState(
  userId: string,
  date: string,
  updater: (snapshot: RuntimeContextSnapshot) => RuntimeContextSnapshot,
): RuntimeContextSnapshot {
  const current = getRuntimeState(userId, date)
  const updated = updater({ ...current, updatedAt: new Date().toISOString() })
  runtimeStateStore.set(stateKey(userId, date), updated)
  return updated
}

// ─── Signal → State Updaters ─────────────────────────────────────────────────

function applySignalToState(
  signal: NormalizedSignal,
): void {
  const now = new Date().toISOString()

  upsertRuntimeState(signal.userId, signal.date, (snapshot) => {
    switch (signal.domain) {
      case 'nutrition':
        return {
          ...snapshot,
          nutrition: {
            ...signal.data,
            lastUpdated: now,
          },
        }

      case 'training':
        return {
          ...snapshot,
          training: {
            ...signal.data,
            lastUpdated: now,
          },
        }

      case 'recovery':
        return {
          ...snapshot,
          recovery: {
            ...signal.data,
            lastUpdated: now,
          },
        }

      case 'behavioral':
        return {
          ...snapshot,
          behavioral: {
            ...signal.data,
            lastUpdated: now,
          },
        }

      case 'conversation':
        return {
          ...snapshot,
          conversation: {
            activeConversationId: signal.data.conversationId,
            sessionType: signal.data.sessionType,
            startedAt: now,
          },
        }

      default:
        return snapshot
    }
  })

  if (process.env.NODE_ENV !== 'production') {
    console.info(
      `[runtime-flow] signal applied domain="${signal.domain}" userId="${signal.userId}" date="${signal.date}"`,
    )
  }
}

// ─── Handler Registration ─────────────────────────────────────────────────────

/**
 * Register all runtime flow handlers on the event bus.
 * Call once at application startup.
 *
 * Each handler:
 *   1. Normalizes the incoming event into a signal
 *   2. Applies the signal to runtime state
 */
export function registerRuntimeFlowHandlers(): void {
  subscribe<FoodLoggedEvent>('food.logged', (event) => {
    const signal = normalizeFoodLoggedEvent(event)
    applySignalToState(signal)
  })

  subscribe<MealAnalyzedEvent>('meal.analyzed', (event) => {
    const signal = normalizeMealAnalyzedEvent(event)
    applySignalToState(signal)
  })

  subscribe<TrainingLoggedEvent>('training.logged', (event) => {
    const signal = normalizeTrainingLoggedEvent(event)
    applySignalToState(signal)
  })

  subscribe<RecoveryUpdatedEvent>('recovery.updated', (event) => {
    const signal = normalizeRecoveryUpdatedEvent(event)
    applySignalToState(signal)
  })

  subscribe<DailyReflectionLoggedEvent>('daily-reflection.logged', (event) => {
    const signal = normalizeDailyReflectionEvent(event)
    applySignalToState(signal)
  })

  subscribe<ConversationStartedEvent>('conversation.started', (event) => {
    const signal = normalizeConversationStartedEvent(event)
    applySignalToState(signal)
  })

  subscribe<ConversationEndedEvent>('conversation.ended', (event) => {
    const signal = normalizeConversationEndedEvent(event)
    // On conversation end, clear the active conversation from state
    upsertRuntimeState(signal.userId, signal.date, (snapshot) => ({
      ...snapshot,
      conversation: {
        activeConversationId: null,
        sessionType: null,
        startedAt: null,
      },
    }))
  })

  subscribe<UserFeedbackLoggedEvent>('user-feedback.logged', (event) => {
    // Behavioral signal: user engagement logging only
    if (process.env.NODE_ENV !== 'production') {
      console.info(
        `[runtime-flow] user feedback logged userId="${event.userId}" targetType="${event.payload.targetType}" rating=${event.payload.rating}`,
      )
    }
  })
}

/** Clear all in-memory runtime state. Use in tests only. */
export function clearRuntimeState(): void {
  runtimeStateStore.clear()
}
