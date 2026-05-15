/**
 * NCIC Conversation Layer — Public API
 *
 * The conversation layer is the top-level orchestration layer of the NCIC runtime.
 * It sits above the intent classification and runtime signal layers.
 *
 * Primary pipeline entry point:
 *   processConversationTurn() — from conversation/runtime.ts
 *
 * Secondary utilities:
 *   buildConversationContext() — assemble context from parts
 *   planConversationalResponse() — plan from context
 */

// ─── Main Pipeline ────────────────────────────────────────────────────────────
export { processConversationTurn } from './runtime'
export type { ProcessConversationTurnInput } from './runtime'

// ─── Context Builder ──────────────────────────────────────────────────────────
export {
  buildConversationContext,
  buildRuntimeSignalSummary,
  deriveRiskFlags,
  buildContinuityHints,
  selectResponseMode,
} from './context-builder'
export type { BuildContextInput } from './context-builder'

// ─── Response Planner ─────────────────────────────────────────────────────────
export { planConversationalResponse } from './response-planner'

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  ConversationContext,
  ConversationTurnResult,
  ResponsePlan,
  ResponseMode,
  ResponseStrategy,
  RiskFlag,
  ContinuityHint,
  ActiveDomain,
  InterventionPriority,
  RuntimeSignalSummary,
} from './types'

// Re-export MemorySignals for consumers wiring the memory layer
export type { MemorySignals } from '../memory/types'
