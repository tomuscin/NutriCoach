/**
 * NCIC Runtime — package entrypoint
 */

export { RuntimeEventBus, runtimeEventBus, emitEvent, subscribe, unsubscribe } from './bus'
export { getRuntimeState, registerRuntimeFlowHandlers, clearRuntimeState } from './flow'
export { createEmptySnapshot } from './state'
export type { RuntimeContextSnapshot, NutritionRuntimeState, TrainingRuntimeState, RecoveryRuntimeState, BehavioralRuntimeState, ConversationRuntimeState } from './state'
export { buildRuntimeContextHint, processConversationalTurn } from './intent-integration'
export type { ConversationalTurnResult } from './intent-integration'
