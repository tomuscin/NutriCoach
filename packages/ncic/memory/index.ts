/**
 * NCIC Memory Layer — Public API
 *
 * The memory layer provides conversation continuity, episodic event detection,
 * and short-term window management for the NCIC conversational runtime.
 *
 * Pipeline integration (ETAP 5.3):
 *   retrieveMemory() → buildMemorySignals() → (feeds into ConversationContext)
 *   recordTurnToMemory() → (called after each turn)
 */

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  ConversationTurn,
  ShortTermMemory,
  EpisodicEvent,
  EpisodicEventType,
  ContinuityState,
  MemorySignals,
  MemoryPolicies,
} from './types'
export { DEFAULT_MEMORY_POLICIES, generateMemoryId } from './types'

// ─── Short-Term Memory ────────────────────────────────────────────────────────
export {
  createShortTermMemory,
  appendTurn,
  getRecentTurns,
  deriveUnresolvedTopics,
  pruneOldTurns,
  deriveActiveDomains,
  buildTurn,
} from './short-term-memory'

// ─── Episodic Memory ──────────────────────────────────────────────────────────
export {
  detectEpisodes,
  appendEpisode,
  getRecentEpisodes,
  expireEpisodes,
  hasTodayEpisode,
} from './episodic-memory'

// ─── Continuity Engine ────────────────────────────────────────────────────────
export {
  buildMemoryContinuityHints,
  buildContinuityState,
  createEmptyContinuityState,
  detectInactivity,
} from './continuity'

// ─── Memory Store ─────────────────────────────────────────────────────────────
export { MemoryStore, createMemoryStore } from './memory-store'

// ─── Runtime Integration ──────────────────────────────────────────────────────
export {
  retrieveMemory,
  buildMemorySignals,
  recordTurnToMemory,
} from './runtime-memory'
export type { MemoryRetrievalResult } from './runtime-memory'
