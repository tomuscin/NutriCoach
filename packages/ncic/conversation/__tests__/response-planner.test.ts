/**
 * Tests: NCIC Response Planner
 *
 * Covers:
 *   - planConversationalResponse()
 *   - Strategy selection per intent + risk flags
 *   - Primary goal generation
 *   - Capability ordering (conversation.respond last)
 *   - Follow-up questions (ask/clarify strategies)
 *   - Intervention priority
 *   - Planning rationale format
 */

import { describe, it, expect } from 'vitest'
import { planConversationalResponse } from '../response-planner'
import { buildConversationContext } from '../context-builder'
import { classifyIntent } from '../../intents/classifier'
import { createEmptySnapshot } from '../../runtime/state'
import type { RuntimeContextSnapshot } from '../../runtime/state'
import type { ClassificationResult } from '../../intents/types'
import { INTENT_NAMES } from '../../intents/types'
import type { ConversationContext } from '../types'

// ─── Test Factories ───────────────────────────────────────────────────────────

function makeSnapshot(overrides?: Partial<RuntimeContextSnapshot>): RuntimeContextSnapshot {
  return { ...createEmptySnapshot('user-planner-test', '2026-05-14'), ...overrides }
}

function makeContext(message: string, snapOverrides?: Partial<RuntimeContextSnapshot>): ConversationContext {
  const snapshot = makeSnapshot(snapOverrides)
  const classification = classifyIntent({
    message,
    runtimeContext: {
      hasNutritionToday: snapshot.nutrition !== null,
      hasTrainingToday: snapshot.training !== null,
      recoveryStatus: snapshot.recovery?.status ?? null,
      activeConversationId: snapshot.conversation?.activeConversationId ?? null,
      recentDomains: [],
    },
  })
  return buildConversationContext({
    userId: 'user-planner-test',
    date: '2026-05-14',
    message,
    classification,
    snapshot,
  })
}

// ─── Response Strategy ────────────────────────────────────────────────────────

describe('planConversationalResponse — responseStrategy', () => {
  it('uses clarify for unknown intent', () => {
    const ctx = makeContext('')
    const plan = planConversationalResponse(ctx)
    expect(plan.responseStrategy).toBe('clarify')
  })

  it('uses ask when fallbackNeeded', () => {
    const ctx = makeContext('xyz gibberish abc 123')
    if (ctx.classification.fallbackNeeded) {
      const plan = planConversationalResponse(ctx)
      expect(['ask', 'clarify']).toContain(plan.responseStrategy)
    }
  })

  it('uses coach for food_log', () => {
    const ctx = makeContext('Zjadłem burgera na lunch')
    if (ctx.intent.name === INTENT_NAMES.FOOD_LOG) {
      const plan = planConversationalResponse(ctx)
      expect(plan.responseStrategy).toBe('coach')
    }
  })

  it('uses summarize for meal_analysis', () => {
    const ctx = makeContext('Ile kalorii ma ten posiłek z kurczaka?')
    if (ctx.intent.name === INTENT_NAMES.MEAL_ANALYSIS) {
      const plan = planConversationalResponse(ctx)
      expect(plan.responseStrategy).toBe('summarize')
    }
  })

  it('uses summarize for training_reference', () => {
    const ctx = makeContext('Pojechałem 40km na rowerze')
    if (ctx.intent.name === INTENT_NAMES.TRAINING_REFERENCE) {
      const plan = planConversationalResponse(ctx)
      expect(plan.responseStrategy).toBe('summarize')
    }
  })

  it('uses ask for recovery_reflection', () => {
    const ctx = makeContext('Jestem zmęczony')
    if (ctx.intent.name === INTENT_NAMES.RECOVERY_REFLECTION) {
      const plan = planConversationalResponse(ctx)
      expect(plan.responseStrategy).toBe('ask')
    }
  })

  it('uses coach for goal_update', () => {
    const ctx = makeContext('Chcę schudnąć 5kg')
    if (ctx.intent.name === INTENT_NAMES.GOAL_UPDATE) {
      const plan = planConversationalResponse(ctx)
      expect(plan.responseStrategy).toBe('coach')
    }
  })

  it('uses summarize for progress_check', () => {
    const ctx = makeContext('Jak mi idzie w tym tygodniu?')
    if (ctx.intent.name === INTENT_NAMES.PROGRESS_CHECK) {
      const plan = planConversationalResponse(ctx)
      expect(plan.responseStrategy).toBe('summarize')
    }
  })

  it('uses educate for coach_question', () => {
    const ctx = makeContext('Co powinienem jeść przed treningiem?')
    if (ctx.intent.name === INTENT_NAMES.COACH_QUESTION) {
      const plan = planConversationalResponse(ctx)
      expect(plan.responseStrategy).toBe('educate')
    }
  })

  it('uses motivate for casual conversation', () => {
    const ctx = makeContext('Cześć! Jak się masz?')
    if (ctx.intent.name === INTENT_NAMES.CASUAL_CONVERSATION) {
      const plan = planConversationalResponse(ctx)
      expect(plan.responseStrategy).toBe('motivate')
    }
  })

  it('uses ask when overtraining flag is present', () => {
    const ctx = makeContext('Pojechałem na rowerze', {
      training: { durationMinutes: 180, tss: 150, lastUpdated: '2026-05-14T10:00:00Z' },
      recovery: { status: 'poor', lastUpdated: '2026-05-14T07:00:00Z' },
    })
    if (ctx.riskFlags.includes('overtraining')) {
      const plan = planConversationalResponse(ctx)
      expect(plan.responseStrategy).toBe('ask')
    }
  })

  it('uses ask when high_stress flag is present', () => {
    const ctx = makeContext('Zjadłem burgera', {
      behavioral: { stressLevel: 5, hasNotes: false, lastUpdated: '2026-05-14T08:00:00Z' },
    })
    if (ctx.riskFlags.includes('high_stress')) {
      const plan = planConversationalResponse(ctx)
      expect(plan.responseStrategy).toBe('ask')
    }
  })
})

// ─── Tone ─────────────────────────────────────────────────────────────────────

describe('planConversationalResponse — tone', () => {
  it('tone matches context responseMode', () => {
    const ctx = makeContext('Zjadłem burgera')
    const plan = planConversationalResponse(ctx)
    expect(plan.tone).toBe(ctx.responseMode)
  })
})

// ─── Primary Goal ─────────────────────────────────────────────────────────────

describe('planConversationalResponse — primaryGoal', () => {
  it('is a non-empty string', () => {
    const ctx = makeContext('Zjadłem burgera')
    const plan = planConversationalResponse(ctx)
    expect(typeof plan.primaryGoal).toBe('string')
    expect(plan.primaryGoal.length).toBeGreaterThan(5)
  })

  it('addresses unknown intent explicitly', () => {
    const ctx = makeContext('')
    const plan = planConversationalResponse(ctx)
    expect(plan.primaryGoal.toLowerCase()).toContain('understand')
  })

  it('addresses overtraining explicitly', () => {
    const ctx = makeContext('Pojechałem na rowerze', {
      training: { durationMinutes: 200, tss: 155, lastUpdated: '2026-05-14T10:00:00Z' },
      recovery: { status: 'poor', lastUpdated: '2026-05-14T07:00:00Z' },
    })
    if (ctx.riskFlags.includes('overtraining')) {
      const plan = planConversationalResponse(ctx)
      expect(plan.primaryGoal.toLowerCase()).toContain('training')
    }
  })

  it('addresses high_stress explicitly', () => {
    const ctx = makeContext('Zjadłem burgera', {
      behavioral: { stressLevel: 5, hasNotes: false, lastUpdated: '2026-05-14T08:00:00Z' },
    })
    if (ctx.riskFlags.includes('high_stress')) {
      const plan = planConversationalResponse(ctx)
      expect(plan.primaryGoal.toLowerCase()).toContain('stress')
    }
  })
})

// ─── Capability Ordering ──────────────────────────────────────────────────────

describe('planConversationalResponse — capabilitiesToInvoke', () => {
  it('conversation.respond is last when present', () => {
    const ctx = makeContext('Cześć!')
    const plan = planConversationalResponse(ctx)
    if (plan.capabilitiesToInvoke.includes('conversation.respond')) {
      expect(plan.capabilitiesToInvoke[plan.capabilitiesToInvoke.length - 1]).toBe('conversation.respond')
    }
  })

  it('includes at least one capability', () => {
    const ctx = makeContext('Zjadłem burgera')
    const plan = planConversationalResponse(ctx)
    expect(plan.capabilitiesToInvoke.length).toBeGreaterThan(0)
  })

  it('nutrition.ingest appears for food_log', () => {
    const ctx = makeContext('Zjadłem burgera na lunch')
    if (ctx.intent.name === INTENT_NAMES.FOOD_LOG) {
      const plan = planConversationalResponse(ctx)
      expect(plan.capabilitiesToInvoke).toContain('nutrition.ingest')
    }
  })

  it('training.contextualize appears for training_reference', () => {
    const ctx = makeContext('Pojechałem 40km na rowerze')
    if (ctx.intent.name === INTENT_NAMES.TRAINING_REFERENCE) {
      const plan = planConversationalResponse(ctx)
      expect(plan.capabilitiesToInvoke).toContain('training.contextualize')
    }
  })
})

// ─── Follow-Up Questions ──────────────────────────────────────────────────────

describe('planConversationalResponse — followUpQuestions', () => {
  it('returns empty array for non-ask/clarify strategy', () => {
    const ctx = makeContext('Zjadłem burgera na lunch')
    const plan = planConversationalResponse(ctx)
    if (plan.responseStrategy !== 'ask' && plan.responseStrategy !== 'clarify') {
      expect(plan.followUpQuestions).toHaveLength(0)
    }
  })

  it('returns questions for unknown_intent risk flag', () => {
    const ctx = makeContext('')
    const plan = planConversationalResponse(ctx)
    if (ctx.riskFlags.includes('unknown_intent')) {
      expect(plan.followUpQuestions.length).toBeGreaterThan(0)
    }
  })

  it('returns questions for recovery_reflection ask strategy', () => {
    const ctx = makeContext('Jestem bardzo zmęczony po treningu')
    if (ctx.intent.name === INTENT_NAMES.RECOVERY_REFLECTION) {
      const plan = planConversationalResponse(ctx)
      if (plan.responseStrategy === 'ask') {
        expect(plan.followUpQuestions.length).toBeGreaterThan(0)
      }
    }
  })

  it('follow-up questions are strings', () => {
    const ctx = makeContext('')
    const plan = planConversationalResponse(ctx)
    for (const q of plan.followUpQuestions) {
      expect(typeof q).toBe('string')
      expect(q.length).toBeGreaterThan(3)
    }
  })
})

// ─── Intervention Priority ────────────────────────────────────────────────────

describe('planConversationalResponse — interventionPriority', () => {
  it('critical priority for overtraining', () => {
    const ctx = makeContext('Pojechałem na rowerze', {
      training: { durationMinutes: 200, tss: 155, lastUpdated: '2026-05-14T10:00:00Z' },
      recovery: { status: 'poor', lastUpdated: '2026-05-14T07:00:00Z' },
    })
    if (ctx.riskFlags.includes('overtraining')) {
      const plan = planConversationalResponse(ctx)
      expect(plan.interventionPriority).toBe('critical')
    }
  })

  it('critical priority for high_stress', () => {
    const ctx = makeContext('Zjadłem burgera', {
      behavioral: { stressLevel: 5, hasNotes: false, lastUpdated: '2026-05-14T08:00:00Z' },
    })
    if (ctx.riskFlags.includes('high_stress')) {
      const plan = planConversationalResponse(ctx)
      expect(plan.interventionPriority).toBe('critical')
    }
  })

  it('high priority for low_energy', () => {
    const ctx = makeContext('Zjadłem burgera', {
      behavioral: { energyLevel: 1, hasNotes: false, lastUpdated: '2026-05-14T08:00:00Z' },
    })
    if (ctx.riskFlags.includes('low_energy')) {
      const plan = planConversationalResponse(ctx)
      expect(plan.interventionPriority).toBe('high')
    }
  })

  it('low priority for high-confidence clean intent', () => {
    const ctx = makeContext('Zjadłem burgera na lunch i na obiad')
    if (ctx.riskFlags.length === 0 && ctx.confidence === 'high') {
      const plan = planConversationalResponse(ctx)
      expect(plan.interventionPriority).toBe('low')
    }
  })

  it('is always a valid value', () => {
    const messages = ['Zjadłem burgera', 'Byłem na rowerze', 'Cześć', '']
    const validPriorities = new Set(['critical', 'high', 'normal', 'low', 'none'])
    for (const msg of messages) {
      const ctx = makeContext(msg)
      const plan = planConversationalResponse(ctx)
      expect(validPriorities.has(plan.interventionPriority)).toBe(true)
    }
  })
})

// ─── Planning Rationale ───────────────────────────────────────────────────────

describe('planConversationalResponse — planningRationale', () => {
  it('is a non-empty string', () => {
    const ctx = makeContext('Zjadłem burgera')
    const plan = planConversationalResponse(ctx)
    expect(typeof plan.planningRationale).toBe('string')
    expect(plan.planningRationale.length).toBeGreaterThan(5)
  })

  it('contains intent name', () => {
    const ctx = makeContext('Zjadłem burgera')
    const plan = planConversationalResponse(ctx)
    expect(plan.planningRationale).toContain(ctx.intent.name)
  })

  it('contains strategy name', () => {
    const ctx = makeContext('Zjadłem burgera')
    const plan = planConversationalResponse(ctx)
    expect(plan.planningRationale).toContain(plan.responseStrategy)
  })
})
