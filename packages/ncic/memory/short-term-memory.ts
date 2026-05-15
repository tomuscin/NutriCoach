/**
 * NCIC Short-Term Memory
 *
 * Manages the rolling window of conversation turns within a session.
 * Bounded by MemoryPolicies.maxShortTermTurns.
 *
 * All functions are pure — no mutation, no side effects.
 * Same inputs → same outputs.
 */

import type { ConversationTurn, ShortTermMemory, MemoryPolicies } from './types'
import { generateMemoryId, DEFAULT_MEMORY_POLICIES } from './types'
import type { IntentName } from '../intents/types'

// ─── Unresolved Intent Detection ──────────────────────────────────────────────

/**
 * Intents that tend to leave topics open (need follow-up or resolution).
 */
const UNRESOLVED_INTENT_TYPES = new Set<IntentName>([
  'recovery_reflection',
  'behavioral_reflection',
  'unknown',
])

/**
 * Intents that typically resolve or close a topic.
 */
const RESOLUTION_INTENT_TYPES = new Set<IntentName>([
  'food_log',
  'training_reference',
  'goal_update',
  'progress_check',
  'coach_question',
  'casual_conversation',
])

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new empty short-term memory for a user session.
 */
export function createShortTermMemory(userId: string, conversationId?: string): ShortTermMemory {
  const now = new Date().toISOString()
  return {
    userId,
    conversationId: conversationId ?? generateMemoryId('conv'),
    turns: [],
    activeIntent: null,
    activeDomains: [],
    unresolvedTopics: [],
    startedAt: now,
    lastUpdatedAt: now,
  }
}

/**
 * Append a turn to short-term memory.
 * Prunes oldest turns if maxShortTermTurns is exceeded.
 * Returns a new ShortTermMemory — does not mutate input.
 */
export function appendTurn(
  memory: ShortTermMemory,
  turn: ConversationTurn,
  policies: MemoryPolicies = DEFAULT_MEMORY_POLICIES,
): ShortTermMemory {
  const newTurns = [...memory.turns, turn]
  const pruned = pruneOldTurns({ ...memory, turns: newTurns }, policies.maxShortTermTurns)
  const activeDomains = deriveActiveDomains(pruned)
  const unresolvedTopics = deriveUnresolvedTopics(pruned)

  return {
    ...pruned,
    activeIntent: turn.intentName,
    activeDomains,
    unresolvedTopics,
    lastUpdatedAt: turn.timestamp,
  }
}

/**
 * Get the N most recent turns (newest last).
 */
export function getRecentTurns(memory: ShortTermMemory, count: number): ConversationTurn[] {
  if (count <= 0) return []
  return memory.turns.slice(-count)
}

/**
 * Derive unresolved topics from the current turn window.
 *
 * A topic is unresolved if the most recent turns have a reflective/unknown intent
 * and no subsequent resolution intent has been seen.
 *
 * Looks at the last 5 turns to detect patterns.
 */
export function deriveUnresolvedTopics(memory: ShortTermMemory): string[] {
  if (memory.turns.length === 0) return []

  const recent = memory.turns.slice(-5)
  const topics = new Set<string>()

  // Walk backwards — if we hit a resolution intent, stop tracking
  let seenResolution = false
  for (let i = recent.length - 1; i >= 0; i--) {
    const turn = recent[i]
    if (RESOLUTION_INTENT_TYPES.has(turn.intentName as IntentName)) {
      seenResolution = true
      break
    }
    if (!seenResolution && UNRESOLVED_INTENT_TYPES.has(turn.intentName as IntentName)) {
      if (turn.intentName === 'recovery_reflection') topics.add('recovery check pending')
      if (turn.intentName === 'behavioral_reflection') topics.add('behavioral reflection open')
      if (turn.intentName === 'unknown') topics.add('user intent unclear')
    }
  }

  return [...topics]
}

/**
 * Prune turns to max allowed, keeping the most recent ones.
 * Returns a new ShortTermMemory — does not mutate input.
 */
export function pruneOldTurns(memory: ShortTermMemory, maxTurns: number): ShortTermMemory {
  if (memory.turns.length <= maxTurns) return memory
  return {
    ...memory,
    turns: memory.turns.slice(-maxTurns),
  }
}

/**
 * Derive the unique active domains from all turns in the window.
 */
export function deriveActiveDomains(memory: ShortTermMemory): string[] {
  const seen = new Set<string>()
  for (const turn of memory.turns) {
    for (const d of turn.domains) {
      seen.add(d)
    }
  }
  return [...seen]
}

/**
 * Build a ConversationTurn record from raw parts.
 */
export function buildTurn(
  message: string,
  intentName: IntentName,
  responseMode: string,
  riskFlags: string[],
  continuityHints: string[],
  domains: string[],
  timestamp?: string,
): ConversationTurn {
  return {
    turnId: generateMemoryId('turn'),
    timestamp: timestamp ?? new Date().toISOString(),
    message,
    intentName,
    responseMode,
    riskFlags,
    continuityHints,
    domains,
  }
}
