/**
 * NCIC Intervention Runtime — ETAP 5.4
 *
 * Takes the output of the Recommendation Engine and decides:
 *   - WHAT to surface (ranking + selection)
 *   - WHEN to surface it (timing)
 *   - HOW to display it (display mode)
 *   - Whether to suppress it (anti-annoyance)
 *
 * Architecture:
 *   Recommendation Engine → [generates candidates]
 *   Intervention Runtime  → [ranks, filters, applies anti-annoyance, returns active set]
 *
 * Rules:
 *   - Critical recommendations always surface (bypass anti-annoyance limits)
 *   - High recommendations surface in reactive mode if not in suppression window
 *   - Medium recommendations surface only if session budget allows
 *   - Low/silent recommendations go to dashboard-only or silent
 *   - Max N interventions per turn (configurable, default 2)
 */

import type { CanonicalRecommendation, RecommendationPriority } from '../recommendations/types'
import type {
  RuntimeIntervention,
  InterventionContext,
  InterventionRuntimeOutput,
  DisplayMode,
  InterruptionLevel,
  InterventionTiming,
} from './types'
import {
  evaluateSuppression,
  recordShown,
  DEFAULT_ANTI_ANNOYANCE_POLICIES,
  type AntiAnnoyanceState,
  type AntiAnnoyancePolicies,
} from './anti-annoyance'

// ─── Display Mode Resolution ──────────────────────────────────────────────────

/**
 * Determine the display mode for a recommendation given context.
 */
function resolveDisplayMode(
  rec: CanonicalRecommendation,
  mode: 'reactive' | 'proactive',
): DisplayMode {
  if (rec.priority === 'silent') return 'silent'
  if (rec.priority === 'low') return mode === 'reactive' ? 'dashboard-only' : 'silent'
  if (rec.priority === 'critical') return mode === 'proactive' ? 'proactive' : 'inline'
  if (rec.priority === 'high') return mode === 'proactive' ? 'proactive' : 'inline'
  return mode === 'proactive' ? 'proactive' : 'inline'
}

// ─── Interruption Level Resolution ───────────────────────────────────────────

function resolveInterruptionLevel(
  rec: CanonicalRecommendation,
  suppressed: boolean,
): InterruptionLevel {
  if (suppressed) return 'none'
  switch (rec.priority) {
    case 'critical': return 'urgent'
    case 'high': return 'assertive'
    case 'medium': return 'soft'
    case 'low': return 'passive'
    case 'silent': return 'none'
  }
}

// ─── Timing Resolution ───────────────────────────────────────────────────────

function resolveTiming(
  rec: CanonicalRecommendation,
  mode: 'reactive' | 'proactive',
  suppressed: boolean,
): InterventionTiming {
  if (suppressed) return 'never'
  if (rec.priority === 'critical') return 'now'
  if (rec.priority === 'high') return mode === 'reactive' ? 'end-of-turn' : 'now'
  if (rec.priority === 'medium') return mode === 'proactive' ? 'now' : 'end-of-turn'
  return 'deferred'
}

// ─── Reasoning Generation ─────────────────────────────────────────────────────

function buildReasoning(
  rec: CanonicalRecommendation,
  suppressed: boolean,
  suppressionReason: string | null,
  mode: 'reactive' | 'proactive',
): string {
  if (suppressed) {
    const reasonMap: Record<string, string> = {
      'priority-too-low': `priority "${rec.priority}" below threshold for ${mode} mode`,
      'session-limit': 'session intervention limit reached',
      'suppression-window': 'recently shown — in suppression window',
      'repeat-suppression': 'shown too many times without user action',
    }
    return `Suppressed: ${reasonMap[suppressionReason ?? ''] ?? suppressionReason ?? 'unknown reason'}`
  }
  return `Surfaced: ${rec.priority} priority, score=${rec.score.toFixed(3)}, mode=${mode}, signals=[${rec.sourceSignals.join(', ')}]`
}

// ─── Intervention Builder ─────────────────────────────────────────────────────

function buildIntervention(
  rec: CanonicalRecommendation,
  rank: number,
  mode: 'reactive' | 'proactive',
  suppressed: boolean,
  suppressionReason: string | null,
): RuntimeIntervention {
  const displayMode = suppressed ? 'silent' : resolveDisplayMode(rec, mode)
  const timing = resolveTiming(rec, mode, suppressed)
  const interruptionLevel = resolveInterruptionLevel(rec, suppressed)
  const shouldDisplayNow =
    !suppressed &&
    (timing === 'now' || timing === 'end-of-turn') &&
    displayMode !== 'silent' &&
    displayMode !== 'dashboard-only'

  return {
    recommendation: rec,
    priority: rec.priority,
    displayMode,
    timing,
    interruptionLevel,
    reasoning: buildReasoning(rec, suppressed, suppressionReason, mode),
    shouldDisplayNow,
    rank,
  }
}

// ─── Priority Boost ───────────────────────────────────────────────────────────

/**
 * Boost priority of a recommendation if it aligns with the current user intent.
 * Intent-aligned recommendations are more relevant RIGHT NOW.
 */
function applyIntentBoost(
  recs: CanonicalRecommendation[],
  currentIntent: string | null | undefined,
): CanonicalRecommendation[] {
  if (!currentIntent) return recs

  const PRIORITY_BOOST: Partial<Record<RecommendationPriority, RecommendationPriority>> = {
    low: 'medium',
    medium: 'high',
  }

  return recs.map((rec) => {
    const aligned = rec.relatedIntent === currentIntent
    if (!aligned) return rec
    const boostedPriority = PRIORITY_BOOST[rec.priority] ?? rec.priority
    return { ...rec, priority: boostedPriority }
  })
}

// ─── Main Runtime Function ────────────────────────────────────────────────────

/**
 * Run the intervention runtime.
 *
 * Takes a sorted list of recommendations (from the engine) and returns
 * ranked interventions with suppression applied.
 *
 * The caller is responsible for updating the anti-annoyance state
 * by calling recordShown() for each intervention that is actually displayed.
 *
 * @param recommendations - Sorted candidates from the recommendation engine
 * @param context - Intervention context (mode, intent, annoyance state)
 * @param policies - Anti-annoyance policies (optional, uses defaults)
 */
export function rankInterventions(
  recommendations: CanonicalRecommendation[],
  context: InterventionContext,
  policies: AntiAnnoyancePolicies = DEFAULT_ANTI_ANNOYANCE_POLICIES,
): InterventionRuntimeOutput {
  const { mode, currentIntent, annoyanceState, maxInterventions } = context
  const maxPerTurn = maxInterventions ?? policies.maxPerTurn

  // Apply intent boost before ranking
  const boosted = applyIntentBoost(recommendations, currentIntent)

  // Re-sort after boost (scores unchanged, but priority may have changed)
  const sorted = [...boosted].sort((a, b) => {
    const priorityDiff =
      PRIORITY_RANK[b.priority as RecommendationPriority] -
      PRIORITY_RANK[a.priority as RecommendationPriority]
    if (priorityDiff !== 0) return priorityDiff
    return b.score - a.score
  })

  const allInterventions: RuntimeIntervention[] = []
  let activeCount = 0
  let suppressedCount = 0
  let annoyanceFiltered = false

  // Track how many non-critical we've shown this turn
  let turnCount = 0

  for (let i = 0; i < sorted.length; i++) {
    const rec = sorted[i]

    // Non-critical recommendations are capped per turn
    const turncapped =
      rec.priority !== 'critical' && turnCount >= maxPerTurn

    let suppressed = false
    let suppressionReason: string | null = null

    if (turncapped) {
      suppressed = true
      suppressionReason = 'session-limit'
      annoyanceFiltered = true
    } else {
      const result = evaluateSuppression(rec, mode, annoyanceState, policies)
      suppressed = result.suppressed
      suppressionReason = result.reason
      if (suppressed) annoyanceFiltered = true
    }

    const rank = i + 1
    const intervention = buildIntervention(rec, rank, mode, suppressed, suppressionReason)
    allInterventions.push(intervention)

    if (!suppressed) {
      activeCount++
      if (rec.priority !== 'critical') turnCount++
    } else {
      suppressedCount++
    }
  }

  const activeInterventions = allInterventions.filter((i) => i.shouldDisplayNow)

  return {
    allInterventions,
    activeInterventions,
    suppressedCount,
    annoyanceFiltered,
    processedAt: new Date().toISOString(),
  }
}

const PRIORITY_RANK: Record<RecommendationPriority, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  silent: 1,
}

// ─── State Update Helper ──────────────────────────────────────────────────────

/**
 * After displaying interventions, update the anti-annoyance state.
 * Call this for every intervention that was actually shown to the user.
 *
 * Returns the updated state.
 */
export function applyShownInterventions(
  interventions: RuntimeIntervention[],
  state: AntiAnnoyanceState,
  timestamp: string = new Date().toISOString(),
): AntiAnnoyanceState {
  let updated = state
  for (const intervention of interventions) {
    if (intervention.shouldDisplayNow) {
      updated = recordShown(intervention.recommendation.type, updated, timestamp)
    }
  }
  return updated
}

// ─── Utility: Filter by Domain ────────────────────────────────────────────────

/**
 * Filter active interventions to a specific domain.
 * Useful for domain-specific coaches.
 */
export function filterByDomain(
  output: InterventionRuntimeOutput,
  domain: CanonicalRecommendation['domain'],
): RuntimeIntervention[] {
  return output.activeInterventions.filter(
    (i) => i.recommendation.domain === domain,
  )
}

/**
 * Get the top N interventions from the active set.
 */
export function topN(output: InterventionRuntimeOutput, n: number): RuntimeIntervention[] {
  return output.activeInterventions.slice(0, n)
}
