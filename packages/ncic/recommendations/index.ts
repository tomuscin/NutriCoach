/**
 * NCIC Recommendations — Public API
 *
 * Exports all types and functions for the recommendation layer.
 * Consumed by: intervention runtime, conversation context, apps/web API routes.
 */

// Types
export type {
  CanonicalRecommendation,
  RecommendationPriority,
  RecommendationDomain,
  RecommendationTypeName,
  RecommendationEngineInput,
  RecommendationRuleResult,
  UserTargets,
} from './types'

// Engine
export {
  generateRecommendations,
  getRegisteredRuleTypes,
  RULE_COUNT,
} from './engine'

export type { RecommendationEngineOutput } from './engine'
