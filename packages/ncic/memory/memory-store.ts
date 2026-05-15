/**
 * NCIC Memory Store — ETAP 5.3
 *
 * In-memory runtime store for conversation memory.
 * Keyed by userId. Isolated per user.
 *
 * NOT:
 *   - Redis
 *   - DB
 *   - vector store
 *   - persistent storage
 *
 * IS:
 *   - pure in-process runtime
 *   - deterministic
 *   - future-ready (API designed to swap backing store later)
 *
 * Use one MemoryStore instance per runtime process.
 * Use createMemoryStore() for testable instances.
 */

import type {
  ShortTermMemory,
  ConversationTurn,
  EpisodicEvent,
  ContinuityState,
  MemoryPolicies,
} from './types'
import { DEFAULT_MEMORY_POLICIES } from './types'
import {
  appendTurn,
  createShortTermMemory,
} from './short-term-memory'
import {
  expireEpisodes,
  getRecentEpisodes as filterRecentEpisodes,
} from './episodic-memory'
import {
  createEmptyContinuityState,
  buildContinuityState,
  detectInactivity,
} from './continuity'

// ─── MemoryStore ──────────────────────────────────────────────────────────────

export class MemoryStore {
  private shortTermStore = new Map<string, ShortTermMemory>()
  private episodeStore = new Map<string, EpisodicEvent[]>()
  private continuityStore = new Map<string, ContinuityState>()
  private policies: MemoryPolicies

  constructor(policies: MemoryPolicies = DEFAULT_MEMORY_POLICIES) {
    this.policies = policies
  }

  // ── Short-Term Memory ──────────────────────────────────────────────────────

  saveShortTermMemory(userId: string, memory: ShortTermMemory): void {
    this.shortTermStore.set(userId, memory)
  }

  getShortTermMemory(userId: string): ShortTermMemory | null {
    return this.shortTermStore.get(userId) ?? null
  }

  /**
   * Append a turn to the user's short-term memory.
   * Creates the memory window if it doesn't exist.
   * Applies maxShortTermTurns policy.
   */
  appendConversationTurn(userId: string, turn: ConversationTurn): void {
    const existing = this.shortTermStore.get(userId) ?? createShortTermMemory(userId)
    const updated = appendTurn(existing, turn, this.policies)
    this.shortTermStore.set(userId, updated)

    // Update continuity state
    this._touchContinuity(userId, turn.domains, turn.timestamp)
  }

  // ── Episodic Memory ────────────────────────────────────────────────────────

  saveEpisode(userId: string, event: EpisodicEvent): void {
    const existing = this.episodeStore.get(userId) ?? []
    // Expire old episodes before appending
    const pruned = expireEpisodes(existing, this.policies.episodeExpirationDays)
    this.episodeStore.set(userId, [...pruned, event])
  }

  /**
   * Get recent episodes for a user.
   * @param userId
   * @param days  Look-back window in days. Defaults to episodeExpirationDays policy.
   */
  getRecentEpisodes(userId: string, days?: number): EpisodicEvent[] {
    const episodes = this.episodeStore.get(userId) ?? []
    const lookback = days ?? this.policies.episodeExpirationDays
    const recent = filterRecentEpisodes(episodes, lookback)
    // Return max recent episodes per policy
    return recent.slice(-this.policies.maxRecentEpisodes)
  }

  // ── Continuity State ───────────────────────────────────────────────────────

  getContinuityState(userId: string): ContinuityState {
    return this.continuityStore.get(userId) ?? createEmptyContinuityState(userId)
  }

  updateContinuityState(userId: string, update: Partial<ContinuityState>): void {
    const existing = this.getContinuityState(userId)
    this.continuityStore.set(userId, { ...existing, ...update })
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /** Clear all memory for a single user. */
  clearMemory(userId: string): void {
    this.shortTermStore.delete(userId)
    this.episodeStore.delete(userId)
    this.continuityStore.delete(userId)
  }

  /** Clear all memory for all users. */
  clearAll(): void {
    this.shortTermStore.clear()
    this.episodeStore.clear()
    this.continuityStore.clear()
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private _touchContinuity(userId: string, domains: string[], timestamp: string): void {
    const existing = this.getContinuityState(userId)
    const updatedDomains = [...new Set([...existing.lastActiveDomains, ...domains])]
    const updated = buildContinuityState(
      userId,
      timestamp,
      updatedDomains,
      existing.totalInteractions + 1,
      existing.recentConversationSummaries,
    )
    this.continuityStore.set(userId, {
      ...updated,
      inactivityDays: detectInactivity(existing.lastInteractionAt),
    })
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a new MemoryStore instance.
 * Use this in tests and in production runtime initialization.
 */
export function createMemoryStore(policies?: Partial<MemoryPolicies>): MemoryStore {
  return new MemoryStore(policies ? { ...DEFAULT_MEMORY_POLICIES, ...policies } : DEFAULT_MEMORY_POLICIES)
}
