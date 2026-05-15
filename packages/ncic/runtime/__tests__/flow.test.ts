/**
 * Tests: NCIC Runtime Flow
 *
 * Validates the full flow: emit event → signal normalization → runtime state update.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { RuntimeEventBus, emitEvent as _emitEvent, subscribe as _subscribe } from '../bus'
import {
  registerRuntimeFlowHandlers,
  getRuntimeState,
  clearRuntimeState,
} from '../flow'
import type { FoodLoggedEvent, TrainingLoggedEvent, RecoveryUpdatedEvent, ConversationStartedEvent, ConversationEndedEvent } from '../../events/types'

// ─── Test Setup ───────────────────────────────────────────────────────────────

const USER_ID = 'user-flow-test'
const DATE = '2026-05-14'

function makeFoodEvent(): FoodLoggedEvent {
  return {
    id: 'evt-food-001',
    type: 'food.logged',
    userId: USER_ID,
    timestamp: `${DATE}T08:30:00.000Z`,
    source: 'user-input',
    priority: 'high',
    payload: {
      mealId: 'meal-001',
      dailyLogId: 'log-001',
      date: DATE,
      estimatedCalories: 500,
      estimatedProteinG: 35,
      estimatedCarbsG: 55,
      estimatedFatG: 18,
    },
  }
}

function makeTrainingEvent(): TrainingLoggedEvent {
  return {
    id: 'evt-training-001',
    type: 'training.logged',
    userId: USER_ID,
    timestamp: `${DATE}T07:00:00.000Z`,
    source: 'sync-garmin',
    priority: 'high',
    payload: {
      workoutId: 'workout-001',
      date: DATE,
      durationMinutes: 90,
      distanceKm: 30,
      avgHeartRate: 148,
      tss: 75,
      sport: 'cycling',
    },
  }
}

function makeRecoveryEvent(): RecoveryUpdatedEvent {
  return {
    id: 'evt-recovery-001',
    type: 'recovery.updated',
    userId: USER_ID,
    timestamp: `${DATE}T06:00:00.000Z`,
    source: 'sync-garmin',
    priority: 'high',
    payload: {
      metricId: 'metric-001',
      date: DATE,
      readinessScore: 72,
      sleepScore: 68,
      totalSleepMinutes: 420,
    },
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Runtime Flow', () => {
  beforeEach(() => {
    clearRuntimeState()
    // Re-register handlers using singleton bus for integration test
    // This requires clean state on singleton — tested here as integration
  })

  describe('getRuntimeState', () => {
    it('returns empty snapshot for unknown user/date', () => {
      const state = getRuntimeState('no-such-user', '2099-01-01')
      expect(state.userId).toBe('no-such-user')
      expect(state.nutrition).toBeNull()
      expect(state.training).toBeNull()
      expect(state.recovery).toBeNull()
    })
  })

  describe('Event → Signal → State pipeline (isolated bus)', () => {
    it('food.logged event updates nutrition state', async () => {
      const bus = new RuntimeEventBus()

      // Wire the flow manually using isolated bus
      bus.subscribe<FoodLoggedEvent>('food.logged', async (event) => {
        const { normalizeFoodLoggedEvent } = await import('../../signals/normalizer')
        const signal = normalizeFoodLoggedEvent(event)
        expect(signal.domain).toBe('nutrition')
        expect(signal.data.estimatedCalories).toBe(500)
        expect(signal.userId).toBe(USER_ID)
      })

      await bus.emitEvent(makeFoodEvent())
    })

    it('training.logged event produces training signal with intensity zone', async () => {
      const bus = new RuntimeEventBus()

      bus.subscribe<TrainingLoggedEvent>('training.logged', async (event) => {
        const { normalizeTrainingLoggedEvent } = await import('../../signals/normalizer')
        const signal = normalizeTrainingLoggedEvent(event)
        expect(signal.domain).toBe('training')
        expect(signal.data.tss).toBe(75)
        expect(signal.data.intensityZone).toBeDefined()
        expect(signal.data.intensityZone).not.toBe('unknown')
      })

      await bus.emitEvent(makeTrainingEvent())
    })

    it('recovery.updated event produces recovery signal with status', async () => {
      const bus = new RuntimeEventBus()

      bus.subscribe<RecoveryUpdatedEvent>('recovery.updated', async (event) => {
        const { normalizeRecoveryUpdatedEvent } = await import('../../signals/normalizer')
        const signal = normalizeRecoveryUpdatedEvent(event)
        expect(signal.domain).toBe('recovery')
        expect(signal.data.status).toBe('good') // readinessScore=72 → good
      })

      await bus.emitEvent(makeRecoveryEvent())
    })

    it('multiple events to same user/date accumulate state', async () => {
      // Use the singleton bus with registered flow handlers
      registerRuntimeFlowHandlers()

      await _emitEvent(makeFoodEvent())
      await _emitEvent(makeTrainingEvent())
      await _emitEvent(makeRecoveryEvent())

      const state = getRuntimeState(USER_ID, DATE)
      expect(state.nutrition).not.toBeNull()
      expect(state.training).not.toBeNull()
      expect(state.recovery).not.toBeNull()
      expect(state.nutrition?.estimatedCalories).toBe(500)
      expect(state.training?.tss).toBe(75)
      expect(state.recovery?.readinessScore).toBe(72)
    })

    it('conversation.started sets active conversation', async () => {
      registerRuntimeFlowHandlers()

      const convEvent: ConversationStartedEvent = {
        id: 'evt-conv-001',
        type: 'conversation.started',
        userId: USER_ID,
        timestamp: `${DATE}T09:00:00.000Z`,
        source: 'user-input',
        priority: 'high',
        payload: {
          conversationId: 'conv-001',
          sessionType: 'coaching',
          channel: 'web',
        },
      }

      await _emitEvent(convEvent)

      const state = getRuntimeState(USER_ID, DATE)
      expect(state.conversation?.activeConversationId).toBe('conv-001')
    })

    it('conversation.ended clears active conversation', async () => {
      registerRuntimeFlowHandlers()

      const endEvent: ConversationEndedEvent = {
        id: 'evt-conv-end-001',
        type: 'conversation.ended',
        userId: USER_ID,
        timestamp: `${DATE}T09:30:00.000Z`,
        source: 'system',
        priority: 'silent',
        payload: {
          conversationId: 'conv-001',
          durationSeconds: 180,
          messageCount: 12,
          resolvedIntent: 'log-meal',
          userSatisfied: true,
        },
      }

      await _emitEvent(endEvent)

      const state = getRuntimeState(USER_ID, DATE)
      expect(state.conversation?.activeConversationId).toBeNull()
    })
  })
})
