/**
 * Tests: NCIC Runtime Event Bus
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RuntimeEventBus } from '../bus'
import type { FoodLoggedEvent, TrainingLoggedEvent } from '../../events/types'

// ─── Test Factory ─────────────────────────────────────────────────────────────

function makeFoodLoggedEvent(overrides?: Partial<FoodLoggedEvent>): FoodLoggedEvent {
  return {
    id: 'evt-001',
    type: 'food.logged',
    userId: 'user-abc',
    timestamp: '2026-05-14T08:00:00.000Z',
    source: 'user-input',
    priority: 'high',
    payload: {
      mealId: 'meal-001',
      dailyLogId: 'log-001',
      date: '2026-05-14',
      estimatedCalories: 450,
      estimatedProteinG: 30,
      estimatedCarbsG: 50,
      estimatedFatG: 15,
    },
    ...overrides,
  }
}

function makeTrainingLoggedEvent(overrides?: Partial<TrainingLoggedEvent>): TrainingLoggedEvent {
  return {
    id: 'evt-002',
    type: 'training.logged',
    userId: 'user-abc',
    timestamp: '2026-05-14T07:00:00.000Z',
    source: 'sync-garmin',
    priority: 'high',
    payload: {
      workoutId: 'workout-001',
      date: '2026-05-14',
      durationMinutes: 90,
      distanceKm: 30,
      avgHeartRate: 145,
      tss: 85,
      sport: 'cycling',
    },
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RuntimeEventBus', () => {
  let bus: RuntimeEventBus

  beforeEach(() => {
    // Fresh bus per test — don't use the singleton
    bus = new RuntimeEventBus()
  })

  describe('subscribe / unsubscribe', () => {
    it('registers a handler and receives events', async () => {
      const received: FoodLoggedEvent[] = []
      bus.subscribe<FoodLoggedEvent>('food.logged', (e) => received.push(e))

      await bus.emitEvent(makeFoodLoggedEvent())

      expect(received).toHaveLength(1)
      expect(received[0].payload.mealId).toBe('meal-001')
    })

    it('does not call handler after unsubscribe', async () => {
      const received: FoodLoggedEvent[] = []
      const handler = (e: FoodLoggedEvent) => received.push(e)

      bus.subscribe<FoodLoggedEvent>('food.logged', handler)
      bus.unsubscribe<FoodLoggedEvent>('food.logged', handler)

      await bus.emitEvent(makeFoodLoggedEvent())

      expect(received).toHaveLength(0)
    })

    it('subscribe returns a working unsubscribe function', async () => {
      const received: FoodLoggedEvent[] = []
      const unsub = bus.subscribe<FoodLoggedEvent>('food.logged', (e) => received.push(e))

      unsub()
      await bus.emitEvent(makeFoodLoggedEvent())

      expect(received).toHaveLength(0)
    })

    it('supports multiple handlers for the same event type', async () => {
      let countA = 0
      let countB = 0

      bus.subscribe<FoodLoggedEvent>('food.logged', () => { countA++ })
      bus.subscribe<FoodLoggedEvent>('food.logged', () => { countB++ })

      await bus.emitEvent(makeFoodLoggedEvent())

      expect(countA).toBe(1)
      expect(countB).toBe(1)
    })

    it('does not call handlers for unrelated event types', async () => {
      const received: TrainingLoggedEvent[] = []
      bus.subscribe<TrainingLoggedEvent>('training.logged', (e) => received.push(e))

      await bus.emitEvent(makeFoodLoggedEvent())

      expect(received).toHaveLength(0)
    })
  })

  describe('emitEvent', () => {
    it('supports async handlers', async () => {
      const results: string[] = []

      bus.subscribe<FoodLoggedEvent>('food.logged', async (e) => {
        await Promise.resolve()
        results.push(e.payload.mealId)
      })

      await bus.emitEvent(makeFoodLoggedEvent())

      expect(results).toEqual(['meal-001'])
    })

    it('does not rethrow handler errors — swallows them', async () => {
      bus.subscribe<FoodLoggedEvent>('food.logged', () => {
        throw new Error('handler boom')
      })

      await expect(bus.emitEvent(makeFoodLoggedEvent())).resolves.toBeUndefined()
    })

    it('continues calling subsequent handlers after one throws', async () => {
      const results: number[] = []

      bus.subscribe<FoodLoggedEvent>('food.logged', () => { throw new Error('fail') })
      bus.subscribe<FoodLoggedEvent>('food.logged', () => { results.push(1) })

      await bus.emitEvent(makeFoodLoggedEvent())

      expect(results).toEqual([1])
    })
  })

  describe('handlerCount', () => {
    it('returns 0 for unknown event type', () => {
      expect(bus.handlerCount('food.logged')).toBe(0)
    })

    it('reflects current handler count', () => {
      const h1 = () => {}
      const h2 = () => {}
      bus.subscribe<FoodLoggedEvent>('food.logged', h1)
      bus.subscribe<FoodLoggedEvent>('food.logged', h2)
      expect(bus.handlerCount('food.logged')).toBe(2)
      bus.unsubscribe<FoodLoggedEvent>('food.logged', h1)
      expect(bus.handlerCount('food.logged')).toBe(1)
    })
  })

  describe('clearHandlers', () => {
    it('clears handlers for a specific type', async () => {
      const received: FoodLoggedEvent[] = []
      bus.subscribe<FoodLoggedEvent>('food.logged', (e) => received.push(e))
      bus.clearHandlers('food.logged')
      await bus.emitEvent(makeFoodLoggedEvent())
      expect(received).toHaveLength(0)
    })

    it('clears all handlers when called without argument', async () => {
      const received: Array<unknown> = []
      bus.subscribe<FoodLoggedEvent>('food.logged', (e) => received.push(e))
      bus.subscribe<TrainingLoggedEvent>('training.logged', (e) => received.push(e))
      bus.clearHandlers()
      await bus.emitEvent(makeFoodLoggedEvent())
      await bus.emitEvent(makeTrainingLoggedEvent())
      expect(received).toHaveLength(0)
    })
  })
})
