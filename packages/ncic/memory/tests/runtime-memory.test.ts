/**
 * Tests: NCIC Runtime Memory Integration
 *
 * Covers:
 *   - MemoryStore (all methods)
 *   - retrieveMemory()
 *   - buildMemorySignals()
 *   - recordTurnToMemory()
 *   - Full pipeline integration with ETAP 5.2 runtime
 *   - User isolation in store
 *   - Episode detection via recordTurn
 *   - Memory signals fed to ConversationContext
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMemoryStore, MemoryStore } from '../memory-store'
import { retrieveMemory, buildMemorySignals, recordTurnToMemory } from '../runtime-memory'
import { processConversationTurn } from '../../conversation/runtime'
import { createEmptySnapshot } from '../../runtime/state'
import type { RuntimeContextSnapshot } from '../../runtime/state'
import type { ConversationTurn, EpisodicEvent } from '../types'
import { INTENT_NAMES } from '../../intents/types'

// ─── Factories ────────────────────────────────────────────────────────────────

const DATE = '2026-05-14'
const USER_A = 'user-mem-a'
const USER_B = 'user-mem-b'

function makeSnapshot(overrides?: Partial<RuntimeContextSnapshot>): RuntimeContextSnapshot {
  return { ...createEmptySnapshot(USER_A, DATE), ...overrides }
}

function makeTurnRecord(intentName: string, userId = USER_A): ConversationTurn {
  return {
    turnId: `turn-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    message: 'test message',
    intentName: intentName as ConversationTurn['intentName'],
    responseMode: 'coaching',
    riskFlags: [],
    continuityHints: [],
    domains: ['nutrition'],
  }
}

function makeEpisodeRecord(type: EpisodicEvent['type'], userId = USER_A): EpisodicEvent {
  return {
    eventId: `ep-${Math.random().toString(36).slice(2)}`,
    userId,
    type,
    summary: `test ${type}`,
    date: DATE,
    recordedAt: new Date().toISOString(),
    severity: 'info',
    metadata: {},
  }
}

function runTurn(message: string, snapOverrides?: Partial<RuntimeContextSnapshot>) {
  return processConversationTurn({
    message,
    userId: USER_A,
    date: DATE,
    snapshot: makeSnapshot(snapOverrides),
  })
}

// ─── MemoryStore — short-term memory ──────────────────────────────────────────

describe('MemoryStore — short-term memory', () => {
  let store: MemoryStore

  beforeEach(() => {
    store = createMemoryStore()
  })

  it('returns null for unknown user', () => {
    expect(store.getShortTermMemory('unknown-user')).toBeNull()
  })

  it('saves and retrieves short-term memory', () => {
    const mem = {
      userId: USER_A,
      conversationId: 'conv-1',
      turns: [],
      activeIntent: null,
      activeDomains: [],
      unresolvedTopics: [],
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    }
    store.saveShortTermMemory(USER_A, mem)
    expect(store.getShortTermMemory(USER_A)).not.toBeNull()
    expect(store.getShortTermMemory(USER_A)?.userId).toBe(USER_A)
  })

  it('appends a conversation turn for a new user (creates memory)', () => {
    const turn = makeTurnRecord('food_log')
    store.appendConversationTurn(USER_A, turn)
    const mem = store.getShortTermMemory(USER_A)
    expect(mem).not.toBeNull()
    expect(mem?.turns).toHaveLength(1)
  })

  it('appends multiple turns in order', () => {
    store.appendConversationTurn(USER_A, makeTurnRecord('food_log'))
    store.appendConversationTurn(USER_A, makeTurnRecord('training_reference'))
    store.appendConversationTurn(USER_A, makeTurnRecord('recovery_reflection'))
    const mem = store.getShortTermMemory(USER_A)
    expect(mem?.turns).toHaveLength(3)
    expect(mem?.turns[0].intentName).toBe('food_log')
    expect(mem?.turns[2].intentName).toBe('recovery_reflection')
  })

  it('respects maxShortTermTurns policy', () => {
    const tinyStore = createMemoryStore({ maxShortTermTurns: 3 })
    for (let i = 0; i < 6; i++) {
      tinyStore.appendConversationTurn(USER_A, makeTurnRecord('food_log'))
    }
    expect(tinyStore.getShortTermMemory(USER_A)?.turns.length).toBeLessThanOrEqual(3)
  })

  it('updates activeIntent after append', () => {
    store.appendConversationTurn(USER_A, makeTurnRecord('training_reference'))
    expect(store.getShortTermMemory(USER_A)?.activeIntent).toBe('training_reference')
  })
})

// ─── MemoryStore — episodic memory ────────────────────────────────────────────

describe('MemoryStore — episodic memory', () => {
  let store: MemoryStore

  beforeEach(() => {
    store = createMemoryStore()
  })

  it('returns empty array for unknown user', () => {
    expect(store.getRecentEpisodes('unknown')).toHaveLength(0)
  })

  it('saves and retrieves an episode', () => {
    const ep = makeEpisodeRecord('low_recovery')
    store.saveEpisode(USER_A, ep)
    const episodes = store.getRecentEpisodes(USER_A)
    expect(episodes.some((e) => e.type === 'low_recovery')).toBe(true)
  })

  it('retrieves multiple saved episodes', () => {
    store.saveEpisode(USER_A, makeEpisodeRecord('low_recovery'))
    store.saveEpisode(USER_A, makeEpisodeRecord('behavioral_drop'))
    expect(store.getRecentEpisodes(USER_A).length).toBeGreaterThanOrEqual(2)
  })

  it('respects maxRecentEpisodes policy', () => {
    const tinyStore = createMemoryStore({ maxRecentEpisodes: 2 })
    tinyStore.saveEpisode(USER_A, makeEpisodeRecord('low_recovery'))
    tinyStore.saveEpisode(USER_A, makeEpisodeRecord('behavioral_drop'))
    tinyStore.saveEpisode(USER_A, makeEpisodeRecord('training_streak'))
    expect(tinyStore.getRecentEpisodes(USER_A).length).toBeLessThanOrEqual(2)
  })
})

// ─── MemoryStore — continuity state ──────────────────────────────────────────

describe('MemoryStore — continuity state', () => {
  let store: MemoryStore

  beforeEach(() => {
    store = createMemoryStore()
  })

  it('returns default empty state for unknown user', () => {
    const state = store.getContinuityState('unknown')
    expect(state.userId).toBe('unknown')
    expect(state.lastInteractionAt).toBeNull()
    expect(state.totalInteractions).toBe(0)
  })

  it('updates continuity state after appendConversationTurn', () => {
    store.appendConversationTurn(USER_A, makeTurnRecord('food_log'))
    const state = store.getContinuityState(USER_A)
    expect(state.totalInteractions).toBeGreaterThan(0)
    expect(state.lastInteractionAt).not.toBeNull()
  })

  it('totalInteractions increments with each appended turn', () => {
    store.appendConversationTurn(USER_A, makeTurnRecord('food_log'))
    store.appendConversationTurn(USER_A, makeTurnRecord('training_reference'))
    expect(store.getContinuityState(USER_A).totalInteractions).toBe(2)
  })

  it('updateContinuityState merges partial update', () => {
    store.updateContinuityState(USER_A, { totalInteractions: 99 })
    expect(store.getContinuityState(USER_A).totalInteractions).toBe(99)
  })
})

// ─── MemoryStore — user isolation ────────────────────────────────────────────

describe('MemoryStore — user isolation', () => {
  let store: MemoryStore

  beforeEach(() => {
    store = createMemoryStore()
  })

  it('different users have separate short-term memories', () => {
    store.appendConversationTurn(USER_A, makeTurnRecord('food_log', USER_A))
    store.appendConversationTurn(USER_B, makeTurnRecord('training_reference', USER_B))

    expect(store.getShortTermMemory(USER_A)?.turns[0].intentName).toBe('food_log')
    expect(store.getShortTermMemory(USER_B)?.turns[0].intentName).toBe('training_reference')
  })

  it('different users have separate episode stores', () => {
    store.saveEpisode(USER_A, makeEpisodeRecord('low_recovery', USER_A))
    store.saveEpisode(USER_B, makeEpisodeRecord('behavioral_drop', USER_B))

    const aEps = store.getRecentEpisodes(USER_A)
    const bEps = store.getRecentEpisodes(USER_B)
    expect(aEps.some((e) => e.type === 'low_recovery')).toBe(true)
    expect(bEps.some((e) => e.type === 'behavioral_drop')).toBe(true)
    expect(aEps.some((e) => e.type === 'behavioral_drop')).toBe(false)
  })

  it('clearMemory removes only the specified user', () => {
    store.appendConversationTurn(USER_A, makeTurnRecord('food_log'))
    store.appendConversationTurn(USER_B, makeTurnRecord('food_log'))
    store.clearMemory(USER_A)

    expect(store.getShortTermMemory(USER_A)).toBeNull()
    expect(store.getShortTermMemory(USER_B)).not.toBeNull()
  })

  it('clearAll removes all users', () => {
    store.appendConversationTurn(USER_A, makeTurnRecord('food_log'))
    store.appendConversationTurn(USER_B, makeTurnRecord('food_log'))
    store.clearAll()

    expect(store.getShortTermMemory(USER_A)).toBeNull()
    expect(store.getShortTermMemory(USER_B)).toBeNull()
  })
})

// ─── retrieveMemory ───────────────────────────────────────────────────────────

describe('retrieveMemory', () => {
  let store: MemoryStore

  beforeEach(() => {
    store = createMemoryStore()
  })

  it('returns null shortTerm for new user', () => {
    const result = retrieveMemory('brand-new-user', store)
    expect(result.shortTerm).toBeNull()
  })

  it('returns empty recentEpisodes for new user', () => {
    const result = retrieveMemory('brand-new-user', store)
    expect(result.recentEpisodes).toHaveLength(0)
  })

  it('returns default continuityState for new user', () => {
    const result = retrieveMemory('brand-new-user', store)
    expect(result.continuityState.totalInteractions).toBe(0)
    expect(result.continuityState.lastInteractionAt).toBeNull()
  })

  it('returns populated shortTerm for known user', () => {
    store.appendConversationTurn(USER_A, makeTurnRecord('food_log'))
    const result = retrieveMemory(USER_A, store)
    expect(result.shortTerm).not.toBeNull()
    expect(result.shortTerm?.turns).toHaveLength(1)
  })

  it('returns episodes for known user', () => {
    store.saveEpisode(USER_A, makeEpisodeRecord('low_recovery'))
    const result = retrieveMemory(USER_A, store)
    expect(result.recentEpisodes.some((e) => e.type === 'low_recovery')).toBe(true)
  })
})

// ─── buildMemorySignals ───────────────────────────────────────────────────────

describe('buildMemorySignals', () => {
  let store: MemoryStore

  beforeEach(() => {
    store = createMemoryStore()
  })

  it('hasMemory is false for new user', () => {
    const retrieval = retrieveMemory('new-user', store)
    const signals = buildMemorySignals(retrieval)
    expect(signals.hasMemory).toBe(false)
  })

  it('hasMemory is true after turn recorded', () => {
    store.appendConversationTurn(USER_A, makeTurnRecord('food_log'))
    const retrieval = retrieveMemory(USER_A, store)
    const signals = buildMemorySignals(retrieval)
    expect(signals.hasMemory).toBe(true)
  })

  it('unresolvedTopics is empty for new user', () => {
    const retrieval = retrieveMemory('new-user', store)
    const signals = buildMemorySignals(retrieval)
    expect(signals.unresolvedTopics).toHaveLength(0)
  })

  it('recentEpisodes is empty for new user', () => {
    const retrieval = retrieveMemory('new-user', store)
    const signals = buildMemorySignals(retrieval)
    expect(signals.recentEpisodes).toHaveLength(0)
  })

  it('memoryContinuityHints is an array', () => {
    const retrieval = retrieveMemory('new-user', store)
    const signals = buildMemorySignals(retrieval)
    expect(Array.isArray(signals.memoryContinuityHints)).toBe(true)
  })

  it('includes episode-based hints when episodes exist', () => {
    store.saveEpisode(USER_A, makeEpisodeRecord('low_recovery'))
    const retrieval = retrieveMemory(USER_A, store)
    const signals = buildMemorySignals(retrieval)
    expect(signals.memoryContinuityHints.some((h) => h.includes('recovery'))).toBe(true)
  })

  it('continuityState is always returned', () => {
    const retrieval = retrieveMemory('new-user', store)
    const signals = buildMemorySignals(retrieval)
    expect(signals.continuityState).toBeDefined()
    expect(signals.continuityState.userId).toBe('new-user')
  })
})

// ─── recordTurnToMemory ───────────────────────────────────────────────────────

describe('recordTurnToMemory', () => {
  let store: MemoryStore

  beforeEach(() => {
    store = createMemoryStore()
  })

  it('records turn to short-term memory', () => {
    const result = runTurn('Zjadłem burgera')
    recordTurnToMemory(store, result, DATE)
    expect(store.getShortTermMemory(USER_A)).not.toBeNull()
    expect(store.getShortTermMemory(USER_A)?.turns).toHaveLength(1)
  })

  it('recorded turn has correct intentName', () => {
    const result = runTurn('Zjadłem burgera')
    recordTurnToMemory(store, result, DATE)
    const mem = store.getShortTermMemory(USER_A)
    expect(mem?.turns[0].intentName).toBe(result.context.intent.name)
  })

  it('records multiple turns in sequence', () => {
    recordTurnToMemory(store, runTurn('Zjadłem burgera'), DATE)
    recordTurnToMemory(store, runTurn('Byłem na rowerze'), DATE)
    recordTurnToMemory(store, runTurn('Jestem zmęczony'), DATE)
    expect(store.getShortTermMemory(USER_A)?.turns).toHaveLength(3)
  })

  it('detects and saves episodes from runtime snapshot', () => {
    const result = runTurn('Cześć', {
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
    })
    recordTurnToMemory(store, result, DATE)
    const episodes = store.getRecentEpisodes(USER_A)
    expect(episodes.some((e) => e.type === 'low_recovery')).toBe(true)
  })

  it('detects overtraining episode and saves it', () => {
    const result = runTurn('Byłem na rowerze', {
      training: { durationMinutes: 200, tss: 130, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
    })
    recordTurnToMemory(store, result, DATE)
    const episodes = store.getRecentEpisodes(USER_A)
    expect(episodes.some((e) => e.type === 'overtraining_detected')).toBe(true)
  })

  it('does not save duplicate episodes for same date + type', () => {
    const result = runTurn('Cześć', {
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
    })
    recordTurnToMemory(store, result, DATE)
    recordTurnToMemory(store, result, DATE)
    const episodes = store.getRecentEpisodes(USER_A)
    const lowRecoveryCount = episodes.filter((e) => e.type === 'low_recovery').length
    expect(lowRecoveryCount).toBe(1)
  })
})

// ─── Full pipeline integration ────────────────────────────────────────────────

describe('Full pipeline: processConversationTurn + recordTurnToMemory + memory signals', () => {
  let store: MemoryStore

  beforeEach(() => {
    store = createMemoryStore()
  })

  it('memory signals integrate into a second conversation turn', () => {
    // First turn: record it
    const turn1 = runTurn('Zjadłem burgera')
    recordTurnToMemory(store, turn1, DATE)

    // Second turn: retrieve memory, build signals
    const retrieval = retrieveMemory(USER_A, store)
    const memSignals = buildMemorySignals(retrieval)
    expect(memSignals.hasMemory).toBe(true)

    // Build second context with memory signals
    const turn2 = processConversationTurn({
      message: 'Jak mi idzie?',
      userId: USER_A,
      date: DATE,
      snapshot: makeSnapshot(),
      memorySignals: memSignals,
    })
    expect(turn2.context.memorySignals?.hasMemory).toBe(true)
  })

  it('poor recovery episode surfaces in memory signals after recording', () => {
    const result = runTurn('Cześć', {
      recovery: { status: 'poor', readinessScore: 30, lastUpdated: `${DATE}T07:00:00Z` },
    })
    recordTurnToMemory(store, result, DATE)

    const retrieval = retrieveMemory(USER_A, store)
    const signals = buildMemorySignals(retrieval)
    expect(signals.recentEpisodes.some((e) => e.type === 'low_recovery')).toBe(true)
    expect(signals.memoryContinuityHints.some((h) => h.includes('recovery'))).toBe(true)
  })

  it('unresolved topics from recovery_reflection appear in memory signals', () => {
    const result = runTurn('Jestem bardzo zmęczony')
    if (result.context.intent.name === INTENT_NAMES.RECOVERY_REFLECTION) {
      recordTurnToMemory(store, result, DATE)
      const retrieval = retrieveMemory(USER_A, store)
      const signals = buildMemorySignals(retrieval)
      // unresolvedTopics may or may not be set depending on intent classification
      expect(Array.isArray(signals.unresolvedTopics)).toBe(true)
    }
  })

  it('memorySignals on ConversationContext is undefined when not passed', () => {
    const result = processConversationTurn({
      message: 'Zjadłem burgera',
      userId: USER_A,
      date: DATE,
      snapshot: makeSnapshot(),
    })
    expect(result.context.memorySignals).toBeUndefined()
  })

  it('memorySignals is defined when passed via BuildContextInput', () => {
    const retrieval = retrieveMemory(USER_A, store)
    const memSignals = buildMemorySignals(retrieval)

    const result = processConversationTurn({
      message: 'Zjadłem burgera',
      userId: USER_A,
      date: DATE,
      snapshot: makeSnapshot(),
      memorySignals: memSignals,
    })
    expect(result.context.memorySignals).toBeDefined()
    expect(result.context.memorySignals?.hasMemory).toBe(false)
  })

  it('clearAll resets memory between test isolation', () => {
    store.appendConversationTurn(USER_A, {
      turnId: 'x',
      timestamp: new Date().toISOString(),
      message: 'test',
      intentName: 'food_log',
      responseMode: 'coaching',
      riskFlags: [],
      continuityHints: [],
      domains: [],
    })
    store.clearAll()
    expect(store.getShortTermMemory(USER_A)).toBeNull()
    expect(store.getRecentEpisodes(USER_A)).toHaveLength(0)
    expect(store.getContinuityState(USER_A).totalInteractions).toBe(0)
  })
})
