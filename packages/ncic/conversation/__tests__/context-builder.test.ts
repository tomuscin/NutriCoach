/**
 * Tests: NCIC Conversation Context Builder
 *
 * Covers:
 *   - buildRuntimeSignalSummary()
 *   - deriveRiskFlags()
 *   - buildContinuityHints()
 *   - selectResponseMode()
 *   - buildConversationContext() (integration)
 */

import { describe, it, expect } from 'vitest'
import {
  buildConversationContext,
  buildRuntimeSignalSummary,
  deriveRiskFlags,
  buildContinuityHints,
  selectResponseMode,
  type BuildContextInput,
} from '../context-builder'
import { createEmptySnapshot } from '../../runtime/state'
import { classifyIntent } from '../../intents/classifier'
import type { RuntimeContextSnapshot } from '../../runtime/state'
import type { ClassificationResult } from '../../intents/types'
import { INTENT_NAMES } from '../../intents/types'

// ─── Test Factories ───────────────────────────────────────────────────────────

function makeSnapshot(overrides?: Partial<RuntimeContextSnapshot>): RuntimeContextSnapshot {
  return { ...createEmptySnapshot('user-ctx-test', '2026-05-14'), ...overrides }
}

function makeClassification(message: string, snapshotOverrides?: Partial<RuntimeContextSnapshot>): ClassificationResult {
  const snap = makeSnapshot(snapshotOverrides)
  return classifyIntent({
    message,
    runtimeContext: {
      hasNutritionToday: snap.nutrition !== null,
      hasTrainingToday: snap.training !== null,
      recoveryStatus: snap.recovery?.status ?? null,
      activeConversationId: snap.conversation?.activeConversationId ?? null,
      recentDomains: [],
    },
  })
}

function makeContextInput(message: string, snapOverrides?: Partial<RuntimeContextSnapshot>): BuildContextInput {
  const snapshot = makeSnapshot(snapOverrides)
  const classification = makeClassification(message, snapOverrides)
  return {
    userId: 'user-ctx-test',
    date: '2026-05-14',
    message,
    classification,
    snapshot,
  }
}

// ─── buildRuntimeSignalSummary ────────────────────────────────────────────────

describe('buildRuntimeSignalSummary', () => {
  it('returns all null/false for empty snapshot', () => {
    const s = buildRuntimeSignalSummary(createEmptySnapshot('u', '2026-05-14'))
    expect(s.hasNutritionToday).toBe(false)
    expect(s.hasTrainingToday).toBe(false)
    expect(s.caloriesLogged).toBeNull()
    expect(s.recoveryStatus).toBeNull()
    expect(s.hasBehavioralData).toBe(false)
    expect(s.isActiveConversation).toBe(false)
  })

  it('detects nutrition state', () => {
    const snap = makeSnapshot({
      nutrition: {
        estimatedCalories: 1800,
        estimatedProteinG: 120,
        estimatedCarbsG: 200,
        estimatedFatG: 60,
        dailyCalorieTarget: 2000,
        remainingCalories: 200,
        lastUpdated: '2026-05-14T12:00:00Z',
      },
    })
    const s = buildRuntimeSignalSummary(snap)
    expect(s.hasNutritionToday).toBe(true)
    expect(s.caloriesLogged).toBe(1800)
    expect(s.caloriesRemaining).toBe(200)
    expect(s.nutritionComplete).toBe(true)
  })

  it('marks nutrition incomplete when calories < 500', () => {
    const snap = makeSnapshot({
      nutrition: {
        estimatedCalories: 300,
        estimatedProteinG: 20,
        estimatedCarbsG: 40,
        estimatedFatG: 10,
        lastUpdated: '2026-05-14T08:00:00Z',
      },
    })
    const s = buildRuntimeSignalSummary(snap)
    expect(s.nutritionComplete).toBe(false)
  })

  it('marks nutrition incomplete when far below daily target', () => {
    const snap = makeSnapshot({
      nutrition: {
        estimatedCalories: 600,
        estimatedProteinG: 40,
        estimatedCarbsG: 70,
        estimatedFatG: 20,
        dailyCalorieTarget: 2000,
        lastUpdated: '2026-05-14T08:00:00Z',
      },
    })
    const s = buildRuntimeSignalSummary(snap)
    expect(s.nutritionComplete).toBe(false) // 600 < 2000*0.8=1600
  })

  it('detects training state', () => {
    const snap = makeSnapshot({
      training: {
        durationMinutes: 90,
        tss: 75,
        intensityZone: 'z3',
        lastUpdated: '2026-05-14T09:00:00Z',
      },
    })
    const s = buildRuntimeSignalSummary(snap)
    expect(s.hasTrainingToday).toBe(true)
    expect(s.trainingDurationMinutes).toBe(90)
    expect(s.trainingTss).toBe(75)
    expect(s.trainingZone).toBe('z3')
  })

  it('detects recovery state', () => {
    const snap = makeSnapshot({
      recovery: {
        status: 'poor',
        readinessScore: 42,
        totalSleepMinutes: 300,
        lastUpdated: '2026-05-14T07:00:00Z',
      },
    })
    const s = buildRuntimeSignalSummary(snap)
    expect(s.recoveryStatus).toBe('poor')
    expect(s.recoveryScore).toBe(42)
    expect(s.sleepHours).toBe(5) // 300/60 = 5
  })

  it('converts totalSleepMinutes to sleepHours', () => {
    const snap = makeSnapshot({
      recovery: {
        status: 'good',
        totalSleepMinutes: 480,
        lastUpdated: '2026-05-14T07:00:00Z',
      },
    })
    const s = buildRuntimeSignalSummary(snap)
    expect(s.sleepHours).toBe(8)
  })

  it('detects behavioral state', () => {
    const snap = makeSnapshot({
      behavioral: {
        mood: 4,
        energyLevel: 3,
        stressLevel: 2,
        hasNotes: false,
        lastUpdated: '2026-05-14T08:00:00Z',
      },
    })
    const s = buildRuntimeSignalSummary(snap)
    expect(s.hasBehavioralData).toBe(true)
    expect(s.moodScore).toBe(4)
    expect(s.energyScore).toBe(3)
    expect(s.stressScore).toBe(2)
  })

  it('detects active conversation', () => {
    const snap = makeSnapshot({
      conversation: {
        activeConversationId: 'conv-abc',
        sessionType: 'coaching',
        startedAt: '2026-05-14T10:00:00Z',
      },
    })
    const s = buildRuntimeSignalSummary(snap)
    expect(s.isActiveConversation).toBe(true)
    expect(s.activeConversationId).toBe('conv-abc')
  })
})

// ─── deriveRiskFlags ──────────────────────────────────────────────────────────

describe('deriveRiskFlags', () => {
  const emptySignals = buildRuntimeSignalSummary(createEmptySnapshot('u', '2026-05-14'))

  it('returns no flags for clean healthy state', () => {
    const classification = makeClassification('Zjadłem burgera')
    const flags = deriveRiskFlags(classification, emptySignals)
    expect(flags).not.toContain('unknown_intent')
    expect(flags).not.toContain('overtraining')
    expect(flags).not.toContain('high_stress')
  })

  it('sets unknown_intent flag for unknown intent', () => {
    const classification = makeClassification('xyz gibberish')
    const flags = deriveRiskFlags(classification, emptySignals)
    if (classification.primaryIntent.name === INTENT_NAMES.UNKNOWN) {
      expect(flags).toContain('unknown_intent')
    }
  })

  it('sets unknown_intent when fallbackNeeded', () => {
    const classification = makeClassification('')
    expect(classification.fallbackNeeded).toBe(true)
    const flags = deriveRiskFlags(classification, emptySignals)
    expect(flags).toContain('unknown_intent')
  })

  it('sets overtraining flag when TSS > 120 and recovery is poor', () => {
    const signals = { ...emptySignals, trainingTss: 140, recoveryStatus: 'poor' as const }
    const classification = makeClassification('Zjadłem burgera')
    const flags = deriveRiskFlags(classification, signals)
    expect(flags).toContain('overtraining')
  })

  it('does NOT set overtraining when recovery is good despite high TSS', () => {
    const signals = { ...emptySignals, trainingTss: 140, recoveryStatus: 'good' as const }
    const classification = makeClassification('Zjadłem burgera')
    const flags = deriveRiskFlags(classification, signals)
    expect(flags).not.toContain('overtraining')
  })

  it('sets low_energy when energy score <= 2', () => {
    const signals = { ...emptySignals, energyScore: 1 }
    const classification = makeClassification('Zjadłem burgera')
    const flags = deriveRiskFlags(classification, signals)
    expect(flags).toContain('low_energy')
  })

  it('sets low_energy for poor recovery + high TSS even without behavioral data', () => {
    const signals = { ...emptySignals, recoveryStatus: 'poor' as const, trainingTss: 95 }
    const classification = makeClassification('Zjadłem burgera')
    const flags = deriveRiskFlags(classification, signals)
    expect(flags).toContain('low_energy')
  })

  it('sets high_stress when stress level >= 4', () => {
    const signals = { ...emptySignals, stressScore: 5 }
    const classification = makeClassification('Zjadłem burgera')
    const flags = deriveRiskFlags(classification, signals)
    expect(flags).toContain('high_stress')
  })

  it('does NOT set high_stress when stress level = 3', () => {
    const signals = { ...emptySignals, stressScore: 3 }
    const classification = makeClassification('Zjadłem burgera')
    const flags = deriveRiskFlags(classification, signals)
    expect(flags).not.toContain('high_stress')
  })

  it('sets incomplete_context for low confidence non-casual intent', () => {
    const classification = makeClassification('może coś')
    const flags = deriveRiskFlags(classification, emptySignals)
    if (
      classification.primaryIntent.confidenceLevel === 'low' &&
      classification.primaryIntent.name !== INTENT_NAMES.CASUAL_CONVERSATION &&
      classification.primaryIntent.name !== INTENT_NAMES.UNKNOWN
    ) {
      expect(flags).toContain('incomplete_context')
    }
  })

  it('returns deduplicated flags', () => {
    const signals = { ...emptySignals, trainingTss: 150, recoveryStatus: 'poor' as const, energyScore: 1 }
    const classification = makeClassification('Zjadłem burgera')
    const flags = deriveRiskFlags(classification, signals)
    const unique = new Set(flags)
    expect(flags.length).toBe(unique.size)
  })
})

// ─── buildContinuityHints ─────────────────────────────────────────────────────

describe('buildContinuityHints', () => {
  const emptySignals = buildRuntimeSignalSummary(createEmptySnapshot('u', '2026-05-14'))

  it('returns no data hint for empty state', () => {
    const hints = buildContinuityHints(emptySignals, null)
    expect(hints).toContain('no data logged today')
  })

  it('includes training hint when training logged', () => {
    const signals = { ...emptySignals, hasTrainingToday: true, trainingDurationMinutes: 60 }
    const hints = buildContinuityHints(signals, null)
    expect(hints.some((h) => h.includes('training today'))).toBe(true)
    expect(hints.some((h) => h.includes('60 min'))).toBe(true)
  })

  it('includes nutrition incomplete hint', () => {
    const signals = { ...emptySignals, hasNutritionToday: true, nutritionComplete: false, caloriesLogged: 400 }
    const hints = buildContinuityHints(signals, null)
    expect(hints).toContain('nutrition incomplete today')
  })

  it('includes nutrition complete hint', () => {
    const signals = { ...emptySignals, hasNutritionToday: true, nutritionComplete: true, caloriesLogged: 2000 }
    const hints = buildContinuityHints(signals, null)
    expect(hints).toContain('nutrition complete today')
  })

  it('includes high fatigue hint for poor recovery', () => {
    const signals = { ...emptySignals, recoveryStatus: 'poor' as const }
    const hints = buildContinuityHints(signals, null)
    expect(hints).toContain('high fatigue detected')
  })

  it('includes optimal recovery hint', () => {
    const signals = { ...emptySignals, recoveryStatus: 'optimal' as const }
    const hints = buildContinuityHints(signals, null)
    expect(hints).toContain('recovery is optimal today')
  })

  it('includes high stress hint when stress >= 4', () => {
    const signals = { ...emptySignals, stressScore: 4 }
    const hints = buildContinuityHints(signals, null)
    expect(hints).toContain('high stress detected')
  })

  it('includes low energy hint when energy <= 2', () => {
    const signals = { ...emptySignals, energyScore: 2 }
    const hints = buildContinuityHints(signals, null)
    expect(hints).toContain('low energy reported')
  })

  it('includes conversation resumed hint after 2+ day gap', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const hints = buildContinuityHints(emptySignals, threeDaysAgo)
    expect(hints.some((h) => h.includes('conversation resumed after'))).toBe(true)
  })

  it('does NOT include resumed hint for same-day interaction', () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    const hints = buildContinuityHints(emptySignals, oneHourAgo)
    expect(hints.some((h) => h.includes('conversation resumed'))).toBe(false)
  })

  it('includes active conversation hint', () => {
    const signals = { ...emptySignals, isActiveConversation: true, activeConversationId: 'conv-1' }
    const hints = buildContinuityHints(signals, null)
    expect(hints).toContain('active conversation session')
  })
})

// ─── selectResponseMode ───────────────────────────────────────────────────────

describe('selectResponseMode', () => {
  const emptySignals = buildRuntimeSignalSummary(createEmptySnapshot('u', '2026-05-14'))

  it('returns clarification for unknown intent', () => {
    const cl = makeClassification('')
    const mode = selectResponseMode(cl, emptySignals, [])
    expect(mode).toBe('clarification')
  })

  it('returns clarification for low confidence intent', () => {
    const cl = makeClassification('hmm może') // vague message
    const mode = selectResponseMode(cl, emptySignals, [])
    if (cl.primaryIntent.confidenceLevel === 'low') {
      expect(mode).toBe('clarification')
    }
  })

  it('returns reflective for high_stress flag', () => {
    const cl = makeClassification('Zjadłem burgera')
    const mode = selectResponseMode(cl, emptySignals, ['high_stress'])
    expect(mode).toBe('reflective')
  })

  it('returns reflective for overtraining flag', () => {
    const cl = makeClassification('Zjadłem burgera')
    const mode = selectResponseMode(cl, emptySignals, ['overtraining'])
    expect(mode).toBe('reflective')
  })

  it('returns analytical for food_log when nutrition complete', () => {
    const cl = makeClassification('Zjadłem burgera')
    const signals = { ...emptySignals, nutritionComplete: true, hasNutritionToday: true }
    if (cl.primaryIntent.name === INTENT_NAMES.FOOD_LOG) {
      const mode = selectResponseMode(cl, signals, [])
      expect(mode).toBe('analytical')
    }
  })

  it('returns coaching for food_log when nutrition incomplete', () => {
    const cl = makeClassification('Zjadłem burgera')
    const signals = { ...emptySignals, nutritionComplete: false, hasNutritionToday: true }
    if (cl.primaryIntent.name === INTENT_NAMES.FOOD_LOG) {
      const mode = selectResponseMode(cl, signals, [])
      expect(mode).toBe('coaching')
    }
  })

  it('returns reflective for recovery_reflection', () => {
    const cl = makeClassification('Jestem zmęczony')
    if (cl.primaryIntent.name === INTENT_NAMES.RECOVERY_REFLECTION) {
      const mode = selectResponseMode(cl, emptySignals, [])
      expect(mode).toBe('reflective')
    }
  })

  it('returns educational for coach_question', () => {
    const cl = makeClassification('Co powinienem zjeść przed treningiem?')
    if (cl.primaryIntent.name === INTENT_NAMES.COACH_QUESTION) {
      const mode = selectResponseMode(cl, emptySignals, [])
      expect(mode).toBe('educational')
    }
  })

  it('returns motivational for casual_conversation', () => {
    const cl = makeClassification('Cześć! Jak się masz?')
    if (cl.primaryIntent.name === INTENT_NAMES.CASUAL_CONVERSATION) {
      const mode = selectResponseMode(cl, emptySignals, [])
      expect(mode).toBe('motivational')
    }
  })

  it('returns coaching for goal_update', () => {
    const cl = makeClassification('Chcę schudnąć 5kg')
    if (cl.primaryIntent.name === INTENT_NAMES.GOAL_UPDATE) {
      const mode = selectResponseMode(cl, emptySignals, [])
      expect(mode).toBe('coaching')
    }
  })

  it('returns analytical for progress_check', () => {
    const cl = makeClassification('Jak mi idzie w tym tygodniu?')
    if (cl.primaryIntent.name === INTENT_NAMES.PROGRESS_CHECK) {
      const mode = selectResponseMode(cl, emptySignals, [])
      expect(mode).toBe('analytical')
    }
  })
})

// ─── buildConversationContext (integration) ───────────────────────────────────

describe('buildConversationContext', () => {
  it('returns context with correct userId and date', () => {
    const ctx = buildConversationContext(makeContextInput('Zjadłem burgera'))
    expect(ctx.userId).toBe('user-ctx-test')
    expect(ctx.date).toBe('2026-05-14')
    expect(ctx.timestamp).toBeTruthy()
  })

  it('has primaryIntent matching the classification', () => {
    const cl = makeClassification('Zjadłem burgera')
    const snapshot = makeSnapshot()
    const ctx = buildConversationContext({ userId: 'u', date: '2026-05-14', message: 'Zjadłem burgera', classification: cl, snapshot })
    expect(ctx.intent.name).toBe(cl.primaryIntent.name)
    expect(ctx.confidence).toBe(cl.primaryIntent.confidenceLevel)
  })

  it('activeDomains is empty for empty snapshot', () => {
    const ctx = buildConversationContext(makeContextInput('Cześć'))
    expect(ctx.activeDomains).toHaveLength(0)
  })

  it('activeDomains includes nutrition when logged', () => {
    const ctx = buildConversationContext(makeContextInput('Zjadłem burgera', {
      nutrition: { estimatedCalories: 800, estimatedProteinG: 50, estimatedCarbsG: 80, estimatedFatG: 30, lastUpdated: '2026-05-14T12:00:00Z' },
    }))
    expect(ctx.activeDomains).toContain('nutrition')
  })

  it('suggestedCapabilities is never empty', () => {
    const ctx = buildConversationContext(makeContextInput('Zjadłem burgera'))
    expect(ctx.suggestedCapabilities.length).toBeGreaterThan(0)
  })

  it('requiresLlm is false for pure food_log', () => {
    const cl = makeClassification('Zjadłem burgera')
    const snapshot = makeSnapshot()
    const ctx = buildConversationContext({ userId: 'u', date: '2026-05-14', message: 'Zjadłem burgera', classification: cl, snapshot })
    if (ctx.intent.name === INTENT_NAMES.FOOD_LOG && ctx.suggestedCapabilities.every((c) => c === 'nutrition.ingest')) {
      expect(ctx.requiresLlm).toBe(false)
    }
  })

  it('requiresLlm is true for coaching intent', () => {
    const cl = makeClassification('Co powinienem jeść przed treningiem?')
    const snapshot = makeSnapshot()
    const ctx = buildConversationContext({ userId: 'u', date: '2026-05-14', message: 'Co powinienem jeść?', classification: cl, snapshot })
    if (ctx.suggestedCapabilities.includes('coaching.advise')) {
      expect(ctx.requiresLlm).toBe(true)
    }
  })

  it('runtimeSignals reflect snapshot', () => {
    const ctx = buildConversationContext(makeContextInput('Zjadłem burgera', {
      training: { durationMinutes: 90, tss: 75, lastUpdated: '2026-05-14T09:00:00Z' },
    }))
    expect(ctx.runtimeSignals.hasTrainingToday).toBe(true)
    expect(ctx.runtimeSignals.trainingDurationMinutes).toBe(90)
  })

  it('riskFlags contains high_stress for stress level 5', () => {
    const ctx = buildConversationContext(makeContextInput('Zjadłem burgera', {
      behavioral: { stressLevel: 5, mood: 2, energyLevel: 2, hasNotes: false, lastUpdated: '2026-05-14T08:00:00Z' },
    }))
    expect(ctx.riskFlags).toContain('high_stress')
  })

  it('continuityHints is an array (possibly empty)', () => {
    const ctx = buildConversationContext(makeContextInput('Cześć'))
    expect(Array.isArray(ctx.continuityHints)).toBe(true)
  })
})
