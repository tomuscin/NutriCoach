/**
 * NCIC Conversation Memory Types — ETAP 5.3
 *
 * Minimal deterministic memory model for conversation continuity.
 *
 * NOT:
 *   - vector DB
 *   - embeddings
 *   - AI memory agent
 *   - long-term persistent store
 *
 * IS:
 *   - in-memory runtime
 *   - deterministic
 *   - pure/testable
 *   - future-ready for persistent backing
 */

import type { IntentName } from '../intents/types'

// ─── ID Generator ─────────────────────────────────────────────────────────────

let _memoryIdCounter = 0

/** Deterministic in-process ID. Not cryptographic — just unique per runtime session. */
export function generateMemoryId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++_memoryIdCounter}`
}

// ─── Conversation Turn ────────────────────────────────────────────────────────

/**
 * A single recorded turn in the short-term conversation window.
 * Captured after each processConversationTurn() call.
 */
export interface ConversationTurn {
  turnId: string
  timestamp: string
  /** Raw user message */
  message: string
  /** Classified intent for this turn */
  intentName: IntentName
  /** Response mode selected */
  responseMode: string
  /** Risk flags that were active */
  riskFlags: string[]
  /** Continuity hints generated this turn */
  continuityHints: string[]
  /** Active domains this turn */
  domains: string[]
}

// ─── Short-Term Memory ────────────────────────────────────────────────────────

/**
 * Rolling window of recent conversation turns.
 * Bounded by MemoryPolicies.maxShortTermTurns.
 */
export interface ShortTermMemory {
  userId: string
  /** Conversation session ID — resets between sessions */
  conversationId: string
  /** Ordered turns, oldest first */
  turns: ConversationTurn[]
  /** Currently active intent (from most recent turn) */
  activeIntent: IntentName | null
  /** Domains that have appeared in this session */
  activeDomains: string[]
  /** Topics detected as unresolved in the current window */
  unresolvedTopics: string[]
  /** ISO timestamp of session start */
  startedAt: string
  /** ISO timestamp of last turn update */
  lastUpdatedAt: string
}

// ─── Episodic Event Type ──────────────────────────────────────────────────────

/**
 * Categories of notable events the memory layer tracks.
 * Detected deterministically from runtime signals — no LLM.
 */
export type EpisodicEventType =
  | 'low_recovery'           // Recovery status 'poor'
  | 'high_training_load'     // TSS > 100, not in poor recovery
  | 'overtraining_detected'  // TSS > 120 + poor recovery
  | 'pr_achieved'            // High TSS personal record (TSS > 150)
  | 'missed_nutrition'       // Calories < 50% of daily target
  | 'nutrition_streak'       // Nutrition complete logged
  | 'training_streak'        // Training logged today
  | 'calorie_deficit_streak' // Calories significantly below target (50–80% range)
  | 'goal_updated'           // User updated a goal
  | 'behavioral_drop'        // Energy ≤ 2 or mood ≤ 2
  | 'behavioral_recovery'    // Energy ≥ 4 and mood ≥ 4
  | 'inactivity'             // No interactions for N days

// ─── Episodic Event ───────────────────────────────────────────────────────────

/**
 * A notable event recorded from a user's runtime session.
 * Future-ready for persistent storage (maps cleanly to a DB row).
 */
export interface EpisodicEvent {
  eventId: string
  userId: string
  type: EpisodicEventType
  /** Human-readable summary of what happened */
  summary: string
  /** ISO date this event occurred (YYYY-MM-DD) */
  date: string
  /** ISO timestamp when this was recorded */
  recordedAt: string
  severity: 'info' | 'warning' | 'critical'
  /** Domain-specific metadata for this event type */
  metadata: Record<string, unknown>
}

// ─── Continuity State ─────────────────────────────────────────────────────────

/**
 * Cross-session continuity record for a user.
 * Tracks interaction frequency and recent activity patterns.
 * Future-ready for persistent backing.
 */
export interface ContinuityState {
  userId: string
  /** ISO timestamp of last conversation interaction, or null if new user */
  lastInteractionAt: string | null
  /** Total number of recorded interactions */
  totalInteractions: number
  /** Domains active in the most recent session */
  lastActiveDomains: string[]
  /** Short summaries of recent conversation sessions */
  recentConversationSummaries: string[]
  /** Days since last interaction (null if no prior interaction) */
  inactivityDays: number | null
}

// ─── Memory Signals ───────────────────────────────────────────────────────────

/**
 * Aggregate of memory-derived signals for the conversation context builder.
 * Enriches ConversationContext with continuity and episodic history.
 */
export interface MemorySignals {
  /** Whether this user has existing memory (not first turn) */
  hasMemory: boolean
  /** Cross-session continuity state */
  continuityState: ContinuityState
  /** Recent notable episodes for this user */
  recentEpisodes: EpisodicEvent[]
  /** Unresolved topics from the current short-term window */
  unresolvedTopics: string[]
  /** Memory-derived continuity hints (to merge with runtime hints) */
  memoryContinuityHints: string[]
}

// ─── Memory Policies ─────────────────────────────────────────────────────────

/**
 * Configurable bounds for memory lifecycle management.
 * Deterministic — no fuzzy rules.
 */
export interface MemoryPolicies {
  /** Max turns to keep in short-term window. Oldest pruned when exceeded. */
  maxShortTermTurns: number
  /** Episodes older than this (in days) are expired. */
  episodeExpirationDays: number
  /** After this many days inactive, generate an inactivity hint. */
  inactivityThresholdDays: number
  /** Max episodes to return in recent episode queries. */
  maxRecentEpisodes: number
  /** Max recent conversation summaries to keep. */
  maxRecentSummaries: number
}

export const DEFAULT_MEMORY_POLICIES: MemoryPolicies = {
  maxShortTermTurns: 20,
  episodeExpirationDays: 30,
  inactivityThresholdDays: 2,
  maxRecentEpisodes: 10,
  maxRecentSummaries: 5,
}
