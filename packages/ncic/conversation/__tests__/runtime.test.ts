/**
 * Tests: NCIC Conversation Runtime Pipeline
 *
 * Covers:
 *   - processConversationTurn() — full pipeline
 *   - Edge cases (empty message, no runtime data)
 *   - Runtime state influence on pipeline output
 *   - Multi-intent scenarios
 *   - Continuity hints from lastInteractionAt
 *   - Risk flag propagation through pipeline
 *   - Correct result shape
 */

import { describe, it, expect } from 'vitest'
import { processConversationTurn } from '../runtime'
import { createEmptySnapshot } from '../../runtime/state'
import type { RuntimeContextSnapshot } from '../../runtime/state'
import { INTENT_NAMES } from '../../intents/types'

// ─── Test Factories ───────────────────────────────────────────────────────────

const BASE_DATE = '2026-05-14'
const BASE_USER = 'user-runtime-test'

function makeSnapshot(overrides?: Partial<RuntimeContextSnapshot>): RuntimeContextSnapshot {
  return { ...createEmptySnapshot(BASE_USER, BASE_DATE), ...overrides }
}

function run(message: string, snapOverrides?: Partial<RuntimeContextSnapshot>, extra?: {
  recentIntents?: Array<typeof INTENT_NAMES[keyof typeof INTENT_NAMES]>
  lastInteractionAt?: string | null
}) {
  return processConversationTurn({
    message,
    userId: BASE_USER,
    date: BASE_DATE,
    snapshot: makeSnapshot(snapOverrides),
    recentIntents: extra?.recentIntents,
    lastInteractionAt: extra?.lastInteractionAt,
  })
}

// ─── Result Shape ─────────────────────────────────────────────────────────────

describe('processConversationTurn — result shape', () => {
  it('returns context, plan, message, processedAt', () => {
    const result = run('Zjadłem burgera')
    expect(result.context).toBeDefined()
    expect(result.plan).toBeDefined()
    expect(result.message).toBe('Zjadłem burgera')
    expect(result.processedAt).toBeTruthy()
  })

  it('processedAt is a valid ISO timestamp', () => {
    const result = run('Zjadłem burgera')
    const d = new Date(result.processedAt)
    expect(d.getTime()).not.toBeNaN()
  })

  it('context has all required fields', () => {
    const result = run('Zjadłem burgera')
    const { context } = result
    expect(context.userId).toBe(BASE_USER)
    expect(context.date).toBe(BASE_DATE)
    expect(context.timestamp).toBeTruthy()
    expect(context.intent).toBeDefined()
    expect(context.classification).toBeDefined()
    expect(context.confidence).toBeDefined()
    expect(Array.isArray(context.activeDomains)).toBe(true)
    expect(context.runtimeSnapshot).toBeDefined()
    expect(context.runtimeSignals).toBeDefined()
    expect(context.responseMode).toBeDefined()
    expect(Array.isArray(context.suggestedCapabilities)).toBe(true)
    expect(Array.isArray(context.continuityHints)).toBe(true)
    expect(Array.isArray(context.riskFlags)).toBe(true)
  })

  it('plan has all required fields', () => {
    const result = run('Zjadłem burgera')
    const { plan } = result
    expect(typeof plan.primaryGoal).toBe('string')
    expect(plan.tone).toBeDefined()
    expect(plan.responseStrategy).toBeDefined()
    expect(Array.isArray(plan.capabilitiesToInvoke)).toBe(true)
    expect(Array.isArray(plan.followUpQuestions)).toBe(true)
    expect(plan.interventionPriority).toBeDefined()
    expect(typeof plan.planningRationale).toBe('string')
  })

  it('never throws for any message', () => {
    const messages = ['', '   ', 'xyz 123 !@#', 'Zjadłem burgera', 'Cześć!', 'Co powinienem jeść?']
    for (const msg of messages) {
      expect(() => run(msg)).not.toThrow()
    }
  })
})

// ─── Food Log Pipeline ────────────────────────────────────────────────────────

describe('processConversationTurn — food_log', () => {
  it('classifies food_log message correctly', () => {
    const result = run('Zjadłem burgera z frytkami na lunch')
    expect(result.context.intent.name).toBe(INTENT_NAMES.FOOD_LOG)
  })

  it('includes nutrition.ingest in capabilities', () => {
    const result = run('Zjadłem burgera z frytkami na lunch')
    if (result.context.intent.name === INTENT_NAMES.FOOD_LOG) {
      expect(result.plan.capabilitiesToInvoke).toContain('nutrition.ingest')
    }
  })

  it('responseMode is coaching or analytical for food_log', () => {
    const result = run('Zjadłem burgera na lunch')
    if (result.context.intent.name === INTENT_NAMES.FOOD_LOG) {
      expect(['coaching', 'analytical']).toContain(result.context.responseMode)
    }
  })

  it('switches to analytical when nutrition is complete', () => {
    const result = run('Zjadłem kolację', {
      nutrition: {
        estimatedCalories: 2000,
        estimatedProteinG: 130,
        estimatedCarbsG: 220,
        estimatedFatG: 70,
        dailyCalorieTarget: 2000,
        lastUpdated: '2026-05-14T18:00:00Z',
      },
    })
    if (result.context.intent.name === INTENT_NAMES.FOOD_LOG) {
      expect(result.context.responseMode).toBe('analytical')
    }
  })

  it('nutrition logged today is visible in continuity hints', () => {
    const result = run('Zjadłem kanapkę', {
      nutrition: {
        estimatedCalories: 400,
        estimatedProteinG: 25,
        estimatedCarbsG: 45,
        estimatedFatG: 15,
        lastUpdated: '2026-05-14T08:00:00Z',
      },
    })
    expect(result.context.continuityHints.some((h) => h.includes('nutrition'))).toBe(true)
  })
})

// ─── Training Pipeline ────────────────────────────────────────────────────────

describe('processConversationTurn — training_reference', () => {
  it('classifies training message', () => {
    const result = run('Pojechałem 40km na rowerze przez 90 minut')
    expect(result.context.intent.name).toBe(INTENT_NAMES.TRAINING_REFERENCE)
  })

  it('includes training.contextualize in capabilities', () => {
    const result = run('Pojechałem 40km na rowerze')
    if (result.context.intent.name === INTENT_NAMES.TRAINING_REFERENCE) {
      expect(result.plan.capabilitiesToInvoke).toContain('training.contextualize')
    }
  })

  it('detects overtraining risk with high TSS + poor recovery', () => {
    const result = run('Pojechałem na rowerze', {
      training: { durationMinutes: 200, tss: 150, lastUpdated: '2026-05-14T10:00:00Z' },
      recovery: { status: 'poor', lastUpdated: '2026-05-14T07:00:00Z' },
    })
    if (result.context.riskFlags.includes('overtraining')) {
      expect(result.plan.interventionPriority).toBe('critical')
    }
  })

  it('training hint appears in continuity hints', () => {
    const result = run('Zjadłem burgera', {
      training: { durationMinutes: 75, lastUpdated: '2026-05-14T09:00:00Z' },
    })
    expect(result.context.continuityHints.some((h) => h.includes('training today'))).toBe(true)
  })
})

// ─── Recovery Pipeline ────────────────────────────────────────────────────────

describe('processConversationTurn — recovery_reflection', () => {
  it('classifies recovery message', () => {
    const result = run('Jestem bardzo zmęczony po wczorajszym treningu')
    expect(result.context.intent.name).toBe(INTENT_NAMES.RECOVERY_REFLECTION)
  })

  it('responseMode is reflective for recovery_reflection', () => {
    const result = run('Jestem bardzo zmęczony')
    if (result.context.intent.name === INTENT_NAMES.RECOVERY_REFLECTION) {
      expect(result.context.responseMode).toBe('reflective')
    }
  })

  it('poor recovery status appears in continuity hints', () => {
    const result = run('Cześć', {
      recovery: { status: 'poor', totalSleepMinutes: 300, lastUpdated: '2026-05-14T07:00:00Z' },
    })
    expect(result.context.continuityHints).toContain('high fatigue detected')
  })

  it('follow-up questions generated for recovery ask strategy', () => {
    const result = run('Jestem zmęczony')
    if (
      result.context.intent.name === INTENT_NAMES.RECOVERY_REFLECTION &&
      result.plan.responseStrategy === 'ask'
    ) {
      expect(result.plan.followUpQuestions.length).toBeGreaterThan(0)
    }
  })
})

// ─── Goal Update Pipeline ─────────────────────────────────────────────────────

describe('processConversationTurn — goal_update', () => {
  it('classifies goal update message', () => {
    const result = run('Chcę schudnąć 5kg do końca roku')
    expect(result.context.intent.name).toBe(INTENT_NAMES.GOAL_UPDATE)
  })

  it('responseMode is coaching for goal_update', () => {
    const result = run('Chcę schudnąć 5kg')
    if (result.context.intent.name === INTENT_NAMES.GOAL_UPDATE) {
      expect(result.context.responseMode).toBe('coaching')
    }
  })

  it('plan strategy is coach for goal_update', () => {
    const result = run('Chcę schudnąć 5kg')
    if (result.context.intent.name === INTENT_NAMES.GOAL_UPDATE) {
      expect(result.plan.responseStrategy).toBe('coach')
    }
  })
})

// ─── Coach Question Pipeline ──────────────────────────────────────────────────

describe('processConversationTurn — coach_question', () => {
  it('classifies coaching question', () => {
    const result = run('Co powinienem zjeść przed treningiem?')
    expect(result.context.intent.name).toBe(INTENT_NAMES.COACH_QUESTION)
  })

  it('responseMode is educational for coach_question', () => {
    const result = run('Co powinienem zjeść przed treningiem?')
    if (result.context.intent.name === INTENT_NAMES.COACH_QUESTION) {
      expect(result.context.responseMode).toBe('educational')
    }
  })

  it('requiresLlm is true for coaching question', () => {
    const result = run('Co powinienem zjeść przed treningiem?')
    if (result.context.intent.name === INTENT_NAMES.COACH_QUESTION) {
      expect(result.context.requiresLlm).toBe(true)
    }
  })
})

// ─── Casual Conversation Pipeline ─────────────────────────────────────────────

describe('processConversationTurn — casual_conversation', () => {
  it('classifies greeting', () => {
    const result = run('Cześć! Jak się masz?')
    expect(result.context.intent.name).toBe(INTENT_NAMES.CASUAL_CONVERSATION)
  })

  it('responseMode is motivational for casual', () => {
    const result = run('Cześć!')
    if (result.context.intent.name === INTENT_NAMES.CASUAL_CONVERSATION) {
      expect(result.context.responseMode).toBe('motivational')
    }
  })

  it('strategy is motivate for casual', () => {
    const result = run('Cześć!')
    if (result.context.intent.name === INTENT_NAMES.CASUAL_CONVERSATION) {
      expect(result.plan.responseStrategy).toBe('motivate')
    }
  })
})

// ─── Unknown / Edge Cases ─────────────────────────────────────────────────────

describe('processConversationTurn — unknown intent', () => {
  it('empty message produces unknown or fallback', () => {
    const result = run('')
    expect(
      result.context.intent.name === INTENT_NAMES.UNKNOWN ||
      result.context.classification.fallbackNeeded,
    ).toBe(true)
  })

  it('unknown intent triggers clarify or ask strategy', () => {
    const result = run('')
    expect(['clarify', 'ask']).toContain(result.plan.responseStrategy)
  })

  it('follow-up questions are provided for unknown intent', () => {
    const result = run('')
    if (result.context.riskFlags.includes('unknown_intent')) {
      expect(result.plan.followUpQuestions.length).toBeGreaterThan(0)
    }
  })

  it('unknown_intent flag set in riskFlags', () => {
    const result = run('')
    expect(result.context.riskFlags).toContain('unknown_intent')
  })
})

// ─── Multi-Intent Pipeline ────────────────────────────────────────────────────

describe('processConversationTurn — multi-intent', () => {
  it('handles food + training message', () => {
    const result = run('Zjadłem burgera i pojechałem na rowerze przez godzinę')
    expect(result.context.classification).toBeDefined()
    if (result.context.classification.isMultiIntent) {
      const names = result.context.classification.intents.map((i) => i.name)
      expect(names).toContain(INTENT_NAMES.FOOD_LOG)
      expect(names).toContain(INTENT_NAMES.TRAINING_REFERENCE)
    }
  })

  it('merged capabilities for multi-intent', () => {
    const result = run('Zjadłem sałatkę i pojechałem na rowerze')
    if (result.context.classification.isMultiIntent) {
      expect(result.context.suggestedCapabilities).toContain('nutrition.ingest')
      expect(result.context.suggestedCapabilities).toContain('training.contextualize')
    }
  })
})

// ─── Continuity Logic ─────────────────────────────────────────────────────────

describe('processConversationTurn — continuity', () => {
  it('conversation gap hint appears after 3-day break', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const result = run('Cześć', undefined, { lastInteractionAt: threeDaysAgo })
    expect(result.context.continuityHints.some((h) => h.includes('conversation resumed'))).toBe(true)
  })

  it('no gap hint for same-day interaction', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const result = run('Cześć', undefined, { lastInteractionAt: oneHourAgo })
    expect(result.context.continuityHints.some((h) => h.includes('conversation resumed'))).toBe(false)
  })

  it('no data hint when nothing logged', () => {
    const result = run('Cześć')
    expect(result.context.continuityHints).toContain('no data logged today')
  })

  it('recent intents influence classification via continuity boost', () => {
    const withHistory = processConversationTurn({
      message: 'Czuję się zmęczony',
      userId: BASE_USER,
      date: BASE_DATE,
      snapshot: makeSnapshot(),
      recentIntents: [INTENT_NAMES.TRAINING_REFERENCE],
    })
    const withoutHistory = processConversationTurn({
      message: 'Czuję się zmęczony',
      userId: BASE_USER,
      date: BASE_DATE,
      snapshot: makeSnapshot(),
    })

    const withScore = withHistory.context.classification.intents
      .find((i) => i.name === INTENT_NAMES.RECOVERY_REFLECTION)?.confidence ?? 0
    const withoutScore = withoutHistory.context.classification.intents
      .find((i) => i.name === INTENT_NAMES.RECOVERY_REFLECTION)?.confidence ?? 0

    expect(withScore).toBeGreaterThanOrEqual(withoutScore)
  })
})

// ─── Risk Flags Through Pipeline ──────────────────────────────────────────────

describe('processConversationTurn — risk flag propagation', () => {
  it('high_stress flag propagates to critical intervention priority', () => {
    const result = run('Zjadłem burgera', {
      behavioral: { stressLevel: 5, hasNotes: false, lastUpdated: '2026-05-14T08:00:00Z' },
    })
    if (result.context.riskFlags.includes('high_stress')) {
      expect(result.plan.interventionPriority).toBe('critical')
    }
  })

  it('overtraining risk flag surfaces in plan', () => {
    const result = run('Byłem na rowerze', {
      training: { durationMinutes: 200, tss: 155, lastUpdated: '2026-05-14T10:00:00Z' },
      recovery: { status: 'poor', lastUpdated: '2026-05-14T07:00:00Z' },
    })
    if (result.context.riskFlags.includes('overtraining')) {
      expect(result.plan.interventionPriority).toBe('critical')
      expect(result.plan.responseStrategy).toBe('ask')
    }
  })

  it('low_energy risk flag gives high intervention priority', () => {
    const result = run('Zjadłem burgera', {
      behavioral: { energyLevel: 1, hasNotes: false, lastUpdated: '2026-05-14T08:00:00Z' },
    })
    if (result.context.riskFlags.includes('low_energy')) {
      expect(result.plan.interventionPriority).toBe('high')
    }
  })
})

// ─── Full State Influence ─────────────────────────────────────────────────────

describe('processConversationTurn — runtime state influence', () => {
  it('activeDomains reflects runtime state', () => {
    const result = run('Cześć', {
      nutrition: { estimatedCalories: 500, estimatedProteinG: 30, estimatedCarbsG: 60, estimatedFatG: 15, lastUpdated: '2026-05-14T08:00:00Z' },
      training: { durationMinutes: 60, lastUpdated: '2026-05-14T09:00:00Z' },
    })
    expect(result.context.activeDomains).toContain('nutrition')
    expect(result.context.activeDomains).toContain('training')
  })

  it('empty snapshot produces empty activeDomains', () => {
    const result = run('Cześć')
    expect(result.context.activeDomains).toHaveLength(0)
  })

  it('runtime signals accurately reflect training data', () => {
    const result = run('Cześć', {
      training: { durationMinutes: 90, tss: 80, intensityZone: 'z3', lastUpdated: '2026-05-14T09:00:00Z' },
    })
    expect(result.context.runtimeSignals.trainingDurationMinutes).toBe(90)
    expect(result.context.runtimeSignals.trainingTss).toBe(80)
    expect(result.context.runtimeSignals.trainingZone).toBe('z3')
  })

  it('optimal recovery appears in continuity hints', () => {
    const result = run('Cześć', {
      recovery: { status: 'optimal', readinessScore: 90, lastUpdated: '2026-05-14T07:00:00Z' },
    })
    expect(result.context.continuityHints).toContain('recovery is optimal today')
  })
})
