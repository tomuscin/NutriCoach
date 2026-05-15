/**
 * NCIC Runtime State
 *
 * Minimal runtime state model — a snapshot of what the conversational runtime
 * knows about a user RIGHT NOW. Updated as signals arrive.
 *
 * This is NOT persisted in DB directly. It's the in-memory working state
 * that the runtime uses to generate context for conversations.
 *
 * Future: this becomes the input to NCIC context assembly (ETAP 5).
 */

import type { NutritionSignalData, TrainingSignalData, RecoverySignalData, BehavioralSignalData } from '../signals/types'

// ─── Runtime Context Snapshot ─────────────────────────────────────────────────

export interface RuntimeContextSnapshot {
  userId: string
  /** ISO date this snapshot covers */
  date: string
  /** ISO timestamp of last update */
  updatedAt: string

  /** Latest normalized nutrition state for the day */
  nutrition: NutritionRuntimeState | null
  /** Latest normalized training state for the day */
  training: TrainingRuntimeState | null
  /** Latest normalized recovery state */
  recovery: RecoveryRuntimeState | null
  /** Latest behavioral/mood state */
  behavioral: BehavioralRuntimeState | null
  /** Active conversation context */
  conversation: ConversationRuntimeState | null
}

export interface NutritionRuntimeState extends NutritionSignalData {
  lastUpdated: string
  /** Daily calorie target (set from user profile) */
  dailyCalorieTarget?: number
  /** Remaining calories for the day */
  remainingCalories?: number
}

export interface TrainingRuntimeState extends TrainingSignalData {
  lastUpdated: string
  /** TSS accumulated today */
  dailyTss?: number
}

export interface RecoveryRuntimeState extends RecoverySignalData {
  lastUpdated: string
}

export interface BehavioralRuntimeState extends BehavioralSignalData {
  lastUpdated: string
}

export interface ConversationRuntimeState {
  activeConversationId: string | null
  sessionType: string | null
  startedAt: string | null
}

// ─── Empty Snapshot Factory ───────────────────────────────────────────────────

export function createEmptySnapshot(userId: string, date: string): RuntimeContextSnapshot {
  return {
    userId,
    date,
    updatedAt: new Date().toISOString(),
    nutrition: null,
    training: null,
    recovery: null,
    behavioral: null,
    conversation: null,
  }
}
