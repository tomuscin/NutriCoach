/**
 * Tests: Anti-Annoyance System
 *
 * Covers:
 *   - isInSuppressionWindow()
 *   - isRepeatedlySuppressed()
 *   - computeFatigue()
 *   - sessionLimitReached()
 *   - priorityTooLow()
 *   - evaluateSuppression()
 *   - recordShown()
 *   - resetSession()
 *   - pruneStaleTimestamps()
 *   - AntiAnnoyanceStore class
 *   - Critical priority bypass behavior
 *   - Fatigue threshold computation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createEmptyAntiAnnoyanceState,
  isInSuppressionWindow,
  isRepeatedlySuppressed,
  computeFatigue,
  sessionLimitReached,
  priorityTooLow,
  evaluateSuppression,
  recordShown,
  resetSession,
  pruneStaleTimestamps,
  AntiAnnoyanceStore,
  createAntiAnnoyanceStore,
  DEFAULT_ANTI_ANNOYANCE_POLICIES,
  type AntiAnnoyanceState,
  type AntiAnnoyancePolicies,
} from '../anti-annoyance'
import type { CanonicalRecommendation, RecommendationTypeName } from '../../recommendations/types'

// ─── Factories ────────────────────────────────────────────────────────────────

const USER = 'u-annoyance-test'

function makeState(overrides?: Partial<AntiAnnoyanceState>): AntiAnnoyanceState {
  return { ...createEmptyAntiAnnoyanceState(USER), ...overrides }
}

function makePolicies(overrides?: Partial<AntiAnnoyancePolicies>): AntiAnnoyancePolicies {
  return { ...DEFAULT_ANTI_ANNOYANCE_POLICIES, ...overrides }
}

function makeRec(overrides?: Partial<CanonicalRecommendation>): CanonicalRecommendation {
  return {
    id: `rec-${Math.random()}`,
    type: 'poor_recovery_warning',
    priority: 'medium',
    domain: 'recovery',
    title: 'Test',
    explanation: 'Test explanation',
    suggestedAction: 'Test action',
    confidence: 0.8,
    urgency: 0.7,
    impact: 0.75,
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    sourceSignals: ['recovery.status'],
    relatedIntent: 'recovery_reflection',
    relatedMemory: [],
    score: 0.42,
    ...overrides,
  }
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString()
}

// ─── createEmptyAntiAnnoyanceState ────────────────────────────────────────────

describe('createEmptyAntiAnnoyanceState', () => {
  it('creates with correct userId', () => {
    const state = createEmptyAntiAnnoyanceState('test-user')
    expect(state.userId).toBe('test-user')
  })

  it('has empty lastShownAt', () => {
    expect(Object.keys(createEmptyAntiAnnoyanceState('u').lastShownAt)).toHaveLength(0)
  })

  it('has empty showCount', () => {
    expect(Object.keys(createEmptyAntiAnnoyanceState('u').showCount)).toHaveLength(0)
  })

  it('inFatigue is false', () => {
    expect(createEmptyAntiAnnoyanceState('u').inFatigue).toBe(false)
  })

  it('has empty session timestamps', () => {
    expect(createEmptyAntiAnnoyanceState('u').sessionInterventionTimestamps).toHaveLength(0)
  })
})

// ─── isInSuppressionWindow ────────────────────────────────────────────────────

describe('isInSuppressionWindow', () => {
  it('returns false for empty state', () => {
    const state = makeState()
    expect(isInSuppressionWindow('poor_recovery_warning', 'medium', state)).toBe(false)
  })

  it('returns true when shown within suppression window', () => {
    const state = makeState({ lastShownAt: { poor_recovery_warning: hoursAgo(2) } })
    expect(isInSuppressionWindow('poor_recovery_warning', 'medium', state, makePolicies({ suppressionWindowHours: 6 }))).toBe(true)
  })

  it('returns false when shown outside suppression window', () => {
    const state = makeState({ lastShownAt: { poor_recovery_warning: hoursAgo(8) } })
    expect(isInSuppressionWindow('poor_recovery_warning', 'medium', state, makePolicies({ suppressionWindowHours: 6 }))).toBe(false)
  })

  it('critical priority always bypasses suppression window', () => {
    const state = makeState({ lastShownAt: { overtraining_alert: hoursAgo(1) } })
    expect(isInSuppressionWindow('overtraining_alert', 'critical', state)).toBe(false)
  })
})

// ─── isRepeatedlySuppressed ───────────────────────────────────────────────────

describe('isRepeatedlySuppressed', () => {
  it('returns false when showCount is below threshold', () => {
    const state = makeState({ showCount: { poor_recovery_warning: 2 } })
    expect(isRepeatedlySuppressed('poor_recovery_warning', 'medium', state, makePolicies({ maxRepeatsBeforeSuppression: 3 }))).toBe(false)
  })

  it('returns true when showCount reaches threshold', () => {
    const state = makeState({ showCount: { poor_recovery_warning: 3 } })
    expect(isRepeatedlySuppressed('poor_recovery_warning', 'medium', state, makePolicies({ maxRepeatsBeforeSuppression: 3 }))).toBe(true)
  })

  it('critical priority bypasses repeat suppression', () => {
    const state = makeState({ showCount: { overtraining_alert: 10 } })
    expect(isRepeatedlySuppressed('overtraining_alert', 'critical', state)).toBe(false)
  })

  it('high priority bypasses repeat suppression', () => {
    const state = makeState({ showCount: { poor_recovery_warning: 10 } })
    expect(isRepeatedlySuppressed('poor_recovery_warning', 'high', state)).toBe(false)
  })

  it('returns false for unseen type', () => {
    const state = makeState()
    expect(isRepeatedlySuppressed('poor_recovery_warning', 'medium', state)).toBe(false)
  })
})

// ─── computeFatigue ───────────────────────────────────────────────────────────

describe('computeFatigue', () => {
  it('returns false for empty state', () => {
    expect(computeFatigue(makeState())).toBe(false)
  })

  it('returns false when under threshold', () => {
    const ts = [hoursAgo(1), hoursAgo(2), hoursAgo(3), hoursAgo(4)]
    const state = makeState({ recentInterventionTimestamps: ts })
    expect(computeFatigue(state, makePolicies({ fatigueThreshold: 5, fatigueWindowHours: 24 }))).toBe(false)
  })

  it('returns true when at threshold', () => {
    const ts = [hoursAgo(1), hoursAgo(2), hoursAgo(3), hoursAgo(4), hoursAgo(5)]
    const state = makeState({ recentInterventionTimestamps: ts })
    expect(computeFatigue(state, makePolicies({ fatigueThreshold: 5, fatigueWindowHours: 24 }))).toBe(true)
  })

  it('ignores timestamps outside the fatigue window', () => {
    const old = hoursAgo(30)
    const fresh = hoursAgo(1)
    const state = makeState({ recentInterventionTimestamps: [old, old, old, old, fresh] })
    expect(computeFatigue(state, makePolicies({ fatigueThreshold: 5, fatigueWindowHours: 24 }))).toBe(false)
  })
})

// ─── sessionLimitReached ─────────────────────────────────────────────────────

describe('sessionLimitReached', () => {
  it('returns false for empty session', () => {
    expect(sessionLimitReached(makeState())).toBe(false)
  })

  it('returns false when below limit', () => {
    const state = makeState({ sessionInterventionTimestamps: [hoursAgo(1), hoursAgo(2)] })
    expect(sessionLimitReached(state, makePolicies({ maxPerSession: 3 }))).toBe(false)
  })

  it('returns true when at session limit', () => {
    const state = makeState({ sessionInterventionTimestamps: [hoursAgo(1), hoursAgo(2), hoursAgo(3)] })
    expect(sessionLimitReached(state, makePolicies({ maxPerSession: 3 }))).toBe(true)
  })
})

// ─── priorityTooLow ───────────────────────────────────────────────────────────

describe('priorityTooLow', () => {
  it('silent is too low for reactive mode', () => {
    expect(priorityTooLow('silent', 'reactive', makeState(), makePolicies({ minPriorityReactive: 'low' }))).toBe(true)
  })

  it('low meets threshold in reactive mode (minPriorityReactive=low)', () => {
    expect(priorityTooLow('low', 'reactive', makeState(), makePolicies({ minPriorityReactive: 'low' }))).toBe(false)
  })

  it('low is too low in proactive mode (minPriorityProactive=medium)', () => {
    expect(priorityTooLow('low', 'proactive', makeState(), makePolicies({ minPriorityProactive: 'medium' }))).toBe(true)
  })

  it('medium meets threshold in proactive mode', () => {
    expect(priorityTooLow('medium', 'proactive', makeState(), makePolicies({ minPriorityProactive: 'medium' }))).toBe(false)
  })

  it('in fatigue: only high and critical pass through', () => {
    // Create a fatigued state
    const ts = Array.from({ length: 5 }, (_, i) => hoursAgo(i + 1))
    const state = makeState({ recentInterventionTimestamps: ts })
    const policies = makePolicies({ fatigueThreshold: 5, fatigueWindowHours: 24 })
    expect(priorityTooLow('medium', 'reactive', state, policies)).toBe(true)
    expect(priorityTooLow('high', 'reactive', state, policies)).toBe(false)
    expect(priorityTooLow('critical', 'reactive', state, policies)).toBe(false)
  })
})

// ─── evaluateSuppression ─────────────────────────────────────────────────────

describe('evaluateSuppression', () => {
  it('does not suppress a fresh medium recommendation in reactive mode', () => {
    const rec = makeRec({ type: 'poor_recovery_warning', priority: 'medium' })
    const result = evaluateSuppression(rec, 'reactive', makeState())
    expect(result.suppressed).toBe(false)
    expect(result.reason).toBeNull()
  })

  it('suppresses when in suppression window', () => {
    const state = makeState({ lastShownAt: { poor_recovery_warning: hoursAgo(2) } })
    const rec = makeRec({ type: 'poor_recovery_warning', priority: 'medium' })
    const result = evaluateSuppression(rec, 'reactive', state, makePolicies({ suppressionWindowHours: 6 }))
    expect(result.suppressed).toBe(true)
    expect(result.reason).toBe('suppression-window')
  })

  it('suppresses when session limit reached', () => {
    const state = makeState({ sessionInterventionTimestamps: [hoursAgo(1), hoursAgo(2), hoursAgo(3)] })
    const rec = makeRec({ type: 'poor_recovery_warning', priority: 'medium' })
    const result = evaluateSuppression(rec, 'reactive', state, makePolicies({ maxPerSession: 3 }))
    expect(result.suppressed).toBe(true)
    expect(result.reason).toBe('session-limit')
  })

  it('critical bypasses session limit', () => {
    const state = makeState({ sessionInterventionTimestamps: [hoursAgo(1), hoursAgo(2), hoursAgo(3)] })
    const rec = makeRec({ type: 'overtraining_alert', priority: 'critical' })
    const result = evaluateSuppression(rec, 'reactive', state, makePolicies({ maxPerSession: 3 }))
    expect(result.suppressed).toBe(false)
  })

  it('suppresses when repeated too many times', () => {
    const state = makeState({ showCount: { poor_recovery_warning: 3 } })
    const rec = makeRec({ type: 'poor_recovery_warning', priority: 'medium' })
    const result = evaluateSuppression(rec, 'reactive', state, makePolicies({ maxRepeatsBeforeSuppression: 3 }))
    expect(result.suppressed).toBe(true)
    expect(result.reason).toBe('repeat-suppression')
  })

  it('suppresses silent in proactive mode', () => {
    const rec = makeRec({ priority: 'silent' })
    const result = evaluateSuppression(rec, 'proactive', makeState(), makePolicies({ minPriorityProactive: 'medium' }))
    expect(result.suppressed).toBe(true)
    expect(result.reason).toBe('priority-too-low')
  })
})

// ─── recordShown ─────────────────────────────────────────────────────────────

describe('recordShown', () => {
  it('updates lastShownAt for the type', () => {
    const ts = new Date().toISOString()
    const state = recordShown('poor_recovery_warning', makeState(), ts)
    expect(state.lastShownAt['poor_recovery_warning']).toBe(ts)
  })

  it('increments showCount', () => {
    const state1 = recordShown('poor_recovery_warning', makeState())
    const state2 = recordShown('poor_recovery_warning', state1)
    expect(state2.showCount['poor_recovery_warning']).toBe(2)
  })

  it('adds to sessionInterventionTimestamps', () => {
    const state = recordShown('poor_recovery_warning', makeState())
    expect(state.sessionInterventionTimestamps).toHaveLength(1)
  })

  it('adds to recentInterventionTimestamps', () => {
    const state = recordShown('poor_recovery_warning', makeState())
    expect(state.recentInterventionTimestamps).toHaveLength(1)
  })

  it('does not mutate original state', () => {
    const original = makeState()
    recordShown('poor_recovery_warning', original)
    expect(original.showCount['poor_recovery_warning']).toBeUndefined()
  })
})

// ─── resetSession ─────────────────────────────────────────────────────────────

describe('resetSession', () => {
  it('clears sessionInterventionTimestamps', () => {
    const state = makeState({ sessionInterventionTimestamps: [hoursAgo(1), hoursAgo(2)] })
    const reset = resetSession(state)
    expect(reset.sessionInterventionTimestamps).toHaveLength(0)
  })

  it('does not clear recentInterventionTimestamps', () => {
    const ts = [hoursAgo(1), hoursAgo(2)]
    const state = makeState({ recentInterventionTimestamps: ts, sessionInterventionTimestamps: ts })
    const reset = resetSession(state)
    expect(reset.recentInterventionTimestamps).toHaveLength(2)
  })

  it('does not mutate original state', () => {
    const original = makeState({ sessionInterventionTimestamps: [hoursAgo(1)] })
    resetSession(original)
    expect(original.sessionInterventionTimestamps).toHaveLength(1)
  })
})

// ─── pruneStaleTimestamps ─────────────────────────────────────────────────────

describe('pruneStaleTimestamps', () => {
  it('removes timestamps older than fatigueWindowHours', () => {
    const oldTs = hoursAgo(30)
    const freshTs = hoursAgo(1)
    const state = makeState({ recentInterventionTimestamps: [oldTs, freshTs] })
    const pruned = pruneStaleTimestamps(state, makePolicies({ fatigueWindowHours: 24 }))
    expect(pruned.recentInterventionTimestamps).toHaveLength(1)
    expect(pruned.recentInterventionTimestamps[0]).toBe(freshTs)
  })

  it('keeps all fresh timestamps', () => {
    const ts = [hoursAgo(1), hoursAgo(2), hoursAgo(3)]
    const state = makeState({ recentInterventionTimestamps: ts })
    const pruned = pruneStaleTimestamps(state, makePolicies({ fatigueWindowHours: 24 }))
    expect(pruned.recentInterventionTimestamps).toHaveLength(3)
  })
})

// ─── AntiAnnoyanceStore ───────────────────────────────────────────────────────

describe('AntiAnnoyanceStore', () => {
  let store: AntiAnnoyanceStore

  beforeEach(() => {
    store = createAntiAnnoyanceStore()
  })

  it('returns empty state for unknown user', () => {
    const state = store.getState('new-user')
    expect(state.userId).toBe('new-user')
    expect(state.sessionInterventionTimestamps).toHaveLength(0)
  })

  it('recordShown updates state', () => {
    store.recordShown(USER, 'poor_recovery_warning')
    expect(store.getState(USER).showCount['poor_recovery_warning']).toBe(1)
  })

  it('recordShown accumulates count', () => {
    store.recordShown(USER, 'poor_recovery_warning')
    store.recordShown(USER, 'poor_recovery_warning')
    expect(store.getState(USER).showCount['poor_recovery_warning']).toBe(2)
  })

  it('different types tracked independently', () => {
    store.recordShown(USER, 'poor_recovery_warning')
    store.recordShown(USER, 'overtraining_alert')
    expect(store.getState(USER).showCount['poor_recovery_warning']).toBe(1)
    expect(store.getState(USER).showCount['overtraining_alert']).toBe(1)
  })

  it('resetSession clears session timestamps', () => {
    store.recordShown(USER, 'poor_recovery_warning')
    store.resetSession(USER)
    expect(store.getState(USER).sessionInterventionTimestamps).toHaveLength(0)
  })

  it('different users have isolated state', () => {
    store.recordShown(USER, 'poor_recovery_warning')
    store.recordShown('other-user', 'overtraining_alert')
    expect(store.getState(USER).showCount['overtraining_alert']).toBeUndefined()
    expect(store.getState('other-user').showCount['poor_recovery_warning']).toBeUndefined()
  })

  it('clearUser removes user state', () => {
    store.recordShown(USER, 'poor_recovery_warning')
    store.clearUser(USER)
    expect(store.getState(USER).showCount['poor_recovery_warning']).toBeUndefined()
  })

  it('clearAll removes all users', () => {
    store.recordShown(USER, 'poor_recovery_warning')
    store.recordShown('other-user', 'overtraining_alert')
    store.clearAll()
    expect(Object.keys(store.getState(USER).showCount)).toHaveLength(0)
    expect(Object.keys(store.getState('other-user').showCount)).toHaveLength(0)
  })
})
