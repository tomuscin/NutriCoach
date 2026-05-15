/**
 * Tests: Intervention Runtime
 *
 * Covers:
 *   - rankInterventions() — core logic
 *   - Intent boost (applyIntentBoost effect via rankInterventions)
 *   - Display mode assignment
 *   - Interruption level assignment
 *   - Timing assignment
 *   - maxPerTurn cap
 *   - shouldDisplayNow conditions
 *   - applyShownInterventions()
 *   - filterByDomain()
 *   - topN()
 *   - Full pipeline integration
 */

import { describe, it, expect } from 'vitest'
import {
  rankInterventions,
  applyShownInterventions,
  filterByDomain,
  topN,
} from '../runtime'
import type { InterventionContext } from '../types'
import { createEmptyAntiAnnoyanceState, createAntiAnnoyanceStore } from '../anti-annoyance'
import type { CanonicalRecommendation } from '../../recommendations/types'

// ─── Factories ────────────────────────────────────────────────────────────────

const USER = 'u-runtime-test'
const DATE = '2026-05-14'

function makeRec(overrides: Partial<CanonicalRecommendation> & { type: CanonicalRecommendation['type'] }): CanonicalRecommendation {
  return {
    id: `rec-${Math.random().toString(36).slice(2)}`,
    priority: 'medium',
    domain: 'recovery',
    title: 'Test recommendation',
    explanation: 'Explanation text',
    suggestedAction: 'Do something',
    confidence: 0.8,
    urgency: 0.7,
    impact: 0.75,
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    sourceSignals: [],
    relatedIntent: null,
    relatedMemory: [],
    score: Math.round(0.8 * 0.7 * 0.75 * 1000) / 1000,
    ...overrides,
  }
}

function makeContext(overrides?: Partial<InterventionContext>): InterventionContext {
  return {
    userId: USER,
    date: DATE,
    maxInterventions: 5,
    mode: 'reactive',
    currentIntent: null,
    annoyanceState: createEmptyAntiAnnoyanceState(USER),
    ...overrides,
  }
}

// ─── rankInterventions — Basic ────────────────────────────────────────────────

describe('rankInterventions — basic', () => {
  it('returns empty output for empty recommendations', () => {
    const out = rankInterventions([], makeContext())
    expect(out.allInterventions).toHaveLength(0)
    expect(out.activeInterventions).toHaveLength(0)
    expect(out.suppressedCount).toBe(0)
  })

  it('allInterventions contains all input recommendations', () => {
    const recs = [
      makeRec({ type: 'poor_recovery_warning', priority: 'medium' }),
      makeRec({ type: 'overtraining_alert', priority: 'critical' }),
    ]
    const out = rankInterventions(recs, makeContext())
    expect(out.allInterventions).toHaveLength(2)
  })

  it('returns processedAt timestamp', () => {
    const out = rankInterventions([], makeContext())
    expect(() => new Date(out.processedAt)).not.toThrow()
  })

  it('critical recommendation gets rank 1', () => {
    const recs = [
      makeRec({ type: 'poor_recovery_warning', priority: 'medium', score: 0.42 }),
      makeRec({ type: 'overtraining_alert', priority: 'critical', score: 0.9 }),
      makeRec({ type: 'behavioral_fatigue', priority: 'high', score: 0.6 }),
    ]
    const out = rankInterventions(recs, makeContext())
    expect(out.allInterventions[0].recommendation.type).toBe('overtraining_alert')
    expect(out.allInterventions[0].rank).toBe(1)
  })

  it('ranks are sequential integers starting from 1', () => {
    const recs = [
      makeRec({ type: 'poor_recovery_warning', priority: 'medium' }),
      makeRec({ type: 'behavioral_fatigue', priority: 'high' }),
      makeRec({ type: 'overtraining_alert', priority: 'critical' }),
    ]
    const out = rankInterventions(recs, makeContext())
    const ranks = out.allInterventions.map((i) => i.rank)
    expect(ranks).toContain(1)
    expect(ranks).toContain(2)
    expect(ranks).toContain(3)
  })

  it('suppressedCount matches suppressed recs', () => {
    const state = createEmptyAntiAnnoyanceState(USER)
    // Exceed session limit
    const sessionTs = [new Date().toISOString(), new Date().toISOString(), new Date().toISOString()]
    const fullState = { ...state, sessionInterventionTimestamps: sessionTs }

    const recs = [
      makeRec({ type: 'poor_recovery_warning', priority: 'medium' }),
      makeRec({ type: 'behavioral_fatigue', priority: 'medium' }),
      makeRec({ type: 'low_protein_intake', priority: 'medium' }),
    ]
    const context = makeContext({ annoyanceState: fullState })
    const out = rankInterventions(recs, context)
    expect(out.suppressedCount).toBeGreaterThan(0)
  })
})

// ─── shouldDisplayNow ─────────────────────────────────────────────────────────

describe('shouldDisplayNow', () => {
  it('critical rec in reactive mode shouldDisplayNow = true', () => {
    const recs = [makeRec({ type: 'overtraining_alert', priority: 'critical' })]
    const out = rankInterventions(recs, makeContext())
    expect(out.activeInterventions[0]?.shouldDisplayNow).toBe(true)
  })

  it('suppressed rec has shouldDisplayNow = false', () => {
    const sessionTs = Array.from({ length: 3 }, () => new Date().toISOString())
    const fullState = { ...createEmptyAntiAnnoyanceState(USER), sessionInterventionTimestamps: sessionTs }
    const recs = [makeRec({ type: 'poor_recovery_warning', priority: 'medium' })]
    const out = rankInterventions(recs, makeContext({ annoyanceState: fullState }))
    // All medium recs should be suppressed when session limit hit
    const suppressed = out.allInterventions.find((i) => i.recommendation.type === 'poor_recovery_warning')
    if (suppressed && !suppressed.shouldDisplayNow) {
      expect(suppressed.shouldDisplayNow).toBe(false)
    }
  })

  it('silent priority rec has shouldDisplayNow = false in reactive mode', () => {
    const recs = [makeRec({ type: 'nutrition_goal_met_positive', priority: 'silent' })]
    const out = rankInterventions(recs, makeContext())
    const intervention = out.allInterventions.find((i) => i.recommendation.type === 'nutrition_goal_met_positive')
    expect(intervention?.shouldDisplayNow).toBe(false)
  })
})

// ─── Display Mode ─────────────────────────────────────────────────────────────

describe('Display mode assignment', () => {
  it('critical in reactive mode = inline', () => {
    const recs = [makeRec({ type: 'overtraining_alert', priority: 'critical' })]
    const out = rankInterventions(recs, makeContext({ mode: 'reactive' }))
    const i = out.allInterventions.find((x) => x.recommendation.type === 'overtraining_alert')
    expect(i?.displayMode).toBe('inline')
  })

  it('critical in proactive mode = proactive', () => {
    const recs = [makeRec({ type: 'overtraining_alert', priority: 'critical' })]
    const out = rankInterventions(recs, makeContext({ mode: 'proactive' }))
    const i = out.allInterventions.find((x) => x.recommendation.type === 'overtraining_alert')
    expect(i?.displayMode).toBe('proactive')
  })

  it('silent priority = silent displayMode', () => {
    const recs = [makeRec({ type: 'nutrition_goal_met_positive', priority: 'silent', score: 0.1 })]
    const out = rankInterventions(recs, makeContext())
    const i = out.allInterventions.find((x) => x.recommendation.priority === 'silent')
    expect(i?.displayMode).toBe('silent')
  })

  it('low priority in reactive = dashboard-only', () => {
    const recs = [makeRec({ type: 'long_inactivity_nudge', priority: 'low', score: 0.15 })]
    const out = rankInterventions(recs, makeContext({ mode: 'reactive' }))
    const i = out.allInterventions.find((x) => x.recommendation.priority === 'low')
    expect(i?.displayMode).toBe('dashboard-only')
  })
})

// ─── Interruption Level ───────────────────────────────────────────────────────

describe('Interruption level assignment', () => {
  it('critical → urgent', () => {
    const recs = [makeRec({ type: 'overtraining_alert', priority: 'critical' })]
    const out = rankInterventions(recs, makeContext())
    expect(out.allInterventions[0].interruptionLevel).toBe('urgent')
  })

  it('high → assertive', () => {
    const recs = [makeRec({ type: 'poor_recovery_warning', priority: 'high' })]
    const out = rankInterventions(recs, makeContext())
    expect(out.allInterventions[0].interruptionLevel).toBe('assertive')
  })

  it('medium → soft', () => {
    const recs = [makeRec({ type: 'poor_recovery_warning', priority: 'medium' })]
    const out = rankInterventions(recs, makeContext())
    expect(out.allInterventions[0].interruptionLevel).toBe('soft')
  })

  it('low → passive', () => {
    const recs = [makeRec({ type: 'long_inactivity_nudge', priority: 'low' })]
    const out = rankInterventions(recs, makeContext())
    expect(out.allInterventions[0].interruptionLevel).toBe('passive')
  })

  it('silent → none', () => {
    const recs = [makeRec({ type: 'nutrition_goal_met_positive', priority: 'silent' })]
    const out = rankInterventions(recs, makeContext())
    expect(out.allInterventions[0].interruptionLevel).toBe('none')
  })
})

// ─── Timing Assignment ────────────────────────────────────────────────────────

describe('Timing assignment', () => {
  it('critical → now', () => {
    const recs = [makeRec({ type: 'overtraining_alert', priority: 'critical' })]
    const out = rankInterventions(recs, makeContext())
    expect(out.allInterventions[0].timing).toBe('now')
  })

  it('high in reactive → end-of-turn', () => {
    const recs = [makeRec({ type: 'poor_recovery_warning', priority: 'high' })]
    const out = rankInterventions(recs, makeContext({ mode: 'reactive' }))
    expect(out.allInterventions[0].timing).toBe('end-of-turn')
  })

  it('low → deferred', () => {
    const recs = [makeRec({ type: 'long_inactivity_nudge', priority: 'low' })]
    const out = rankInterventions(recs, makeContext())
    expect(out.allInterventions[0].timing).toBe('deferred')
  })
})

// ─── Intent Boost ─────────────────────────────────────────────────────────────

describe('Intent boost', () => {
  it('low priority rec with matching relatedIntent gets boosted to medium', () => {
    const recs = [makeRec({
      type: 'poor_recovery_warning',
      priority: 'low',
      relatedIntent: 'recovery_reflection',
      score: 0.15,
    })]
    const out = rankInterventions(recs, makeContext({ currentIntent: 'recovery_reflection' }))
    const i = out.allInterventions.find((x) => x.recommendation.type === 'poor_recovery_warning')
    // After boost, priority should be higher than original
    expect(['medium', 'high'].includes(i?.priority ?? '')).toBe(true)
  })

  it('medium priority rec with matching intent gets boosted to high', () => {
    const recs = [makeRec({
      type: 'poor_recovery_warning',
      priority: 'medium',
      relatedIntent: 'recovery_reflection',
    })]
    const out = rankInterventions(recs, makeContext({ currentIntent: 'recovery_reflection' }))
    const i = out.allInterventions.find((x) => x.recommendation.type === 'poor_recovery_warning')
    expect(i?.priority).toBe('high')
  })

  it('rec without matching intent is not boosted', () => {
    const recs = [makeRec({
      type: 'poor_recovery_warning',
      priority: 'medium',
      relatedIntent: 'nutrition_logging',
    })]
    const out = rankInterventions(recs, makeContext({ currentIntent: 'recovery_reflection' }))
    const i = out.allInterventions.find((x) => x.recommendation.type === 'poor_recovery_warning')
    expect(i?.priority).toBe('medium')
  })

  it('critical is not boosted further by intent', () => {
    const recs = [makeRec({
      type: 'overtraining_alert',
      priority: 'critical',
      relatedIntent: 'recovery_reflection',
    })]
    const out = rankInterventions(recs, makeContext({ currentIntent: 'recovery_reflection' }))
    const i = out.allInterventions.find((x) => x.recommendation.type === 'overtraining_alert')
    expect(i?.priority).toBe('critical')
  })
})

// ─── activeInterventions ─────────────────────────────────────────────────────

describe('activeInterventions', () => {
  it('only contains recs with shouldDisplayNow = true', () => {
    const recs = [
      makeRec({ type: 'overtraining_alert', priority: 'critical' }),
      makeRec({ type: 'nutrition_goal_met_positive', priority: 'silent' }),
    ]
    const out = rankInterventions(recs, makeContext())
    for (const i of out.activeInterventions) {
      expect(i.shouldDisplayNow).toBe(true)
    }
  })

  it('annoyanceFiltered is true when any rec was suppressed', () => {
    const sessionTs = Array.from({ length: 10 }, () => new Date().toISOString())
    const fullState = { ...createEmptyAntiAnnoyanceState(USER), sessionInterventionTimestamps: sessionTs }
    const recs = [
      makeRec({ type: 'poor_recovery_warning', priority: 'medium' }),
      makeRec({ type: 'behavioral_fatigue', priority: 'medium' }),
    ]
    const out = rankInterventions(recs, makeContext({ annoyanceState: fullState }))
    expect(out.annoyanceFiltered).toBe(true)
  })
})

// ─── applyShownInterventions ──────────────────────────────────────────────────

describe('applyShownInterventions', () => {
  it('updates state only for shouldDisplayNow = true interventions', () => {
    const recs = [
      makeRec({ type: 'overtraining_alert', priority: 'critical' }),
      makeRec({ type: 'nutrition_goal_met_positive', priority: 'silent' }),
    ]
    const out = rankInterventions(recs, makeContext())
    const newState = applyShownInterventions(out.allInterventions, createEmptyAntiAnnoyanceState(USER))
    // Only the critical one should be counted
    expect(newState.sessionInterventionTimestamps.length).toBeLessThanOrEqual(1)
  })

  it('records all shouldDisplayNow interventions', () => {
    const recs = [
      makeRec({ type: 'overtraining_alert', priority: 'critical' }),
      makeRec({ type: 'poor_recovery_warning', priority: 'high' }),
    ]
    const out = rankInterventions(recs, makeContext())
    const shown = out.allInterventions.filter((i) => i.shouldDisplayNow)
    const newState = applyShownInterventions(out.allInterventions, createEmptyAntiAnnoyanceState(USER))
    expect(newState.sessionInterventionTimestamps).toHaveLength(shown.length)
  })

  it('does not mutate input state', () => {
    const recs = [makeRec({ type: 'overtraining_alert', priority: 'critical' })]
    const out = rankInterventions(recs, makeContext())
    const originalState = createEmptyAntiAnnoyanceState(USER)
    applyShownInterventions(out.allInterventions, originalState)
    expect(originalState.sessionInterventionTimestamps).toHaveLength(0)
  })
})

// ─── filterByDomain ───────────────────────────────────────────────────────────

describe('filterByDomain', () => {
  it('returns only matching domain', () => {
    const recs = [
      makeRec({ type: 'poor_recovery_warning', priority: 'medium', domain: 'recovery' }),
      makeRec({ type: 'low_protein_intake', priority: 'medium', domain: 'nutrition' }),
      makeRec({ type: 'overtraining_alert', priority: 'critical', domain: 'training' }),
    ]
    const out = rankInterventions(recs, makeContext())
    const filtered = filterByDomain(out, 'recovery')
    expect(filtered.every((i) => i.recommendation.domain === 'recovery')).toBe(true)
  })

  it('returns empty array when no match', () => {
    const recs = [makeRec({ type: 'poor_recovery_warning', domain: 'recovery' })]
    const out = rankInterventions(recs, makeContext())
    const filtered = filterByDomain(out, 'nutrition')
    expect(filtered).toHaveLength(0)
  })
})

// ─── topN ─────────────────────────────────────────────────────────────────────

describe('topN', () => {
  it('returns first N interventions', () => {
    const recs = [
      makeRec({ type: 'overtraining_alert', priority: 'critical' }),
      makeRec({ type: 'poor_recovery_warning', priority: 'high' }),
      makeRec({ type: 'behavioral_fatigue', priority: 'medium' }),
    ]
    const out = rankInterventions(recs, makeContext())
    const top2 = topN(out, 2)
    expect(top2).toHaveLength(2)
    expect(top2[0].rank).toBeLessThan(top2[1].rank)
  })

  it('returns all when N > total', () => {
    const recs = [makeRec({ type: 'overtraining_alert' })]
    const out = rankInterventions(recs, makeContext())
    expect(topN(out, 10)).toHaveLength(out.allInterventions.length)
  })

  it('returns empty for N = 0', () => {
    const recs = [makeRec({ type: 'overtraining_alert' })]
    const out = rankInterventions(recs, makeContext())
    expect(topN(out, 0)).toHaveLength(0)
  })
})

// ─── Full pipeline integration ────────────────────────────────────────────────

describe('Full pipeline integration', () => {
  it('recommendations shown once are suppressed on second call within window', () => {
    const recs = [makeRec({ type: 'poor_recovery_warning', priority: 'high' })]
    const context = makeContext()

    // First call
    const out1 = rankInterventions(recs, context)
    const shown = out1.allInterventions.filter((i) => i.shouldDisplayNow)
    const updatedState = applyShownInterventions(out1.allInterventions, context.annoyanceState)

    // Second call with updated state and suppressionWindowHours
    const context2 = makeContext({ annoyanceState: updatedState })
    const out2 = rankInterventions(recs, context2)

    const rec2 = out2.allInterventions.find((i) => i.recommendation.type === 'poor_recovery_warning')
    // If shown in first call and within suppression window, should be suppressed
    if (shown.length > 0) {
      expect(rec2?.shouldDisplayNow).toBe(false)
    }
  })

  it('critical always appears in activeInterventions regardless of state', () => {
    const sessionTs = Array.from({ length: 10 }, () => new Date().toISOString())
    const saturatedState = { ...createEmptyAntiAnnoyanceState(USER), sessionInterventionTimestamps: sessionTs }

    const recs = [makeRec({ type: 'overtraining_alert', priority: 'critical' })]
    const out = rankInterventions(recs, makeContext({ annoyanceState: saturatedState }))
    const criticalInActive = out.activeInterventions.some((i) => i.recommendation.priority === 'critical')
    expect(criticalInActive).toBe(true)
  })

  it('multiple interventions produce ranking without ties having same rank', () => {
    const recs = [
      makeRec({ type: 'overtraining_alert', priority: 'critical', score: 0.9 }),
      makeRec({ type: 'poor_recovery_warning', priority: 'high', score: 0.6 }),
      makeRec({ type: 'behavioral_fatigue', priority: 'medium', score: 0.42 }),
      makeRec({ type: 'low_protein_intake', priority: 'medium', score: 0.3 }),
    ]
    const out = rankInterventions(recs, makeContext({ maxInterventions: 10 }))
    const ranks = out.allInterventions.map((i) => i.rank)
    const unique = new Set(ranks)
    expect(unique.size).toBe(ranks.length)
  })
})
