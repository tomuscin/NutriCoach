/**
 * NCIC Anti-Annoyance System — ETAP 5.4
 *
 * Lexaro must never be annoying.
 *
 * This module enforces:
 *   - Per-user suppression windows (don't show same type twice within N hours)
 *   - Recommendation fatigue tracking (user is being shown too many interventions)
 *   - Low-priority hiding (don't show low/silent in certain contexts)
 *   - Session rate limiting (max N interventions per session)
 *   - Repeated recommendation suppression (same rec seen > N times without action)
 *
 * All state is in-memory. Pure functions — no side effects beyond state mutation.
 * State is deliberately NOT persisted in this layer (ETAP 5.4 scope).
 */

import type { CanonicalRecommendation, RecommendationPriority, RecommendationTypeName } from '../recommendations/types'

// ─── Anti-Annoyance Policies ─────────────────────────────────────────────────

export interface AntiAnnoyancePolicies {
  /** Max interventions to show in a single conversation session */
  maxPerSession: number
  /** Max interventions to show in a single reactive turn */
  maxPerTurn: number
  /** How many times the same recommendation type can appear before suppression */
  maxRepeatsBeforeSuppression: number
  /** Minimum priority to show in reactive (user-initiated) mode */
  minPriorityReactive: RecommendationPriority
  /** Minimum priority to show in proactive (coach-initiated) mode */
  minPriorityProactive: RecommendationPriority
  /** Hours before a suppressed recommendation can re-surface */
  suppressionWindowHours: number
  /** Cumulative interventions in N hours before fatigue kicks in */
  fatigueThreshold: number
  /** Hours over which fatigue is measured */
  fatigueWindowHours: number
}

export const DEFAULT_ANTI_ANNOYANCE_POLICIES: AntiAnnoyancePolicies = {
  maxPerSession: 3,
  maxPerTurn: 2,
  maxRepeatsBeforeSuppression: 3,
  minPriorityReactive: 'low',
  minPriorityProactive: 'medium',
  suppressionWindowHours: 6,
  fatigueThreshold: 5,
  fatigueWindowHours: 24,
}

// ─── Anti-Annoyance State ─────────────────────────────────────────────────────

/**
 * Per-user in-memory state for the anti-annoyance system.
 * Managed by AntiAnnoyanceStore.
 */
export interface AntiAnnoyanceState {
  userId: string
  /** ISO timestamps of when each recommendation type was last shown */
  lastShownAt: Partial<Record<RecommendationTypeName, string>>
  /** Number of times each recommendation type has been shown total */
  showCount: Partial<Record<RecommendationTypeName, number>>
  /** ISO timestamps of all interventions shown in the current session */
  sessionInterventionTimestamps: string[]
  /** Total interventions shown across all recent sessions (within fatigueWindowHours) */
  recentInterventionTimestamps: string[]
  /** Whether user is currently in a fatigue state */
  inFatigue: boolean
}

// ─── State Factory ────────────────────────────────────────────────────────────

export function createEmptyAntiAnnoyanceState(userId: string): AntiAnnoyanceState {
  return {
    userId,
    lastShownAt: {},
    showCount: {},
    sessionInterventionTimestamps: [],
    recentInterventionTimestamps: [],
    inFatigue: false,
  }
}

// ─── Priority Ordering ────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<RecommendationPriority, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  silent: 1,
}

function meetsMinPriority(
  priority: RecommendationPriority,
  minPriority: RecommendationPriority,
): boolean {
  return PRIORITY_ORDER[priority] >= PRIORITY_ORDER[minPriority]
}

// ─── Suppression Window Check ─────────────────────────────────────────────────

/**
 * Returns true if this recommendation type was shown recently enough to suppress.
 * Critical priority bypasses suppression windows.
 */
export function isInSuppressionWindow(
  type: RecommendationTypeName,
  priority: RecommendationPriority,
  state: AntiAnnoyanceState,
  policies: AntiAnnoyancePolicies = DEFAULT_ANTI_ANNOYANCE_POLICIES,
): boolean {
  if (priority === 'critical') return false // critical always bypasses

  const lastShown = state.lastShownAt[type]
  if (!lastShown) return false

  const windowMs = policies.suppressionWindowHours * 3600 * 1000
  return Date.now() - new Date(lastShown).getTime() < windowMs
}

// ─── Repeat Suppression ───────────────────────────────────────────────────────

/**
 * Returns true if this recommendation type has been shown too many times.
 * High/critical bypass repeat suppression.
 */
export function isRepeatedlySuppressed(
  type: RecommendationTypeName,
  priority: RecommendationPriority,
  state: AntiAnnoyanceState,
  policies: AntiAnnoyancePolicies = DEFAULT_ANTI_ANNOYANCE_POLICIES,
): boolean {
  if (priority === 'critical' || priority === 'high') return false
  const count = state.showCount[type] ?? 0
  return count >= policies.maxRepeatsBeforeSuppression
}

// ─── Fatigue Detection ────────────────────────────────────────────────────────

/**
 * Compute whether the user is currently in recommendation fatigue.
 * Fatigue = too many interventions shown in the recent window.
 */
export function computeFatigue(
  state: AntiAnnoyanceState,
  policies: AntiAnnoyancePolicies = DEFAULT_ANTI_ANNOYANCE_POLICIES,
): boolean {
  const cutoff = Date.now() - policies.fatigueWindowHours * 3600 * 1000
  const recentCount = state.recentInterventionTimestamps.filter(
    (ts) => new Date(ts).getTime() > cutoff,
  ).length
  return recentCount >= policies.fatigueThreshold
}

// ─── Session Rate Limit ───────────────────────────────────────────────────────

/**
 * Returns true if the session has already shown the max number of interventions.
 */
export function sessionLimitReached(
  state: AntiAnnoyanceState,
  policies: AntiAnnoyancePolicies = DEFAULT_ANTI_ANNOYANCE_POLICIES,
): boolean {
  return state.sessionInterventionTimestamps.length >= policies.maxPerSession
}

// ─── Priority Filter ──────────────────────────────────────────────────────────

/**
 * Returns true if this recommendation priority is too low to show in the given mode.
 * Fatigue state raises the minimum priority bar.
 */
export function priorityTooLow(
  priority: RecommendationPriority,
  mode: 'reactive' | 'proactive',
  state: AntiAnnoyanceState,
  policies: AntiAnnoyancePolicies = DEFAULT_ANTI_ANNOYANCE_POLICIES,
): boolean {
  const inFatigue = computeFatigue(state, policies)

  if (inFatigue) {
    // In fatigue, only critical and high pass through
    return !meetsMinPriority(priority, 'high')
  }

  const minPriority = mode === 'reactive'
    ? policies.minPriorityReactive
    : policies.minPriorityProactive

  return !meetsMinPriority(priority, minPriority)
}

// ─── Main Suppression Evaluation ─────────────────────────────────────────────

export interface SuppressionResult {
  suppressed: boolean
  reason: string | null
}

/**
 * Evaluate whether a recommendation should be suppressed.
 * Returns the reason for suppression if suppressed.
 *
 * Suppression hierarchy (in order):
 *   1. Priority too low for mode
 *   2. Session limit reached (unless critical)
 *   3. Suppression window (unless critical)
 *   4. Repeated suppression (unless critical/high)
 */
export function evaluateSuppression(
  rec: CanonicalRecommendation,
  mode: 'reactive' | 'proactive',
  state: AntiAnnoyanceState,
  policies: AntiAnnoyancePolicies = DEFAULT_ANTI_ANNOYANCE_POLICIES,
): SuppressionResult {
  // 1. Priority filter
  if (priorityTooLow(rec.priority, mode, state, policies)) {
    return { suppressed: true, reason: 'priority-too-low' }
  }

  // 2. Session limit (critical bypasses)
  if (rec.priority !== 'critical' && sessionLimitReached(state, policies)) {
    return { suppressed: true, reason: 'session-limit' }
  }

  // 3. Suppression window
  if (isInSuppressionWindow(rec.type, rec.priority, state, policies)) {
    return { suppressed: true, reason: 'suppression-window' }
  }

  // 4. Repeated suppression
  if (isRepeatedlySuppressed(rec.type, rec.priority, state, policies)) {
    return { suppressed: true, reason: 'repeat-suppression' }
  }

  return { suppressed: false, reason: null }
}

// ─── State Update ─────────────────────────────────────────────────────────────

/**
 * Record that a recommendation was shown.
 * Updates all counters and timestamps in the state.
 * Pure: returns a new state object, does not mutate.
 */
export function recordShown(
  type: RecommendationTypeName,
  state: AntiAnnoyanceState,
  timestamp: string = new Date().toISOString(),
): AntiAnnoyanceState {
  const prevCount = state.showCount[type] ?? 0
  return {
    ...state,
    lastShownAt: { ...state.lastShownAt, [type]: timestamp },
    showCount: { ...state.showCount, [type]: prevCount + 1 },
    sessionInterventionTimestamps: [...state.sessionInterventionTimestamps, timestamp],
    recentInterventionTimestamps: [...state.recentInterventionTimestamps, timestamp],
    inFatigue: false, // recomputed on next evaluateSuppression call
  }
}

/**
 * Reset the session-scoped counters (call at session start).
 * Does NOT reset fatigue window (spans multiple sessions).
 */
export function resetSession(state: AntiAnnoyanceState): AntiAnnoyanceState {
  return {
    ...state,
    sessionInterventionTimestamps: [],
  }
}

/**
 * Purge old timestamps from the fatigue window (housekeeping).
 */
export function pruneStaleTimestamps(
  state: AntiAnnoyanceState,
  policies: AntiAnnoyancePolicies = DEFAULT_ANTI_ANNOYANCE_POLICIES,
): AntiAnnoyanceState {
  const cutoff = Date.now() - policies.fatigueWindowHours * 3600 * 1000
  return {
    ...state,
    recentInterventionTimestamps: state.recentInterventionTimestamps.filter(
      (ts) => new Date(ts).getTime() > cutoff,
    ),
  }
}

// ─── Anti-Annoyance Store ─────────────────────────────────────────────────────

/**
 * In-process store for per-user anti-annoyance state.
 * Keyed by userId. Not persisted.
 */
export class AntiAnnoyanceStore {
  private store = new Map<string, AntiAnnoyanceState>()
  private policies: AntiAnnoyancePolicies

  constructor(policies: Partial<AntiAnnoyancePolicies> = {}) {
    this.policies = { ...DEFAULT_ANTI_ANNOYANCE_POLICIES, ...policies }
  }

  getState(userId: string): AntiAnnoyanceState {
    if (!this.store.has(userId)) {
      this.store.set(userId, createEmptyAntiAnnoyanceState(userId))
    }
    return this.store.get(userId)!
  }

  recordShown(userId: string, type: RecommendationTypeName, timestamp?: string): void {
    const state = this.getState(userId)
    this.store.set(userId, recordShown(type, state, timestamp))
  }

  resetSession(userId: string): void {
    const state = this.getState(userId)
    this.store.set(userId, resetSession(state))
  }

  pruneStale(userId: string): void {
    const state = this.getState(userId)
    this.store.set(userId, pruneStaleTimestamps(state, this.policies))
  }

  getPolicies(): AntiAnnoyancePolicies {
    return this.policies
  }

  clearUser(userId: string): void {
    this.store.delete(userId)
  }

  clearAll(): void {
    this.store.clear()
  }
}

export function createAntiAnnoyanceStore(
  policies?: Partial<AntiAnnoyancePolicies>,
): AntiAnnoyanceStore {
  return new AntiAnnoyanceStore(policies)
}
