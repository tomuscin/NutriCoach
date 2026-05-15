/**
 * Tests: NCIC Continuity Engine
 *
 * Covers:
 *   - buildMemoryContinuityHints()
 *   - buildContinuityState()
 *   - createEmptyContinuityState()
 *   - detectInactivity()
 *   - All episode types → hint generation
 *   - Inactivity threshold
 *   - Unresolved topics propagation
 *   - Last active domains
 *   - Deduplication
 */

import { describe, it, expect } from 'vitest'
import {
  buildMemoryContinuityHints,
  buildContinuityState,
  createEmptyContinuityState,
  detectInactivity,
} from '../continuity'
import { createShortTermMemory, appendTurn } from '../short-term-memory'
import type { EpisodicEvent, ContinuityState, ShortTermMemory } from '../types'
import type { ConversationTurn } from '../types'

// ─── Factories ────────────────────────────────────────────────────────────────

const DATE = '2026-05-14'
const USER = 'u-continuity-test'

function makeEpisode(type: EpisodicEvent['type'], daysAgo = 0): EpisodicEvent {
  return {
    eventId: `ep-${Math.random().toString(36).slice(2)}`,
    userId: USER,
    type,
    summary: `test ${type}`,
    date: DATE,
    recordedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    severity: 'info',
    metadata: {},
  }
}

function makeEmptyContinuity(): ContinuityState {
  return createEmptyContinuityState(USER)
}

function makeContinuity(lastInteractionAt: string | null, inactivityDays: number | null, domains: string[] = []): ContinuityState {
  return {
    userId: USER,
    lastInteractionAt,
    totalInteractions: 5,
    lastActiveDomains: domains,
    recentConversationSummaries: [],
    inactivityDays,
  }
}

function makeShortTermWithTopics(topics: string[]): ShortTermMemory {
  const m = createShortTermMemory(USER)
  return { ...m, unresolvedTopics: topics }
}

function makeTurn(intentName: string, domains: string[] = []): ConversationTurn {
  return {
    turnId: `t-${Math.random()}`,
    timestamp: new Date().toISOString(),
    message: 'test',
    intentName: intentName as ConversationTurn['intentName'],
    responseMode: 'coaching',
    riskFlags: [],
    continuityHints: [],
    domains,
  }
}

// ─── detectInactivity ────────────────────────────────────────────────────────

describe('detectInactivity', () => {
  it('returns null for null lastInteractionAt', () => {
    expect(detectInactivity(null)).toBeNull()
  })

  it('returns 0 for interaction within the same day', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    expect(detectInactivity(oneHourAgo)).toBe(0)
  })

  it('returns correct day count for 3-day gap', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(detectInactivity(threeDaysAgo)).toBe(3)
  })

  it('returns correct day count for 7-day gap', () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    expect(detectInactivity(sevenDaysAgo)).toBe(7)
  })

  it('returns non-negative value', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const days = detectInactivity(yesterday)
    expect(days).not.toBeNull()
    expect(days!).toBeGreaterThanOrEqual(0)
  })
})

// ─── createEmptyContinuityState ───────────────────────────────────────────────

describe('createEmptyContinuityState', () => {
  it('creates with correct userId', () => {
    const state = createEmptyContinuityState('test-user')
    expect(state.userId).toBe('test-user')
  })

  it('lastInteractionAt is null', () => {
    expect(createEmptyContinuityState('u').lastInteractionAt).toBeNull()
  })

  it('totalInteractions is 0', () => {
    expect(createEmptyContinuityState('u').totalInteractions).toBe(0)
  })

  it('lastActiveDomains is empty', () => {
    expect(createEmptyContinuityState('u').lastActiveDomains).toHaveLength(0)
  })

  it('inactivityDays is null', () => {
    expect(createEmptyContinuityState('u').inactivityDays).toBeNull()
  })
})

// ─── buildContinuityState ─────────────────────────────────────────────────────

describe('buildContinuityState', () => {
  it('builds with provided values', () => {
    const state = buildContinuityState('u', null, ['nutrition'], 10, ['summary'])
    expect(state.userId).toBe('u')
    expect(state.lastInteractionAt).toBeNull()
    expect(state.lastActiveDomains).toContain('nutrition')
    expect(state.totalInteractions).toBe(10)
  })

  it('computes inactivityDays from lastInteractionAt', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const state = buildContinuityState('u', threeDaysAgo, [], 1, [])
    expect(state.inactivityDays).toBe(3)
  })

  it('inactivityDays is null when lastInteractionAt is null', () => {
    const state = buildContinuityState('u', null, [], 0, [])
    expect(state.inactivityDays).toBeNull()
  })
})

// ─── buildMemoryContinuityHints — inactivity ──────────────────────────────────

describe('buildMemoryContinuityHints — inactivity', () => {
  it('returns empty hints for new user with no episodes', () => {
    const hints = buildMemoryContinuityHints(null, [], makeEmptyContinuity())
    expect(hints).toHaveLength(0)
  })

  it('adds inactivity hint when inactivityDays >= 2', () => {
    const state = makeContinuity(null, 3)
    const hints = buildMemoryContinuityHints(null, [], state)
    expect(hints.some((h) => h.includes('inactivity'))).toBe(true)
  })

  it('does NOT add inactivity hint when inactivityDays = 1', () => {
    const state = makeContinuity(null, 1)
    const hints = buildMemoryContinuityHints(null, [], state)
    expect(hints.some((h) => h.includes('inactivity'))).toBe(false)
  })

  it('does NOT add inactivity hint when inactivityDays = 0', () => {
    const state = makeContinuity(null, 0)
    const hints = buildMemoryContinuityHints(null, [], state)
    expect(hints.some((h) => h.includes('inactivity'))).toBe(false)
  })

  it('inactivity hint contains the day count', () => {
    const state = makeContinuity(null, 5)
    const hints = buildMemoryContinuityHints(null, [], state)
    const hint = hints.find((h) => h.includes('inactivity'))
    expect(hint).toContain('5')
  })

  it('uses plural "days" for count > 1', () => {
    const state = makeContinuity(null, 4)
    const hint = buildMemoryContinuityHints(null, [], state).find((h) => h.includes('inactivity'))
    expect(hint).toContain('days')
  })
})

// ─── buildMemoryContinuityHints — episode hints ───────────────────────────────

describe('buildMemoryContinuityHints — episode-based hints', () => {
  it('adds low_recovery hint for low_recovery episode', () => {
    const hints = buildMemoryContinuityHints(null, [makeEpisode('low_recovery')], makeEmptyContinuity())
    expect(hints).toContain('recovery worsening recently')
  })

  it('adds overtraining hint for overtraining_detected episode', () => {
    const hints = buildMemoryContinuityHints(null, [makeEpisode('overtraining_detected')], makeEmptyContinuity())
    expect(hints).toContain('overtraining risk flagged recently')
  })

  it('adds high training load hint', () => {
    const hints = buildMemoryContinuityHints(null, [makeEpisode('high_training_load')], makeEmptyContinuity())
    expect(hints).toContain('high training load detected recently')
  })

  it('adds PR hint for pr_achieved', () => {
    const hints = buildMemoryContinuityHints(null, [makeEpisode('pr_achieved')], makeEmptyContinuity())
    expect(hints).toContain('recent personal record session')
  })

  it('adds missed nutrition hint', () => {
    const hints = buildMemoryContinuityHints(null, [makeEpisode('missed_nutrition')], makeEmptyContinuity())
    expect(hints).toContain('nutrition goals missed recently')
  })

  it('adds calorie deficit streak hint', () => {
    const hints = buildMemoryContinuityHints(null, [makeEpisode('calorie_deficit_streak')], makeEmptyContinuity())
    expect(hints).toContain('calorie deficit streak ongoing')
  })

  it('adds nutrition consistency hint', () => {
    const hints = buildMemoryContinuityHints(null, [makeEpisode('nutrition_streak')], makeEmptyContinuity())
    expect(hints).toContain('nutrition consistency high')
  })

  it('adds training streak hint', () => {
    const hints = buildMemoryContinuityHints(null, [makeEpisode('training_streak')], makeEmptyContinuity())
    expect(hints).toContain('training streak active')
  })

  it('adds behavioral drop hint', () => {
    const hints = buildMemoryContinuityHints(null, [makeEpisode('behavioral_drop')], makeEmptyContinuity())
    expect(hints).toContain('energy or mood dropped recently')
  })

  it('adds behavioral recovery hint', () => {
    const hints = buildMemoryContinuityHints(null, [makeEpisode('behavioral_recovery')], makeEmptyContinuity())
    expect(hints).toContain('energy and mood recovering')
  })

  it('does not duplicate same episode type hints', () => {
    const episodes = [makeEpisode('low_recovery'), makeEpisode('low_recovery')]
    const hints = buildMemoryContinuityHints(null, episodes, makeEmptyContinuity())
    expect(hints.filter((h) => h === 'recovery worsening recently')).toHaveLength(1)
  })
})

// ─── buildMemoryContinuityHints — unresolved topics ──────────────────────────

describe('buildMemoryContinuityHints — unresolved topics', () => {
  it('adds unresolved topic hints from short-term memory', () => {
    const stm = makeShortTermWithTopics(['recovery check pending'])
    const hints = buildMemoryContinuityHints(stm, [], makeEmptyContinuity())
    expect(hints).toContain('unresolved topic: recovery check pending')
  })

  it('adds multiple unresolved topic hints', () => {
    const stm = makeShortTermWithTopics(['recovery check pending', 'user intent unclear'])
    const hints = buildMemoryContinuityHints(stm, [], makeEmptyContinuity())
    expect(hints).toContain('unresolved topic: recovery check pending')
    expect(hints).toContain('unresolved topic: user intent unclear')
  })

  it('does not add unresolved topic hints when topics is empty', () => {
    const stm = makeShortTermWithTopics([])
    const hints = buildMemoryContinuityHints(stm, [], makeEmptyContinuity())
    expect(hints.some((h) => h.startsWith('unresolved topic'))).toBe(false)
  })

  it('handles null shortTerm gracefully', () => {
    const hints = buildMemoryContinuityHints(null, [], makeEmptyContinuity())
    expect(hints.some((h) => h.startsWith('unresolved topic'))).toBe(false)
  })
})

// ─── buildMemoryContinuityHints — last active domains ─────────────────────────

describe('buildMemoryContinuityHints — last active domains', () => {
  it('adds previously active domains hint when inactive for 1+ days', () => {
    const state = makeContinuity(null, 1, ['nutrition', 'training'])
    const hints = buildMemoryContinuityHints(null, [], state)
    expect(hints.some((h) => h.includes('previously active in'))).toBe(true)
  })

  it('does NOT add previously active domains hint when inactivityDays is 0', () => {
    const state = makeContinuity(null, 0, ['nutrition'])
    const hints = buildMemoryContinuityHints(null, [], state)
    expect(hints.some((h) => h.includes('previously active in'))).toBe(false)
  })

  it('does NOT add previously active domains hint when no domains', () => {
    const state = makeContinuity(null, 3, [])
    const hints = buildMemoryContinuityHints(null, [], state)
    expect(hints.some((h) => h.includes('previously active in'))).toBe(false)
  })
})

// ─── buildMemoryContinuityHints — deduplication ───────────────────────────────

describe('buildMemoryContinuityHints — deduplication', () => {
  it('returns deduplicated hints', () => {
    const episodes = [makeEpisode('low_recovery'), makeEpisode('low_recovery')]
    const hints = buildMemoryContinuityHints(null, episodes, makeEmptyContinuity())
    const unique = new Set(hints)
    expect(hints.length).toBe(unique.size)
  })

  it('handles combined episodes + topics without duplicates', () => {
    const stm = makeShortTermWithTopics(['recovery check pending'])
    const episodes = [makeEpisode('low_recovery')]
    const hints = buildMemoryContinuityHints(stm, episodes, makeEmptyContinuity())
    const unique = new Set(hints)
    expect(hints.length).toBe(unique.size)
  })
})
