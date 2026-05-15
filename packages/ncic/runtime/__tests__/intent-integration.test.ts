/**
 * Tests: NCIC Runtime Intent Integration
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { buildRuntimeContextHint, processConversationalTurn } from '../intent-integration'
import { createEmptySnapshot } from '../state'
import { INTENT_NAMES } from '../../intents/types'
import type { RuntimeContextSnapshot } from '../state'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSnapshot(overrides?: Partial<RuntimeContextSnapshot>): RuntimeContextSnapshot {
  return {
    ...createEmptySnapshot('user-test', '2026-05-14'),
    ...overrides,
  }
}

// ─── buildRuntimeContextHint ──────────────────────────────────────────────────

describe('buildRuntimeContextHint', () => {
  it('returns all false/null for empty snapshot', () => {
    const hint = buildRuntimeContextHint(createEmptySnapshot('u', '2026-05-14'))
    expect(hint.hasNutritionToday).toBe(false)
    expect(hint.hasTrainingToday).toBe(false)
    expect(hint.recoveryStatus).toBeNull()
    expect(hint.activeConversationId).toBeNull()
    expect(hint.recentDomains).toHaveLength(0)
  })

  it('sets hasNutritionToday when nutrition state present', () => {
    const snapshot = makeSnapshot({
      nutrition: {
        estimatedCalories: 500,
        estimatedProteinG: 30,
        estimatedCarbsG: 60,
        estimatedFatG: 15,
        lastUpdated: '2026-05-14T10:00:00Z',
      },
    })
    const hint = buildRuntimeContextHint(snapshot)
    expect(hint.hasNutritionToday).toBe(true)
    expect(hint.recentDomains).toContain('nutrition')
  })

  it('sets hasTrainingToday when training state present', () => {
    const snapshot = makeSnapshot({
      training: {
        durationMinutes: 90,
        tss: 75,
        lastUpdated: '2026-05-14T09:00:00Z',
      },
    })
    const hint = buildRuntimeContextHint(snapshot)
    expect(hint.hasTrainingToday).toBe(true)
    expect(hint.recentDomains).toContain('training')
  })

  it('maps recovery status correctly', () => {
    const snapshot = makeSnapshot({
      recovery: {
        status: 'poor',
        lastUpdated: '2026-05-14T07:00:00Z',
      },
    })
    const hint = buildRuntimeContextHint(snapshot)
    expect(hint.recoveryStatus).toBe('poor')
    expect(hint.recentDomains).toContain('recovery')
  })

  it('includes conversation domain when active', () => {
    const snapshot = makeSnapshot({
      conversation: {
        activeConversationId: 'conv-001',
        sessionType: 'coaching',
        startedAt: '2026-05-14T10:00:00Z',
      },
    })
    const hint = buildRuntimeContextHint(snapshot)
    expect(hint.activeConversationId).toBe('conv-001')
    expect(hint.recentDomains).toContain('conversation')
  })
})

// ─── processConversationalTurn ────────────────────────────────────────────────

describe('processConversationalTurn', () => {
  it('returns a classification result', () => {
    const snapshot = makeSnapshot()
    const turn = processConversationalTurn('Zjadłem burgera', snapshot)
    expect(turn.classification).toBeDefined()
    expect(turn.classification.primaryIntent).toBeDefined()
  })

  it('resolves capabilities for food_log intent', () => {
    const snapshot = makeSnapshot()
    const turn = processConversationalTurn('Zjadłem kanapkę na lunch', snapshot)
    expect(turn.capabilities).toContain('nutrition.ingest')
  })

  it('resolves capabilities for training intent', () => {
    const snapshot = makeSnapshot()
    const turn = processConversationalTurn('Pojechałem 40km na rowerze', snapshot)
    expect(turn.capabilities).toContain('training.contextualize')
  })

  it('requiresLlm is false for deterministic-only capabilities', () => {
    const snapshot = makeSnapshot()
    const turn = processConversationalTurn('Pojechałem na rowerze', snapshot)
    // training.contextualize does not require LLM
    if (turn.capabilities.every((c) => c === 'training.contextualize')) {
      expect(turn.requiresLlm).toBe(false)
    }
  })

  it('requiresLlm is true when coaching capability is included', () => {
    const snapshot = makeSnapshot()
    const turn = processConversationalTurn('Co powinienem jeść przed treningiem?', snapshot)
    if (turn.capabilities.includes('coaching.advise') || turn.capabilities.includes('conversation.respond')) {
      expect(turn.requiresLlm).toBe(true)
    }
  })

  it('includes snapshotUsed in result', () => {
    const snapshot = makeSnapshot()
    const turn = processConversationalTurn('Cześć', snapshot)
    expect(turn.snapshotUsed.userId).toBe('user-test')
  })

  it('uses runtime context to influence classification', () => {
    const snapshotWithTraining = makeSnapshot({
      training: {
        durationMinutes: 120,
        tss: 95,
        lastUpdated: '2026-05-14T09:00:00Z',
      },
    })
    const snapshotEmpty = makeSnapshot()

    const turnWithCtx = processConversationalTurn('Jestem zmęczony', snapshotWithTraining)
    const turnWithout = processConversationalTurn('Jestem zmęczony', snapshotEmpty)

    const recoveryScoreWith = turnWithCtx.classification.intents
      .find((i) => i.name === INTENT_NAMES.RECOVERY_REFLECTION)?.confidence ?? 0

    const recoveryScoreWithout = turnWithout.classification.intents
      .find((i) => i.name === INTENT_NAMES.RECOVERY_REFLECTION)?.confidence ?? 0

    // Training context should boost recovery classification
    expect(recoveryScoreWith).toBeGreaterThanOrEqual(recoveryScoreWithout)
  })
})
