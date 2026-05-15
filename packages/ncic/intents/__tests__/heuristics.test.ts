/**
 * Tests: NCIC Heuristics — tokenization, keyword matching, scoring
 */

import { describe, it, expect } from 'vitest'
import {
  tokenize,
  matchKeywords,
  applySignalBoost,
  applyContinuityBoost,
  scoreAllIntents,
  needsFallback,
} from '../heuristics'
import { INTENT_NAMES } from '../types'
import type { RuntimeContextHint } from '../types'

const emptyContext: RuntimeContextHint = {
  hasNutritionToday: false,
  hasTrainingToday: false,
  recoveryStatus: null,
  activeConversationId: null,
  recentDomains: [],
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────

describe('tokenize', () => {
  it('splits on whitespace', () => {
    const tokens = tokenize('hello world foo')
    expect(tokens).toContain('hello')
    expect(tokens).toContain('world')
    expect(tokens).toContain('foo')
  })

  it('lowercases output', () => {
    const tokens = tokenize('Hello World')
    expect(tokens).toContain('hello')
    expect(tokens).toContain('world')
  })

  it('strips Polish diacritics', () => {
    const tokens = tokenize('zjadłem śniadanie')
    expect(tokens).toContain('zjadlem')
    expect(tokens).toContain('sniadanie')
  })

  it('filters out single-character tokens', () => {
    const tokens = tokenize('a b c foo')
    expect(tokens).not.toContain('a')
    expect(tokens).not.toContain('b')
    expect(tokens).toContain('foo')
  })

  it('handles punctuation', () => {
    const tokens = tokenize('zjadłem burgera, frytki i colę!')
    expect(tokens).toContain('zjadlem')
    expect(tokens).toContain('burgera')
  })
})

// ─── Keyword Matching ─────────────────────────────────────────────────────────

describe('matchKeywords', () => {
  it('matches single token', () => {
    const result = matchKeywords(['zjadlem', 'burgera'], 'zjadlem burgera', ['zjadłem'])
    expect(result.matched).toContain('zjadłem')
    expect(result.coverageScore).toBeGreaterThan(0)
  })

  it('matches phrase in normalized message', () => {
    const result = matchKeywords(
      ['ile', 'kalorii'],
      'ile kalorii ma ten burger',
      ['ile kalorii'],
    )
    expect(result.matched).toContain('ile kalorii')
  })

  it('returns empty matched for no match', () => {
    const result = matchKeywords(['foo', 'bar'], 'foo bar', ['xyz'])
    expect(result.matched).toHaveLength(0)
    expect(result.coverageScore).toBe(0)
  })

  it('coverage score increases with more matches', () => {
    const r1 = matchKeywords(['ate'], 'ate lunch', ['ate'])
    const r2 = matchKeywords(['ate', 'lunch'], 'ate lunch', ['ate', 'lunch'])
    expect(r2.coverageScore).toBeGreaterThanOrEqual(r1.coverageScore)
  })

  it('coverage score is never above 1', () => {
    const result = matchKeywords(
      ['ate', 'lunch', 'chicken', 'salad', 'dinner'],
      'ate lunch chicken salad dinner',
      ['ate', 'lunch', 'chicken', 'salad', 'dinner', 'breakfast'],
    )
    expect(result.coverageScore).toBeLessThanOrEqual(1)
  })
})

// ─── Signal Boost ─────────────────────────────────────────────────────────────

describe('applySignalBoost', () => {
  it('returns base score unchanged with no context', () => {
    const score = applySignalBoost(0.5, INTENT_NAMES.FOOD_LOG, undefined)
    expect(score).toBe(0.5)
  })

  it('boosts food_log when nutrition domain is recent', () => {
    const ctx: RuntimeContextHint = {
      ...emptyContext,
      hasNutritionToday: true,
      recentDomains: ['nutrition'],
    }
    const boosted = applySignalBoost(0.5, INTENT_NAMES.FOOD_LOG, ctx)
    expect(boosted).toBeGreaterThan(0.5)
  })

  it('boosts recovery_reflection when training happened today', () => {
    const ctx: RuntimeContextHint = {
      ...emptyContext,
      hasTrainingToday: true,
      recentDomains: ['training'],
    }
    const base = applySignalBoost(0.5, INTENT_NAMES.RECOVERY_REFLECTION, emptyContext)
    const boosted = applySignalBoost(0.5, INTENT_NAMES.RECOVERY_REFLECTION, ctx)
    expect(boosted).toBeGreaterThan(base)
  })

  it('boosts recovery extra when status is poor', () => {
    const ctx: RuntimeContextHint = {
      ...emptyContext,
      recoveryStatus: 'poor',
      recentDomains: [],
    }
    const base = applySignalBoost(0.5, INTENT_NAMES.RECOVERY_REFLECTION, emptyContext)
    const boosted = applySignalBoost(0.5, INTENT_NAMES.RECOVERY_REFLECTION, ctx)
    expect(boosted).toBeGreaterThan(base)
  })

  it('never exceeds 1.0', () => {
    const ctx: RuntimeContextHint = {
      hasNutritionToday: true,
      hasTrainingToday: true,
      recoveryStatus: 'poor',
      activeConversationId: 'conv-1',
      recentDomains: ['nutrition', 'training', 'recovery', 'behavioral', 'conversation'],
    }
    const score = applySignalBoost(0.99, INTENT_NAMES.RECOVERY_REFLECTION, ctx)
    expect(score).toBeLessThanOrEqual(1.0)
  })
})

// ─── Continuity Boost ─────────────────────────────────────────────────────────

describe('applyContinuityBoost', () => {
  it('returns unchanged score with no recent intents', () => {
    const score = applyContinuityBoost(0.5, INTENT_NAMES.RECOVERY_REFLECTION, undefined)
    expect(score).toBe(0.5)
  })

  it('boosts recovery_reflection when recent was training_reference', () => {
    const base = applyContinuityBoost(0.5, INTENT_NAMES.RECOVERY_REFLECTION, [])
    const boosted = applyContinuityBoost(0.5, INTENT_NAMES.RECOVERY_REFLECTION, [INTENT_NAMES.TRAINING_REFERENCE])
    expect(boosted).toBeGreaterThan(base)
  })

  it('does not boost unrelated intents', () => {
    const base = applyContinuityBoost(0.5, INTENT_NAMES.GOAL_UPDATE, [])
    const same = applyContinuityBoost(0.5, INTENT_NAMES.GOAL_UPDATE, [INTENT_NAMES.TRAINING_REFERENCE])
    expect(same).toBe(base)
  })

  it('never exceeds 1.0', () => {
    const score = applyContinuityBoost(0.99, INTENT_NAMES.RECOVERY_REFLECTION, [INTENT_NAMES.TRAINING_REFERENCE])
    expect(score).toBeLessThanOrEqual(1.0)
  })
})

// ─── Score All Intents ────────────────────────────────────────────────────────

describe('scoreAllIntents', () => {
  it('returns empty array for message with no keyword matches', () => {
    const candidates = scoreAllIntents('xyzabc123qwertyuiop')
    expect(candidates).toHaveLength(0)
  })

  it('returns candidates sorted by score descending', () => {
    const candidates = scoreAllIntents('Zjadłem burgera na lunch')
    for (let i = 0; i < candidates.length - 1; i++) {
      expect(candidates[i].score).toBeGreaterThanOrEqual(candidates[i + 1].score)
    }
  })

  it('food_log scores highest for clear food message', () => {
    const candidates = scoreAllIntents('Zjadłem burgera na lunch')
    expect(candidates[0]?.name).toBe(INTENT_NAMES.FOOD_LOG)
  })

  it('training_reference scores highest for clear training message', () => {
    const candidates = scoreAllIntents('Pojechałem 40km na rowerze')
    expect(candidates[0]?.name).toBe(INTENT_NAMES.TRAINING_REFERENCE)
  })
})

// ─── Fallback Detection ───────────────────────────────────────────────────────

describe('needsFallback', () => {
  it('returns true for empty candidates', () => {
    expect(needsFallback([])).toBe(true)
  })

  it('returns true when top score is below threshold', () => {
    expect(needsFallback([{ name: INTENT_NAMES.FOOD_LOG, score: 0.2, matchedKeywords: [], source: 'keyword-match' }])).toBe(true)
  })

  it('returns false when top score is above threshold', () => {
    expect(needsFallback([{ name: INTENT_NAMES.FOOD_LOG, score: 0.8, matchedKeywords: ['burgera'], source: 'keyword-match' }])).toBe(false)
  })
})
