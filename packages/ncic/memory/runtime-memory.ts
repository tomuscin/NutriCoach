/**
 * NCIC Runtime Memory Integration — ETAP 5.3
 *
 * Connects the memory layer to the ETAP 5.2 conversation runtime pipeline.
 *
 * Pipeline extension:
 *   message
 *     → classifyIntent()
 *     → getRuntimeState()
 *     → retrieveMemory()          ← this module
 *     → buildConversationContext()
 *     → buildContinuityHints()    ← enhanced by memory
 *     → planConversationalResponse()
 *
 * Design:
 *   - Zero LLM
 *   - Zero IO
 *   - Pure orchestration functions
 *   - MemoryStore is caller-provided (no singleton dependency)
 */

import type { MemorySignals, EpisodicEvent, ShortTermMemory, ContinuityState } from './types'
import { buildMemoryContinuityHints } from './continuity'
import { detectEpisodes } from './episodic-memory'
import { buildTurn } from './short-term-memory'
import type { MemoryStore } from './memory-store'
import type { ConversationTurnResult } from '../conversation/types'

// ─── Memory Retrieval ─────────────────────────────────────────────────────────

export interface MemoryRetrievalResult {
  shortTerm: ShortTermMemory | null
  recentEpisodes: EpisodicEvent[]
  continuityState: ContinuityState
}

/**
 * Retrieve all memory state for a user from the store.
 * Safe to call for new users — returns null/empty/defaults.
 */
export function retrieveMemory(userId: string, store: MemoryStore): MemoryRetrievalResult {
  return {
    shortTerm: store.getShortTermMemory(userId),
    recentEpisodes: store.getRecentEpisodes(userId),
    continuityState: store.getContinuityState(userId),
  }
}

// ─── Memory Signal Assembly ───────────────────────────────────────────────────

/**
 * Build MemorySignals from a retrieval result.
 * These are fed into ConversationContext.memorySignals.
 */
export function buildMemorySignals(retrieval: MemoryRetrievalResult): MemorySignals {
  const hints = buildMemoryContinuityHints(
    retrieval.shortTerm,
    retrieval.recentEpisodes,
    retrieval.continuityState,
  )

  return {
    hasMemory: retrieval.shortTerm !== null,
    continuityState: retrieval.continuityState,
    recentEpisodes: retrieval.recentEpisodes,
    unresolvedTopics: retrieval.shortTerm?.unresolvedTopics ?? [],
    memoryContinuityHints: hints,
  }
}

// ─── Turn Recording ───────────────────────────────────────────────────────────

/**
 * Record a completed conversation turn into the memory store.
 *
 * This should be called AFTER processConversationTurn() returns.
 *
 * - Appends the turn to short-term memory
 * - Detects and saves new episodic events from the runtime snapshot
 *
 * @param store   The MemoryStore instance to write into
 * @param result  The ConversationTurnResult from the pipeline
 * @param date    ISO date string (YYYY-MM-DD) for episode detection
 */
export function recordTurnToMemory(
  store: MemoryStore,
  result: ConversationTurnResult,
  date: string,
): void {
  const { context, message } = result

  // Build the turn record
  const turn = buildTurn(
    message,
    context.intent.name,
    context.responseMode,
    context.riskFlags,
    context.continuityHints,
    context.activeDomains,
    result.processedAt,
  )

  // Append to short-term window
  store.appendConversationTurn(context.userId, turn)

  // Detect and persist episodic events
  const existing = store.getRecentEpisodes(context.userId)
  const newEpisodes = detectEpisodes(context.userId, date, context.runtimeSnapshot, existing)
  for (const episode of newEpisodes) {
    store.saveEpisode(context.userId, episode)
  }
}
