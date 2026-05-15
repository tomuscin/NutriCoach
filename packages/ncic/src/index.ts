/**
 * NCIC — Nutrition Conversational Intelligence Core
 *
 * Foundation package for the Leaxaro Conversational Intelligence Platform.
 *
 * ETAP 2.5.1 — Minimal Event & Signals Foundation
 * ETAP 5.1   — Intent Classification Layer
 * ETAP 5.2   — Conversation Runtime Assembly
 *
 * See /docs/NCIC-FOUNDATION.md for architecture decisions.
 */

// ─── Runtime Event Taxonomy ───────────────────────────────────────────────────
export * from '../events/types'
export * from '../events/index'

// ─── Signal Normalization Layer ───────────────────────────────────────────────
export * from '../signals/types'
export * from '../signals/normalizer'

// ─── Intent Classification Layer ─────────────────────────────────────────────
export * from '../intents/types'
export * from '../intents/registry'
export { classifyIntent } from '../intents/classifier'
export * from '../intents/capabilities'
// Note: heuristics exported for testing — not part of primary public API
export { tokenize, matchKeywords, scoreAllIntents, needsFallback } from '../intents/heuristics'

// ─── Runtime Event Bus & Flow ─────────────────────────────────────────────────
export {
  RuntimeEventBus,
  runtimeEventBus,
  emitEvent,
  subscribe,
  unsubscribe,
} from '../runtime/bus'

export {
  getRuntimeState,
  registerRuntimeFlowHandlers,
  clearRuntimeState,
} from '../runtime/flow'

export {
  createEmptySnapshot,
} from '../runtime/state'

export {
  buildRuntimeContextHint,
  processConversationalTurn,
} from '../runtime/intent-integration'

export type {
  RuntimeContextSnapshot,
  NutritionRuntimeState,
  TrainingRuntimeState,
  RecoveryRuntimeState,
  BehavioralRuntimeState,
  ConversationRuntimeState,
} from '../runtime/state'

export type { ConversationalTurnResult } from '../runtime/intent-integration'

// ─── Conversation Runtime Layer (ETAP 5.2) ───────────────────────────────────
export { processConversationTurn } from '../conversation/runtime'
export type { ProcessConversationTurnInput } from '../conversation/runtime'

export {
  buildConversationContext,
  buildRuntimeSignalSummary,
  deriveRiskFlags,
  buildContinuityHints,
  selectResponseMode,
} from '../conversation/context-builder'
export type { BuildContextInput } from '../conversation/context-builder'

export { planConversationalResponse } from '../conversation/response-planner'

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
} from '../conversation/types'

// ─── Package Identity ─────────────────────────────────────────────────────────
export const NCIC_VERSION = '0.1.0'
export const NCIC_NAME = 'Nutrition Conversational Intelligence Core'

