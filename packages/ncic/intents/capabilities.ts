/**
 * NCIC Capability Registry
 *
 * Defines the canonical capability identifiers and their metadata.
 * Capabilities are what the runtime CAN DO in response to an intent.
 *
 * This is NOT an implementation registry — capabilities are fulfilled
 * by separate packages/modules. This registry just names and describes them.
 *
 * Intent → Capability mapping is 1:many.
 * Multiple intents may share capabilities (e.g., conversation.respond).
 */

import type { IntentName } from './types'
import { INTENT_NAMES } from './types'

// ─── Capability Identifier ────────────────────────────────────────────────────

export type CapabilityId =
  | 'nutrition.ingest'        // Accept and store food log entries
  | 'nutrition.analyze'       // Analyze nutritional content of a meal
  | 'training.contextualize'  // Add training context to conversation
  | 'recovery.reflect'        // Surface recovery metrics and insights
  | 'behavior.reflect'        // Surface behavioral/mood patterns
  | 'goals.update'            // Create or update user goals
  | 'analytics.summarize'     // Generate progress/trend summaries
  | 'coaching.advise'         // Provide coaching recommendations
  | 'conversation.respond'    // Generate a conversational response

// ─── Capability Definition ────────────────────────────────────────────────────

export interface CapabilityDefinition {
  id: CapabilityId
  description: string
  /** Whether this capability requires LLM involvement */
  requiresLlm: boolean
  /** Domain it operates in */
  domain: 'nutrition' | 'training' | 'recovery' | 'behavioral' | 'goals' | 'analytics' | 'conversation'
}

export const CAPABILITY_REGISTRY: Record<CapabilityId, CapabilityDefinition> = {
  'nutrition.ingest': {
    id: 'nutrition.ingest',
    description: 'Accept user food log input and emit FoodLoggedEvent',
    requiresLlm: false,
    domain: 'nutrition',
  },
  'nutrition.analyze': {
    id: 'nutrition.analyze',
    description: 'Analyze macronutrient content of a described meal',
    requiresLlm: true,
    domain: 'nutrition',
  },
  'training.contextualize': {
    id: 'training.contextualize',
    description: 'Retrieve and contextualize recent training data for conversation',
    requiresLlm: false,
    domain: 'training',
  },
  'recovery.reflect': {
    id: 'recovery.reflect',
    description: 'Surface recovery metrics and readiness insights',
    requiresLlm: false,
    domain: 'recovery',
  },
  'behavior.reflect': {
    id: 'behavior.reflect',
    description: 'Surface behavioral signals, mood trends, and energy patterns',
    requiresLlm: false,
    domain: 'behavioral',
  },
  'goals.update': {
    id: 'goals.update',
    description: 'Create, update, or review user goals',
    requiresLlm: false,
    domain: 'goals',
  },
  'analytics.summarize': {
    id: 'analytics.summarize',
    description: 'Generate progress summaries and trend analysis',
    requiresLlm: false,
    domain: 'analytics',
  },
  'coaching.advise': {
    id: 'coaching.advise',
    description: 'Generate personalized coaching recommendations',
    requiresLlm: true,
    domain: 'conversation',
  },
  'conversation.respond': {
    id: 'conversation.respond',
    description: 'Generate a conversational response to the user',
    requiresLlm: true,
    domain: 'conversation',
  },
}

// ─── Capability Routing Map ───────────────────────────────────────────────────

/**
 * Canonical intent → capability mapping.
 * Single source of truth for routing — registry.ts keywords inform detection,
 * this map determines what the runtime should DO.
 */
export const CAPABILITY_ROUTING: Record<IntentName, CapabilityId[]> = {
  [INTENT_NAMES.FOOD_LOG]: ['nutrition.ingest'],
  [INTENT_NAMES.MEAL_ANALYSIS]: ['nutrition.analyze'],
  [INTENT_NAMES.TRAINING_REFERENCE]: ['training.contextualize'],
  [INTENT_NAMES.RECOVERY_REFLECTION]: ['recovery.reflect'],
  [INTENT_NAMES.BEHAVIORAL_REFLECTION]: ['behavior.reflect'],
  [INTENT_NAMES.GOAL_UPDATE]: ['goals.update'],
  [INTENT_NAMES.PROGRESS_CHECK]: ['analytics.summarize'],
  [INTENT_NAMES.COACH_QUESTION]: ['conversation.respond', 'coaching.advise'],
  [INTENT_NAMES.CASUAL_CONVERSATION]: ['conversation.respond'],
  [INTENT_NAMES.UNKNOWN]: ['conversation.respond'],
}

/**
 * Resolve capabilities for a set of intents.
 * Returns deduplicated, ordered list of capability IDs.
 */
export function resolveCapabilities(intents: IntentName[]): CapabilityId[] {
  const seen = new Set<CapabilityId>()
  for (const intent of intents) {
    for (const cap of CAPABILITY_ROUTING[intent] ?? []) {
      seen.add(cap)
    }
  }
  return Array.from(seen)
}

/**
 * Check if any of the resolved capabilities require LLM.
 */
export function requiresLlm(capabilities: CapabilityId[]): boolean {
  return capabilities.some((cap) => CAPABILITY_REGISTRY[cap]?.requiresLlm)
}
