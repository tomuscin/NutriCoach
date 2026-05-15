/**
 * NCIC Interventions — Public API
 *
 * Exports all types and functions for the intervention layer.
 * Consumed by: apps/web API routes, conversation turn processor, proactive scheduler.
 */

// Types
export type {
  DisplayMode,
  InterruptionLevel,
  InterventionTiming,
  RuntimeIntervention,
  InterventionContext,
  InterventionRuntimeOutput,
} from './types'

// Anti-annoyance
export type {
  AntiAnnoyancePolicies,
  AntiAnnoyanceState,
} from './anti-annoyance'

export {
  DEFAULT_ANTI_ANNOYANCE_POLICIES,
  createEmptyAntiAnnoyanceState,
  isInSuppressionWindow,
  isRepeatedlySuppressed,
  computeFatigue,
  sessionLimitReached,
  priorityTooLow,
  evaluateSuppression,
  recordShown,
  resetSession,
  pruneStaleTimestamps,
  AntiAnnoyanceStore,
  createAntiAnnoyanceStore,
} from './anti-annoyance'

// Runtime
export {
  rankInterventions,
  applyShownInterventions,
  filterByDomain,
  topN,
} from './runtime'
