/**
 * NCIC Conversational Response Planner
 *
 * Given a fully assembled ConversationContext, produces a ResponsePlan.
 *
 * Rules:
 *   - Pure rule-based logic. No LLM. No randomness.
 *   - Same context → same plan, always.
 *   - The plan tells the LLM layer WHAT to do — not HOW to word it.
 *   - Intervention priority is derived from risk flags + intent confidence.
 *
 * This is NOT a prompt template generator.
 * This is NOT a response generator.
 * This is a routing + framing decision engine.
 */

import type { ConversationContext } from './types'
import type { ResponsePlan, ResponseStrategy, InterventionPriority } from './types'
import type { CapabilityId } from '../intents/capabilities'
import { INTENT_NAMES } from '../intents/types'

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Plan a conversational response given an assembled ConversationContext.
 *
 * @example
 * const plan = planConversationalResponse(context)
 * // plan.responseStrategy → 'coach'
 * // plan.capabilitiesToInvoke → ['nutrition.ingest']
 * // plan.primaryGoal → 'Confirm the food log and acknowledge progress'
 * // plan.interventionPriority → 'normal'
 */
export function planConversationalResponse(context: ConversationContext): ResponsePlan {
  const { intent, runtimeSignals, riskFlags, responseMode, suggestedCapabilities, classification } = context

  const strategy = selectResponseStrategy(context)
  const primaryGoal = buildPrimaryGoal(context, strategy)
  const capabilitiesToInvoke = orderCapabilities(suggestedCapabilities, intent.name, runtimeSignals)
  const followUpQuestions = buildFollowUpQuestions(context, strategy)
  const interventionPriority = deriveInterventionPriority(riskFlags, classification.primaryIntent.confidenceLevel)
  const planningRationale = buildRationale(context, strategy, interventionPriority)

  return {
    primaryGoal,
    tone: responseMode,
    responseStrategy: strategy,
    capabilitiesToInvoke,
    followUpQuestions,
    interventionPriority,
    planningRationale,
  }
}

// ─── Strategy Selection ───────────────────────────────────────────────────────

/**
 * Select response strategy from context.
 *
 * Priority ladder:
 *   1. clarification mode → clarify
 *   2. unknown intent → ask
 *   3. risk flags (overtraining / high stress) → ask (validate before coaching)
 *   4. intent-driven strategy
 *   5. fallback → coach
 */
function selectResponseStrategy(ctx: ConversationContext): ResponseStrategy {
  const { responseMode, intent, riskFlags, classification } = ctx

  if (responseMode === 'clarification') return 'clarify'

  if (intent.name === INTENT_NAMES.UNKNOWN || classification.fallbackNeeded) return 'ask'

  if (riskFlags.includes('overtraining') || riskFlags.includes('high_stress')) return 'ask'

  const strategyMap: Partial<Record<string, ResponseStrategy>> = {
    food_log: 'coach',
    meal_analysis: 'summarize',
    training_reference: 'summarize',
    recovery_reflection: 'ask',
    behavioral_reflection: 'ask',
    goal_update: 'coach',
    progress_check: 'summarize',
    coach_question: 'educate',
    casual_conversation: 'motivate',
  }

  return strategyMap[intent.name] ?? 'coach'
}

// ─── Primary Goal ─────────────────────────────────────────────────────────────

function buildPrimaryGoal(ctx: ConversationContext, strategy: ResponseStrategy): string {
  const { intent, runtimeSignals, riskFlags } = ctx

  if (riskFlags.includes('unknown_intent')) {
    return 'Understand what the user needs before attempting a response'
  }

  if (riskFlags.includes('overtraining')) {
    return 'Address elevated training load and validate recovery status before giving advice'
  }

  if (riskFlags.includes('high_stress')) {
    return 'Acknowledge stress signals and offer supportive, low-demand interaction'
  }

  const goalMap: Partial<Record<string, string>> = {
    food_log: runtimeSignals.nutritionComplete
      ? 'Acknowledge the food log and surface nutritional insight'
      : 'Confirm the food log entry and encourage completing daily nutrition tracking',
    meal_analysis: 'Analyze the described meal and surface macro/calorie breakdown',
    training_reference: runtimeSignals.recoveryStatus === 'poor'
      ? 'Acknowledge the training session and flag recovery concern'
      : 'Contextualize the training session within today\'s performance picture',
    recovery_reflection: runtimeSignals.recoveryStatus === 'poor'
      ? 'Explore the fatigue signal and guide towards a recovery decision'
      : 'Reflect on recovery status and validate the user\'s perception',
    behavioral_reflection: 'Explore the behavioral/emotional signal and surface relevant patterns',
    goal_update: 'Confirm or update the goal and provide a realistic coaching framework',
    progress_check: 'Summarize progress toward active goals with honest, data-driven framing',
    coach_question: 'Answer the coaching question with actionable, evidence-based guidance',
    casual_conversation: 'Maintain engagement, acknowledge the user, and create a warm touchpoint',
  }

  return goalMap[intent.name] ?? 'Understand and address the user\'s request'
}

// ─── Capability Ordering ──────────────────────────────────────────────────────

/**
 * Order capabilities for invocation.
 * Core domain capabilities first, conversation.respond always last.
 */
function orderCapabilities(
  capabilities: CapabilityId[],
  _intentName: string,
  _signals: ConversationContext['runtimeSignals'],
): CapabilityId[] {
  const conversationRespond: CapabilityId = 'conversation.respond'
  const others = capabilities.filter((c) => c !== conversationRespond)
  const hasConversationRespond = capabilities.includes(conversationRespond)
  return hasConversationRespond ? [...others, conversationRespond] : others
}

// ─── Follow-Up Questions ──────────────────────────────────────────────────────

/**
 * Generate contextually appropriate follow-up questions.
 * Only for ask/clarify strategies — empty otherwise.
 */
function buildFollowUpQuestions(ctx: ConversationContext, strategy: ResponseStrategy): string[] {
  if (strategy !== 'ask' && strategy !== 'clarify') return []

  const { intent, runtimeSignals, riskFlags } = ctx

  if (riskFlags.includes('unknown_intent')) {
    return [
      'Czego szukasz dzisiaj? (What are you looking for today?)',
      'Czy chcesz zalogować jedzenie, trening, czy porozmawiać o czymś innym?',
    ]
  }

  if (riskFlags.includes('overtraining')) {
    return [
      'Jak się teraz czujesz po treningu?',
      'Czy masz zaplanowany odpoczynek na jutro?',
    ]
  }

  if (riskFlags.includes('high_stress')) {
    return [
      'Co jest głównym źródłem stresu dzisiaj?',
      'Czy chcesz porozmawiać o tym, jak to wpływa na twój trening?',
    ]
  }

  if (intent.name === INTENT_NAMES.RECOVERY_REFLECTION) {
    return [
      runtimeSignals.sleepHours !== null
        ? `Widzę ${runtimeSignals.sleepHours}h snu — jak się czujesz po przebudzeniu?`
        : 'Ile godzin spałeś ostatniej nocy?',
      'Czy ból mięśni przeszkadza ci w normalnym funkcjonowaniu?',
    ]
  }

  if (intent.name === INTENT_NAMES.BEHAVIORAL_REFLECTION) {
    return [
      'Co najbardziej wpłynęło na twój nastrój dzisiaj?',
      'Czy to jest jednorazowe, czy wzorzec, który widzisz od jakiegoś czasu?',
    ]
  }

  return []
}

// ─── Intervention Priority ────────────────────────────────────────────────────

function deriveInterventionPriority(
  riskFlags: ConversationContext['riskFlags'],
  confidenceLevel: ConversationContext['confidence'],
): InterventionPriority {
  // Critical: overtraining or high stress must be addressed now
  if (riskFlags.includes('overtraining') || riskFlags.includes('high_stress')) {
    return 'critical'
  }

  // High: low energy or low confidence on important topic
  if (riskFlags.includes('low_energy')) {
    return 'high'
  }

  // Normal: incomplete context but not dangerous
  if (riskFlags.includes('incomplete_context') || riskFlags.includes('unknown_intent')) {
    return 'normal'
  }

  // Low: clear intent, no risk flags, high confidence
  if (confidenceLevel === 'high' && riskFlags.length === 0) {
    return 'low'
  }

  return 'normal'
}

// ─── Planning Rationale ───────────────────────────────────────────────────────

function buildRationale(
  ctx: ConversationContext,
  strategy: ResponseStrategy,
  priority: InterventionPriority,
): string {
  const { intent, responseMode, riskFlags } = ctx
  const flagStr = riskFlags.length > 0 ? ` risk=[${riskFlags.join(',')}]` : ''
  return (
    `intent=${intent.name}(${intent.confidenceLevel}) ` +
    `mode=${responseMode} strategy=${strategy} priority=${priority}${flagStr}`
  )
}
