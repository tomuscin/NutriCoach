/**
 * Tests: NCIC Short-Term Memory
 *
 * Covers:
 *   - createShortTermMemory()
 *   - appendTurn()
 *   - getRecentTurns()
 *   - deriveUnresolvedTopics()
 *   - pruneOldTurns()
 *   - deriveActiveDomains()
 *   - buildTurn()
 *   - edge cases (empty, single turn, max overflow)
 */

import { describe, it, expect } from 'vitest'
import {
  createShortTermMemory,
  appendTurn,
  getRecentTurns,
  deriveUnresolvedTopics,
  pruneOldTurns,
  deriveActiveDomains,
  buildTurn,
} from '../short-term-memory'
import type { ConversationTurn, ShortTermMemory, MemoryPolicies } from '../types'
import { DEFAULT_MEMORY_POLICIES } from '../types'

// ─── Factories ────────────────────────────────────────────────────────────────

function makeTurn(
  intentName: string,
  domains: string[] = [],
  riskFlags: string[] = [],
  message = 'test',
): ConversationTurn {
  return {
    turnId: `turn-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    message,
    intentName: intentName as ConversationTurn['intentName'],
    responseMode: 'coaching',
    riskFlags,
    continuityHints: [],
    domains,
  }
}

function makeMemory(turns: ConversationTurn[] = []): ShortTermMemory {
  const base = createShortTermMemory('u1', 'conv-1')
  return { ...base, turns, activeDomains: [], unresolvedTopics: [] }
}

const TEST_POLICIES: MemoryPolicies = { ...DEFAULT_MEMORY_POLICIES, maxShortTermTurns: 5 }

// ─── createShortTermMemory ────────────────────────────────────────────────────

describe('createShortTermMemory', () => {
  it('creates an empty memory with correct userId', () => {
    const m = createShortTermMemory('user-1')
    expect(m.userId).toBe('user-1')
  })

  it('creates with empty turns array', () => {
    const m = createShortTermMemory('u')
    expect(m.turns).toHaveLength(0)
  })

  it('activeIntent is null on creation', () => {
    const m = createShortTermMemory('u')
    expect(m.activeIntent).toBeNull()
  })

  it('activeDomains is empty on creation', () => {
    const m = createShortTermMemory('u')
    expect(m.activeDomains).toHaveLength(0)
  })

  it('unresolvedTopics is empty on creation', () => {
    const m = createShortTermMemory('u')
    expect(m.unresolvedTopics).toHaveLength(0)
  })

  it('uses provided conversationId', () => {
    const m = createShortTermMemory('u', 'my-conv-id')
    expect(m.conversationId).toBe('my-conv-id')
  })

  it('generates a conversationId when not provided', () => {
    const m = createShortTermMemory('u')
    expect(typeof m.conversationId).toBe('string')
    expect(m.conversationId.length).toBeGreaterThan(0)
  })

  it('startedAt is a valid ISO string', () => {
    const m = createShortTermMemory('u')
    expect(() => new Date(m.startedAt)).not.toThrow()
    expect(new Date(m.startedAt).getTime()).not.toBeNaN()
  })
})

// ─── appendTurn ───────────────────────────────────────────────────────────────

describe('appendTurn', () => {
  it('appends a turn to empty memory', () => {
    const m = createShortTermMemory('u')
    const turn = makeTurn('food_log', ['nutrition'])
    const updated = appendTurn(m, turn)
    expect(updated.turns).toHaveLength(1)
    expect(updated.turns[0].intentName).toBe('food_log')
  })

  it('does not mutate the original memory', () => {
    const m = createShortTermMemory('u')
    const original = m.turns.length
    appendTurn(m, makeTurn('food_log'))
    expect(m.turns.length).toBe(original)
  })

  it('updates activeIntent to the latest turn intent', () => {
    const m = createShortTermMemory('u')
    const updated = appendTurn(m, makeTurn('training_reference'))
    expect(updated.activeIntent).toBe('training_reference')
  })

  it('updates lastUpdatedAt to the turn timestamp', () => {
    const m = { ...createShortTermMemory('u'), lastUpdatedAt: '2026-01-01T00:00:00.000Z' }
    const turn = { ...makeTurn('food_log'), timestamp: '2026-05-14T10:00:00.000Z' }
    const updated = appendTurn(m, turn)
    expect(updated.lastUpdatedAt).not.toBe('2026-01-01T00:00:00.000Z')
  })

  it('accumulates turns in order', () => {
    let m = createShortTermMemory('u')
    m = appendTurn(m, makeTurn('food_log'))
    m = appendTurn(m, makeTurn('training_reference'))
    m = appendTurn(m, makeTurn('recovery_reflection'))
    expect(m.turns).toHaveLength(3)
    expect(m.turns[0].intentName).toBe('food_log')
    expect(m.turns[2].intentName).toBe('recovery_reflection')
  })

  it('prunes oldest turns when maxShortTermTurns exceeded', () => {
    let m = createShortTermMemory('u')
    for (let i = 0; i < 7; i++) {
      m = appendTurn(m, makeTurn('food_log'), TEST_POLICIES)
    }
    expect(m.turns.length).toBeLessThanOrEqual(TEST_POLICIES.maxShortTermTurns)
  })

  it('derives activeDomains from all turns after append', () => {
    let m = createShortTermMemory('u')
    m = appendTurn(m, makeTurn('food_log', ['nutrition']))
    m = appendTurn(m, makeTurn('training_reference', ['training']))
    expect(m.activeDomains).toContain('nutrition')
    expect(m.activeDomains).toContain('training')
  })

  it('detects unresolved topic for recovery_reflection without resolution', () => {
    let m = createShortTermMemory('u')
    m = appendTurn(m, makeTurn('recovery_reflection'))
    expect(m.unresolvedTopics).toContain('recovery check pending')
  })

  it('clears unresolved topic when resolution intent follows', () => {
    let m = createShortTermMemory('u')
    m = appendTurn(m, makeTurn('recovery_reflection'))
    m = appendTurn(m, makeTurn('food_log'))
    expect(m.unresolvedTopics).not.toContain('recovery check pending')
  })
})

// ─── getRecentTurns ───────────────────────────────────────────────────────────

describe('getRecentTurns', () => {
  it('returns empty array for empty memory', () => {
    const m = createShortTermMemory('u')
    expect(getRecentTurns(m, 5)).toHaveLength(0)
  })

  it('returns last N turns', () => {
    const m = makeMemory([
      makeTurn('food_log'),
      makeTurn('training_reference'),
      makeTurn('casual_conversation'),
    ])
    const recent = getRecentTurns(m, 2)
    expect(recent).toHaveLength(2)
    expect(recent[0].intentName).toBe('training_reference')
    expect(recent[1].intentName).toBe('casual_conversation')
  })

  it('returns all turns if count > length', () => {
    const m = makeMemory([makeTurn('food_log'), makeTurn('training_reference')])
    expect(getRecentTurns(m, 10)).toHaveLength(2)
  })

  it('returns empty for count = 0', () => {
    const m = makeMemory([makeTurn('food_log')])
    expect(getRecentTurns(m, 0)).toHaveLength(0)
  })

  it('returns empty for count < 0', () => {
    const m = makeMemory([makeTurn('food_log')])
    expect(getRecentTurns(m, -1)).toHaveLength(0)
  })

  it('preserves order (oldest to newest)', () => {
    const turns = [
      makeTurn('food_log'),
      makeTurn('training_reference'),
      makeTurn('recovery_reflection'),
    ]
    const m = makeMemory(turns)
    const recent = getRecentTurns(m, 3)
    expect(recent[0].intentName).toBe('food_log')
    expect(recent[2].intentName).toBe('recovery_reflection')
  })
})

// ─── deriveUnresolvedTopics ───────────────────────────────────────────────────

describe('deriveUnresolvedTopics', () => {
  it('returns empty for empty memory', () => {
    const m = createShortTermMemory('u')
    expect(deriveUnresolvedTopics(m)).toHaveLength(0)
  })

  it('detects recovery_reflection as unresolved', () => {
    const m = makeMemory([makeTurn('recovery_reflection')])
    expect(deriveUnresolvedTopics(m)).toContain('recovery check pending')
  })

  it('detects behavioral_reflection as unresolved', () => {
    const m = makeMemory([makeTurn('behavioral_reflection')])
    expect(deriveUnresolvedTopics(m)).toContain('behavioral reflection open')
  })

  it('detects unknown intent as unresolved', () => {
    const m = makeMemory([makeTurn('unknown')])
    expect(deriveUnresolvedTopics(m)).toContain('user intent unclear')
  })

  it('returns empty when resolution intent is last', () => {
    const m = makeMemory([makeTurn('recovery_reflection'), makeTurn('food_log')])
    expect(deriveUnresolvedTopics(m)).toHaveLength(0)
  })

  it('returns empty when coach_question resolves', () => {
    const m = makeMemory([makeTurn('unknown'), makeTurn('coach_question')])
    expect(deriveUnresolvedTopics(m)).toHaveLength(0)
  })

  it('deduplicates same topic type', () => {
    const m = makeMemory([
      makeTurn('recovery_reflection'),
      makeTurn('recovery_reflection'),
    ])
    const topics = deriveUnresolvedTopics(m)
    const count = topics.filter((t) => t === 'recovery check pending').length
    expect(count).toBe(1)
  })

  it('returns empty for casual_conversation (resolution intent)', () => {
    const m = makeMemory([makeTurn('casual_conversation')])
    expect(deriveUnresolvedTopics(m)).toHaveLength(0)
  })

  it('detects multiple unresolved topics', () => {
    const m = makeMemory([
      makeTurn('recovery_reflection'),
      makeTurn('behavioral_reflection'),
    ])
    const topics = deriveUnresolvedTopics(m)
    expect(topics).toContain('recovery check pending')
    expect(topics).toContain('behavioral reflection open')
  })
})

// ─── pruneOldTurns ────────────────────────────────────────────────────────────

describe('pruneOldTurns', () => {
  it('does not prune when within limit', () => {
    const m = makeMemory([makeTurn('food_log'), makeTurn('training_reference')])
    const pruned = pruneOldTurns(m, 10)
    expect(pruned.turns).toHaveLength(2)
  })

  it('prunes oldest turns when over limit', () => {
    const turns = Array.from({ length: 8 }, (_, i) => makeTurn(i === 0 ? 'food_log' : 'casual_conversation'))
    const m = makeMemory(turns)
    const pruned = pruneOldTurns(m, 5)
    expect(pruned.turns).toHaveLength(5)
    // Oldest (food_log) should be gone
    expect(pruned.turns.every((t) => t.intentName === 'casual_conversation')).toBe(true)
  })

  it('does not mutate original memory', () => {
    const turns = Array.from({ length: 8 }, () => makeTurn('food_log'))
    const m = makeMemory(turns)
    pruneOldTurns(m, 3)
    expect(m.turns).toHaveLength(8)
  })

  it('handles maxTurns = 1 (keeps only newest turn)', () => {
    const m = makeMemory([makeTurn('food_log'), makeTurn('training_reference')])
    const pruned = pruneOldTurns(m, 1)
    expect(pruned.turns).toHaveLength(1)
    expect(pruned.turns[0].intentName).toBe('training_reference')
  })
})

// ─── deriveActiveDomains ──────────────────────────────────────────────────────

describe('deriveActiveDomains', () => {
  it('returns empty for empty memory', () => {
    const m = createShortTermMemory('u')
    expect(deriveActiveDomains(m)).toHaveLength(0)
  })

  it('collects all unique domains from turns', () => {
    const m = makeMemory([
      makeTurn('food_log', ['nutrition']),
      makeTurn('training_reference', ['training']),
      makeTurn('recovery_reflection', ['recovery']),
    ])
    const domains = deriveActiveDomains(m)
    expect(domains).toContain('nutrition')
    expect(domains).toContain('training')
    expect(domains).toContain('recovery')
  })

  it('deduplicates repeated domains', () => {
    const m = makeMemory([
      makeTurn('food_log', ['nutrition']),
      makeTurn('food_log', ['nutrition']),
    ])
    const domains = deriveActiveDomains(m)
    expect(domains.filter((d) => d === 'nutrition')).toHaveLength(1)
  })

  it('handles turns with multiple domains', () => {
    const m = makeMemory([makeTurn('food_log', ['nutrition', 'goals'])])
    const domains = deriveActiveDomains(m)
    expect(domains).toContain('nutrition')
    expect(domains).toContain('goals')
  })
})

// ─── buildTurn ────────────────────────────────────────────────────────────────

describe('buildTurn', () => {
  it('builds a valid ConversationTurn', () => {
    const turn = buildTurn('Test message', 'food_log', 'coaching', [], [], ['nutrition'])
    expect(turn.message).toBe('Test message')
    expect(turn.intentName).toBe('food_log')
    expect(turn.responseMode).toBe('coaching')
    expect(turn.domains).toContain('nutrition')
  })

  it('turnId is a non-empty string', () => {
    const turn = buildTurn('msg', 'food_log', 'coaching', [], [], [])
    expect(typeof turn.turnId).toBe('string')
    expect(turn.turnId.length).toBeGreaterThan(0)
  })

  it('uses provided timestamp when given', () => {
    const ts = '2026-05-14T10:00:00.000Z'
    const turn = buildTurn('msg', 'food_log', 'coaching', [], [], [], ts)
    expect(turn.timestamp).toBe(ts)
  })

  it('generates timestamp when not provided', () => {
    const turn = buildTurn('msg', 'food_log', 'coaching', [], [], [])
    expect(() => new Date(turn.timestamp)).not.toThrow()
    expect(new Date(turn.timestamp).getTime()).not.toBeNaN()
  })

  it('preserves riskFlags and continuityHints', () => {
    const turn = buildTurn('msg', 'food_log', 'coaching', ['low_energy'], ['hint1'], [])
    expect(turn.riskFlags).toContain('low_energy')
    expect(turn.continuityHints).toContain('hint1')
  })

  it('generates unique turnIds', () => {
    const t1 = buildTurn('a', 'food_log', 'coaching', [], [], [])
    const t2 = buildTurn('b', 'food_log', 'coaching', [], [], [])
    expect(t1.turnId).not.toBe(t2.turnId)
  })
})
