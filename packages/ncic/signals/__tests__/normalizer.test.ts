/**
 * Tests: NCIC Signal Normalizer
 *
 * Validates deterministic normalization — same input → same output.
 */

import { describe, it, expect } from 'vitest'
import {
  normalizeFoodLoggedEvent,
  normalizeMealAnalyzedEvent,
  normalizeTrainingLoggedEvent,
  normalizeRecoveryUpdatedEvent,
  normalizeDailyReflectionEvent,
  normalizeConversationStartedEvent,
} from '../normalizer'
import type {
  FoodLoggedEvent,
  MealAnalyzedEvent,
  TrainingLoggedEvent,
  RecoveryUpdatedEvent,
  DailyReflectionLoggedEvent,
  ConversationStartedEvent,
} from '../../events/types'

// ─── Factories ────────────────────────────────────────────────────────────────

const baseEvent = {
  id: 'evt-001',
  userId: 'user-xyz',
  timestamp: '2026-05-14T08:00:00.000Z',
  source: 'user-input' as const,
}

// ─── Nutrition Signal ─────────────────────────────────────────────────────────

describe('normalizeFoodLoggedEvent', () => {
  const event: FoodLoggedEvent = {
    ...baseEvent,
    type: 'food.logged',
    priority: 'high',
    payload: {
      mealId: 'meal-001',
      dailyLogId: 'log-001',
      date: '2026-05-14',
      estimatedCalories: 550,
      estimatedProteinG: 40,
      estimatedCarbsG: 60,
      estimatedFatG: 20,
    },
  }

  it('produces a nutrition signal', () => {
    const signal = normalizeFoodLoggedEvent(event)
    expect(signal.domain).toBe('nutrition')
    expect(signal.userId).toBe('user-xyz')
    expect(signal.date).toBe('2026-05-14')
    expect(signal.data.estimatedCalories).toBe(550)
    expect(signal.data.estimatedProteinG).toBe(40)
    expect(signal.data.isPartialDay).toBe(true)
  })

  it('marks confidence as estimated when calories provided', () => {
    const signal = normalizeFoodLoggedEvent(event)
    expect(signal.confidence).toBe('estimated')
  })

  it('marks confidence as low when no calories provided', () => {
    const noCalEvent: FoodLoggedEvent = {
      ...event,
      payload: { mealId: 'meal-002', dailyLogId: 'log-001', date: '2026-05-14' },
    }
    const signal = normalizeFoodLoggedEvent(noCalEvent)
    expect(signal.confidence).toBe('low')
    expect(signal.data.estimatedCalories).toBe(0)
  })

  it('is deterministic — same input same output shape', () => {
    const s1 = normalizeFoodLoggedEvent(event)
    const s2 = normalizeFoodLoggedEvent(event)
    expect(s1.domain).toBe(s2.domain)
    expect(s1.data.estimatedCalories).toBe(s2.data.estimatedCalories)
    expect(s1.userId).toBe(s2.userId)
  })
})

// ─── Meal Analyzed Signal ─────────────────────────────────────────────────────

describe('normalizeMealAnalyzedEvent', () => {
  const event: MealAnalyzedEvent = {
    ...baseEvent,
    type: 'meal.analyzed',
    priority: 'normal',
    source: 'ai-analysis',
    payload: {
      mealId: 'meal-001',
      dailyLogId: 'log-001',
      date: '2026-05-14',
      calories: 600,
      proteinG: 45,
      carbsG: 70,
      fatG: 18,
      confidence: 'high',
      analysisModel: 'gpt-4o',
    },
  }

  it('produces a nutrition signal with correct macros', () => {
    const signal = normalizeMealAnalyzedEvent(event)
    expect(signal.domain).toBe('nutrition')
    expect(signal.data.estimatedCalories).toBe(600)
    expect(signal.data.estimatedProteinG).toBe(45)
    expect(signal.confidence).toBe('high')
  })
})

// ─── Training Signal ──────────────────────────────────────────────────────────

describe('normalizeTrainingLoggedEvent', () => {
  const event: TrainingLoggedEvent = {
    ...baseEvent,
    type: 'training.logged',
    priority: 'high',
    source: 'sync-garmin',
    payload: {
      workoutId: 'workout-001',
      date: '2026-05-14',
      durationMinutes: 120,
      distanceKm: 40,
      avgHeartRate: 150,
      tss: 100,
      sport: 'cycling',
    },
  }

  it('produces a training signal', () => {
    const signal = normalizeTrainingLoggedEvent(event)
    expect(signal.domain).toBe('training')
    expect(signal.data.durationMinutes).toBe(120)
    expect(signal.data.tss).toBe(100)
    expect(signal.data.sport).toBe('cycling')
  })

  it('derives intensity zone from TSS and duration', () => {
    const signal = normalizeTrainingLoggedEvent(event)
    // tss=100, duration=120 → intensityFactor=0.833 → falls in [0.8,1.2) → z3
    expect(signal.data.intensityZone).toBe('z3')
  })

  it('marks confidence high when TSS is available', () => {
    const signal = normalizeTrainingLoggedEvent(event)
    expect(signal.confidence).toBe('high')
  })

  it('marks confidence medium when no TSS', () => {
    const noTssEvent: TrainingLoggedEvent = {
      ...event,
      payload: { ...event.payload, tss: undefined },
    }
    const signal = normalizeTrainingLoggedEvent(noTssEvent)
    expect(signal.confidence).toBe('medium')
  })

  it('falls back to HR for intensity zone when no TSS', () => {
    const noTssEvent: TrainingLoggedEvent = {
      ...event,
      payload: { ...event.payload, tss: undefined, avgHeartRate: 165 },
    }
    const signal = normalizeTrainingLoggedEvent(noTssEvent)
    // 165/180 = 0.917 → falls in [0.9,∞) → z5
    expect(signal.data.intensityZone).toBe('z5')
  })
})

// ─── Recovery Signal ──────────────────────────────────────────────────────────

describe('normalizeRecoveryUpdatedEvent', () => {
  const event: RecoveryUpdatedEvent = {
    ...baseEvent,
    type: 'recovery.updated',
    priority: 'high',
    source: 'sync-garmin',
    payload: {
      metricId: 'metric-001',
      date: '2026-05-14',
      readinessScore: 82,
      sleepScore: 78,
      totalSleepMinutes: 430,
      restingHeartRate: 48,
    },
  }

  it('produces a recovery signal', () => {
    const signal = normalizeRecoveryUpdatedEvent(event)
    expect(signal.domain).toBe('recovery')
    expect(signal.data.readinessScore).toBe(82)
    expect(signal.data.totalSleepMinutes).toBe(430)
  })

  it('derives status "optimal" for score >= 80', () => {
    const signal = normalizeRecoveryUpdatedEvent(event)
    expect(signal.data.status).toBe('optimal')
  })

  it('derives status "poor" for score < 45', () => {
    const poorEvent: RecoveryUpdatedEvent = {
      ...event,
      payload: { ...event.payload, readinessScore: 30, sleepScore: undefined },
    }
    const signal = normalizeRecoveryUpdatedEvent(poorEvent)
    expect(signal.data.status).toBe('poor')
  })

  it('uses explicit status if provided', () => {
    const explicitEvent: RecoveryUpdatedEvent = {
      ...event,
      payload: { ...event.payload, status: 'good' },
    }
    const signal = normalizeRecoveryUpdatedEvent(explicitEvent)
    expect(signal.data.status).toBe('good')
  })
})

// ─── Behavioral Signal ────────────────────────────────────────────────────────

describe('normalizeDailyReflectionEvent', () => {
  const event: DailyReflectionLoggedEvent = {
    ...baseEvent,
    type: 'daily-reflection.logged',
    priority: 'normal',
    payload: {
      date: '2026-05-14',
      mood: 4,
      energyLevel: 3,
      stressLevel: 2,
      notes: 'Felt strong today',
      tags: ['cycling', 'recovery'],
    },
  }

  it('produces a behavioral signal', () => {
    const signal = normalizeDailyReflectionEvent(event)
    expect(signal.domain).toBe('behavioral')
    expect(signal.data.mood).toBe(4)
    expect(signal.data.energyLevel).toBe(3)
    expect(signal.data.hasNotes).toBe(true)
  })

  it('derives wellbeing score from mood/energy/stress', () => {
    const signal = normalizeDailyReflectionEvent(event)
    // mood=4, energy=3, stress inverted=4 → avg=3.67 → 3.7
    expect(signal.data.wellbeingScore).toBe(3.7)
  })

  it('marks hasNotes false when notes absent', () => {
    const noNotesEvent: DailyReflectionLoggedEvent = {
      ...event,
      payload: { date: '2026-05-14', mood: 3 },
    }
    const signal = normalizeDailyReflectionEvent(noNotesEvent)
    expect(signal.data.hasNotes).toBe(false)
  })
})

// ─── Conversation Signal ──────────────────────────────────────────────────────

describe('normalizeConversationStartedEvent', () => {
  const event: ConversationStartedEvent = {
    ...baseEvent,
    type: 'conversation.started',
    priority: 'high',
    payload: {
      conversationId: 'conv-001',
      sessionType: 'coaching',
      channel: 'web',
    },
  }

  it('produces a conversation signal', () => {
    const signal = normalizeConversationStartedEvent(event)
    expect(signal.domain).toBe('conversation')
    expect(signal.data.conversationId).toBe('conv-001')
    expect(signal.data.producedAction).toBe(false)
  })

  it('extracts date from event timestamp', () => {
    const signal = normalizeConversationStartedEvent(event)
    expect(signal.date).toBe('2026-05-14')
  })
})
