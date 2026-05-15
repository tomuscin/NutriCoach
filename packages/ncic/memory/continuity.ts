/**
 * NCIC Conversation Continuity Engine — ETAP 5.3
 *
 * Generates continuity hints from memory state (episodes, short-term memory,
 * and cross-session continuity data).
 *
 * These hints are MEMORY-specific — they complement the runtime-signal hints
 * produced by context-builder.ts's buildContinuityHints().
 *
 * Design:
 *   - Pure/deterministic — no LLM, no IO
 *   - Reads from ShortTermMemory + EpisodicEvent[] + ContinuityState
 *   - Does NOT import from conversation/types (avoids circular deps)
 */

import type { ShortTermMemory, EpisodicEvent, ContinuityState, EpisodicEventType } from './types'

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build memory-derived continuity hints.
 *
 * Hint sources:
 *   1. Inactivity (from continuityState)
 *   2. Recent episodes (pattern detection)
 *   3. Unresolved topics (from short-term window)
 *   4. Last active domains (from continuity state)
 */
export function buildMemoryContinuityHints(
  shortTerm: ShortTermMemory | null,
  episodes: EpisodicEvent[],
  continuityState: ContinuityState,
): string[] {
  const hints: string[] = []

  // ── Inactivity ─────────────────────────────────────────────────────────────
  if (continuityState.inactivityDays !== null && continuityState.inactivityDays >= 2) {
    hints.push(
      `conversation resumed after ${continuityState.inactivityDays} day${continuityState.inactivityDays === 1 ? '' : 's'} of inactivity`,
    )
  }

  // ── Episode-based hints ────────────────────────────────────────────────────
  const seenTypes = new Set<EpisodicEventType>()
  for (const ep of episodes) {
    if (seenTypes.has(ep.type)) continue
    seenTypes.add(ep.type)

    switch (ep.type) {
      case 'low_recovery':
        hints.push('recovery worsening recently')
        break
      case 'overtraining_detected':
        hints.push('overtraining risk flagged recently')
        break
      case 'high_training_load':
        hints.push('high training load detected recently')
        break
      case 'pr_achieved':
        hints.push('recent personal record session')
        break
      case 'missed_nutrition':
        hints.push('nutrition goals missed recently')
        break
      case 'calorie_deficit_streak':
        hints.push('calorie deficit streak ongoing')
        break
      case 'nutrition_streak':
        hints.push('nutrition consistency high')
        break
      case 'training_streak':
        hints.push('training streak active')
        break
      case 'behavioral_drop':
        hints.push('energy or mood dropped recently')
        break
      case 'behavioral_recovery':
        hints.push('energy and mood recovering')
        break
      case 'inactivity':
        hints.push('user was recently inactive')
        break
      case 'goal_updated':
        hints.push('goal was recently updated')
        break
    }
  }

  // ── Unresolved topics ──────────────────────────────────────────────────────
  if (shortTerm?.unresolvedTopics?.length) {
    for (const topic of shortTerm.unresolvedTopics) {
      hints.push(`unresolved topic: ${topic}`)
    }
  }

  // ── Last active domains ────────────────────────────────────────────────────
  if (
    continuityState.lastActiveDomains.length > 0 &&
    continuityState.inactivityDays !== null &&
    continuityState.inactivityDays >= 1
  ) {
    const domainStr = continuityState.lastActiveDomains.join(', ')
    hints.push(`previously active in: ${domainStr}`)
  }

  // Deduplicate while preserving order
  return [...new Set(hints)]
}

/**
 * Build a ContinuityState from available data.
 */
export function buildContinuityState(
  userId: string,
  lastInteractionAt: string | null,
  lastActiveDomains: string[],
  totalInteractions: number,
  recentConversationSummaries: string[],
): ContinuityState {
  return {
    userId,
    lastInteractionAt,
    totalInteractions,
    lastActiveDomains,
    recentConversationSummaries,
    inactivityDays: detectInactivity(lastInteractionAt),
  }
}

/**
 * Create an empty continuity state for a new user.
 */
export function createEmptyContinuityState(userId: string): ContinuityState {
  return {
    userId,
    lastInteractionAt: null,
    totalInteractions: 0,
    lastActiveDomains: [],
    recentConversationSummaries: [],
    inactivityDays: null,
  }
}

/**
 * Calculate how many complete days have elapsed since the last interaction.
 * Returns null if no prior interaction.
 */
export function detectInactivity(lastInteractionAt: string | null): number | null {
  if (!lastInteractionAt) return null
  const last = new Date(lastInteractionAt)
  const now = new Date()
  const diffMs = now.getTime() - last.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}
