/**
 * NCIC Recommendation Engine — ETAP 5.4
 *
 * Generates CanonicalRecommendations from runtime signals + memory.
 *
 * Architecture:
 *   - 22 deterministic rules (no LLM)
 *   - Each rule is a pure function: input → result | null
 *   - Engine runs ALL rules and collects results
 *   - Deduplication by type (no duplicates in one output)
 *   - Cooldown enforcement by type + date
 *   - Output sorted by score DESC (urgency * confidence * impact)
 *
 * NOT the Intervention Runtime — engine generates candidates.
 * The intervention runtime decides what to surface and when.
 */

import type {
  CanonicalRecommendation,
  RecommendationEngineInput,
  RecommendationRule,
  RecommendationRuleResult,
  RecommendationTypeName,
} from './types'

// ─── ID Generation ────────────────────────────────────────────────────────────

let _recIdCounter = 0
function generateRecId(): string {
  return `rec-${Date.now()}-${++_recIdCounter}`
}

// ─── Score Computation ────────────────────────────────────────────────────────

function computeScore(urgency: number, confidence: number, impact: number): number {
  return Math.round(urgency * confidence * impact * 1000) / 1000
}

function buildRecommendation(
  type: RecommendationTypeName,
  result: RecommendationRuleResult,
): CanonicalRecommendation {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + result.expiresInHours * 3600 * 1000).toISOString()
  return {
    id: generateRecId(),
    type,
    priority: result.priority,
    domain: result.domain,
    title: result.title,
    explanation: result.explanation,
    suggestedAction: result.suggestedAction,
    confidence: result.confidence,
    urgency: result.urgency,
    impact: result.impact,
    generatedAt: now.toISOString(),
    expiresAt,
    sourceSignals: result.sourceSignals,
    relatedIntent: result.relatedIntent,
    relatedMemory: result.relatedMemory,
    score: computeScore(result.urgency, result.confidence, result.impact),
  }
}

// ─── Cooldown Check ───────────────────────────────────────────────────────────

/**
 * Returns true if this recommendation type is in cooldown.
 * Checks recentEvents for the same type recorded within cooldownHours.
 */
function isInCooldown(
  type: RecommendationTypeName,
  cooldownHours: number,
  recentEvents: RecommendationEngineInput['recentEvents'],
): boolean {
  if (cooldownHours === 0) return false
  const cutoff = Date.now() - cooldownHours * 3600 * 1000
  // Map episodic event types to recommendation types for cooldown checking
  const EPISODE_TO_REC: Partial<Record<string, RecommendationTypeName>> = {
    low_recovery: 'poor_recovery_warning',
    overtraining_detected: 'overtraining_alert',
    high_training_load: 'high_training_load_notice',
    missed_nutrition: 'missed_meals',
    calorie_deficit_streak: 'calorie_deficit_streak_notice',
    nutrition_streak: 'nutrition_goal_met_positive',
    training_streak: 'training_streak_positive',
    behavioral_drop: 'behavioral_fatigue',
    behavioral_recovery: 'recovery_improving_positive',
    inactivity: 'long_inactivity_nudge',
    pr_achieved: 'positive_momentum_streak',
  }
  return recentEvents.some((e) => {
    const mappedType = EPISODE_TO_REC[e.type]
    return mappedType === type && new Date(e.recordedAt).getTime() > cutoff
  })
}

// ─── Rule Definitions ─────────────────────────────────────────────────────────

const RULES: RecommendationRule[] = [
  // ── 1. LOW PROTEIN INTAKE ────────────────────────────────────────────────────
  {
    type: 'low_protein_intake',
    description: 'Protein intake below optimal threshold relative to training load',
    cooldownHours: 8,
    evaluate(input) {
      const { runtimeState, targets } = input
      const n = runtimeState.nutrition
      if (!n) return null
      const proteinTarget = targets?.dailyProteinTargetG ?? 120
      if (n.estimatedProteinG >= proteinTarget * 0.75) return null
      const ratio = n.estimatedProteinG / proteinTarget
      const hasTraining = runtimeState.training !== null
      return {
        priority: hasTraining ? 'high' : 'medium',
        domain: 'nutrition',
        title: 'Protein intake too low',
        explanation: `You logged ${Math.round(n.estimatedProteinG)}g protein — below the ${Math.round(proteinTarget * 0.75)}g minimum target.${hasTraining ? ' With today\'s training, recovery depends on adequate protein.' : ''}`,
        suggestedAction: 'Add a high-protein meal or snack (chicken, eggs, cottage cheese, Greek yogurt).',
        confidence: 0.85,
        urgency: hasTraining ? 0.75 : 0.5,
        impact: 0.8,
        expiresInHours: 12,
        sourceSignals: ['nutrition.estimatedProteinG'],
        relatedIntent: 'food_log',
        relatedMemory: [],
      }
    },
  },

  // ── 2. CALORIE DEFICIT TOO HIGH ───────────────────────────────────────────────
  {
    type: 'calorie_deficit_too_high',
    description: 'Calorie intake critically below target (< 50% of target)',
    cooldownHours: 6,
    evaluate(input) {
      const { runtimeState } = input
      const n = runtimeState.nutrition
      if (!n || !n.dailyCalorieTarget) return null
      const ratio = n.estimatedCalories / n.dailyCalorieTarget
      if (ratio >= 0.5) return null
      const hasTraining = runtimeState.training !== null
      return {
        priority: hasTraining ? 'critical' : 'high',
        domain: 'nutrition',
        title: 'Calorie deficit critical',
        explanation: `You've consumed ${Math.round(n.estimatedCalories)} kcal — less than 50% of your ${n.dailyCalorieTarget} kcal target.${hasTraining ? ' Combined with today\'s training, this risks energy depletion.' : ''}`,
        suggestedAction: 'Eat a balanced meal now. Do not train on this deficit.',
        confidence: 0.95,
        urgency: hasTraining ? 0.95 : 0.75,
        impact: 0.9,
        expiresInHours: 8,
        sourceSignals: ['nutrition.estimatedCalories', 'nutrition.dailyCalorieTarget'],
        relatedIntent: 'food_log',
        relatedMemory: ['missed_nutrition'],
      }
    },
  },

  // ── 3. MISSED MEALS ───────────────────────────────────────────────────────────
  {
    type: 'missed_meals',
    description: 'Meal count is very low for the day',
    cooldownHours: 6,
    evaluate(input) {
      const { runtimeState } = input
      const n = runtimeState.nutrition
      if (!n || (n.mealCount ?? 1) > 1) return null
      return {
        priority: 'medium',
        domain: 'nutrition',
        title: 'Meal logging sparse today',
        explanation: 'Only one meal logged so far. Consistent meal tracking helps the coach give better advice.',
        suggestedAction: 'Log your next meal when you eat.',
        confidence: 0.6,
        urgency: 0.4,
        impact: 0.6,
        expiresInHours: 8,
        sourceSignals: ['nutrition.mealCount'],
        relatedIntent: 'food_log',
        relatedMemory: ['missed_nutrition'],
      }
    },
  },

  // ── 4. INCONSISTENT LOGGING ───────────────────────────────────────────────────
  {
    type: 'inconsistent_logging',
    description: 'User has inactivity pattern — logging gaps detected in memory',
    cooldownHours: 24,
    evaluate(input) {
      const { memory, runtimeState } = input
      if (!memory) return null
      const inactivity = memory.continuityState.inactivityDays
      if (!inactivity || inactivity < 2) return null
      const hasDataToday = runtimeState.nutrition !== null || runtimeState.training !== null
      if (hasDataToday) return null
      return {
        priority: 'medium',
        domain: 'coaching',
        title: 'Logging gap detected',
        explanation: `No data logged for ${inactivity} day${inactivity > 1 ? 's' : ''}. Consistency in tracking is key to accurate coaching.`,
        suggestedAction: 'Log today\'s meals and note your energy level.',
        confidence: 0.8,
        urgency: 0.5,
        impact: 0.65,
        expiresInHours: 18,
        sourceSignals: ['memory.continuityState.inactivityDays'],
        relatedIntent: null,
        relatedMemory: ['inactivity'],
      }
    },
  },

  // ── 5. HYDRATION MISSING ─────────────────────────────────────────────────────
  {
    type: 'hydration_missing',
    description: 'No hydration data and high training load or hot conditions',
    cooldownHours: 12,
    evaluate(input) {
      const { runtimeState } = input
      const t = runtimeState.training
      if (!t) return null
      const tss = t.tss ?? 0
      if (tss < 60) return null
      return {
        priority: 'medium',
        domain: 'nutrition',
        title: 'Hydration check',
        explanation: `After a ${tss >= 100 ? 'high-load' : 'moderate'} training session, hydration is critical for recovery. No hydration data logged.`,
        suggestedAction: 'Aim for 400–600ml water per hour of training. Log water intake.',
        confidence: 0.55,
        urgency: 0.5,
        impact: 0.65,
        expiresInHours: 8,
        sourceSignals: ['training.tss', 'training.durationMinutes'],
        relatedIntent: 'training_reference',
        relatedMemory: [],
      }
    },
  },

  // ── 6. POOR RECOVERY WARNING ─────────────────────────────────────────────────
  {
    type: 'poor_recovery_warning',
    description: 'Recovery status is poor — user should reduce training load',
    cooldownHours: 12,
    evaluate(input) {
      const { runtimeState } = input
      const r = runtimeState.recovery
      if (!r || r.status !== 'poor') return null
      const hasTraining = runtimeState.training !== null
      return {
        priority: hasTraining ? 'critical' : 'high',
        domain: 'recovery',
        title: 'Poor recovery detected',
        explanation: `Your recovery status is poor (readiness: ${r.readinessScore ?? 'low'}).${hasTraining ? ' Training hard today increases injury risk.' : ' Prioritise rest today.'}`,
        suggestedAction: hasTraining ? 'Consider replacing hard training with active recovery or rest.' : 'Sleep early, eat well, and minimise stress today.',
        confidence: 0.9,
        urgency: hasTraining ? 0.95 : 0.75,
        impact: 0.85,
        expiresInHours: 16,
        sourceSignals: ['recovery.status', 'recovery.readinessScore'],
        relatedIntent: 'recovery_reflection',
        relatedMemory: ['low_recovery'],
      }
    },
  },

  // ── 7. OVERTRAINING ALERT ────────────────────────────────────────────────────
  {
    type: 'overtraining_alert',
    description: 'TSS > 120 AND poor recovery — overtraining risk is high',
    cooldownHours: 8,
    evaluate(input) {
      const { runtimeState } = input
      const t = runtimeState.training
      const r = runtimeState.recovery
      if (!t || !r) return null
      if ((t.tss ?? 0) <= 120 || r.status !== 'poor') return null
      return {
        priority: 'critical',
        domain: 'training',
        title: 'Overtraining risk — stop',
        explanation: `TSS of ${t.tss} combined with poor recovery is a strong overtraining signal. Continuing at this load risks injury and significant performance regression.`,
        suggestedAction: 'Stop hard training for at least 48 hours. Prioritise sleep and recovery nutrition.',
        confidence: 0.95,
        urgency: 1.0,
        impact: 0.95,
        expiresInHours: 24,
        sourceSignals: ['training.tss', 'recovery.status'],
        relatedIntent: 'recovery_reflection',
        relatedMemory: ['overtraining_detected', 'low_recovery'],
      }
    },
  },

  // ── 8. HIGH TRAINING LOAD NOTICE ─────────────────────────────────────────────
  {
    type: 'high_training_load_notice',
    description: 'TSS 100–150 — informational load notice',
    cooldownHours: 12,
    evaluate(input) {
      const { runtimeState } = input
      const t = runtimeState.training
      const r = runtimeState.recovery
      if (!t) return null
      const tss = t.tss ?? 0
      if (tss <= 100 || tss > 150) return null
      if (r?.status === 'poor') return null // overtraining_alert handles this
      return {
        priority: 'medium',
        domain: 'training',
        title: 'High training load today',
        explanation: `TSS of ${tss} is in the high zone. Well within limits, but recovery today matters.`,
        suggestedAction: 'Prioritise protein-rich post-workout nutrition and 7–9h sleep tonight.',
        confidence: 0.85,
        urgency: 0.5,
        impact: 0.65,
        expiresInHours: 20,
        sourceSignals: ['training.tss'],
        relatedIntent: 'training_reference',
        relatedMemory: ['high_training_load'],
      }
    },
  },

  // ── 9. TRAINING STREAK POSITIVE ──────────────────────────────────────────────
  {
    type: 'training_streak_positive',
    description: 'Training logged — positive reinforcement',
    cooldownHours: 20,
    evaluate(input) {
      const { runtimeState, memory } = input
      if (!runtimeState.training) return null
      const streakEpisodes = memory?.recentEpisodes.filter((e) => e.type === 'training_streak') ?? []
      if (streakEpisodes.length < 2) return null // only after consistent pattern
      return {
        priority: 'low',
        domain: 'training',
        title: 'Training streak — great work',
        explanation: 'You\'ve been consistently training. This consistency is the foundation of performance.',
        suggestedAction: 'Keep the streak going. Log tomorrow\'s session.',
        confidence: 0.75,
        urgency: 0.2,
        impact: 0.5,
        expiresInHours: 24,
        sourceSignals: ['training.durationMinutes'],
        relatedIntent: 'training_reference',
        relatedMemory: ['training_streak'],
      }
    },
  },

  // ── 10. WORKOUT CONSISTENCY HIGH ─────────────────────────────────────────────
  {
    type: 'workout_consistency_high',
    description: 'High training consistency over multiple sessions',
    cooldownHours: 48,
    evaluate(input) {
      const { memory } = input
      if (!memory) return null
      const streaks = memory.recentEpisodes.filter((e) => e.type === 'training_streak')
      if (streaks.length < 3) return null
      return {
        priority: 'low',
        domain: 'training',
        title: 'Excellent training consistency',
        explanation: `${streaks.length} training sessions logged recently. This level of consistency produces long-term fitness gains.`,
        suggestedAction: 'Protect your recovery — consistency + rest is the formula.',
        confidence: 0.8,
        urgency: 0.15,
        impact: 0.55,
        expiresInHours: 48,
        sourceSignals: ['memory.episodic.training_streak'],
        relatedIntent: null,
        relatedMemory: ['training_streak'],
      }
    },
  },

  // ── 11. LOW SLEEP WARNING ─────────────────────────────────────────────────────
  {
    type: 'low_sleep_warning',
    description: 'Recovery poor AND behavioral signals indicate fatigue',
    cooldownHours: 16,
    evaluate(input) {
      const { runtimeState } = input
      const r = runtimeState.recovery
      const b = runtimeState.behavioral
      if (!r || r.status !== 'poor') return null
      if (!b) return null
      const energyLow = (b.energyLevel ?? 5) <= 2
      const moodLow = (b.mood ?? 5) <= 2
      if (!energyLow && !moodLow) return null
      return {
        priority: 'high',
        domain: 'recovery',
        title: 'Low energy + poor recovery',
        explanation: 'Both recovery metrics and behavioral signals suggest insufficient sleep or rest.',
        suggestedAction: 'Target 8–9h sleep tonight. Avoid caffeine after 2pm. Skip hard training.',
        confidence: 0.8,
        urgency: 0.8,
        impact: 0.8,
        expiresInHours: 20,
        sourceSignals: ['recovery.status', 'behavioral.energyLevel', 'behavioral.mood'],
        relatedIntent: 'recovery_reflection',
        relatedMemory: ['low_recovery', 'behavioral_drop'],
      }
    },
  },

  // ── 12. HIGH STRESS + HARD TRAINING ──────────────────────────────────────────
  {
    type: 'high_stress_hard_training',
    description: 'High stress level combined with significant training load',
    cooldownHours: 12,
    evaluate(input) {
      const { runtimeState } = input
      const b = runtimeState.behavioral
      const t = runtimeState.training
      if (!b || !t) return null
      const stressHigh = (b.stressLevel ?? 0) >= 4
      const tssSignificant = (t.tss ?? 0) >= 70
      if (!stressHigh || !tssSignificant) return null
      return {
        priority: 'high',
        domain: 'behavioral',
        title: 'High stress + hard training',
        explanation: 'High psychological stress and significant training load both deplete the same recovery resources. Combined, they increase overtraining risk.',
        suggestedAction: 'Prioritise sleep, reduce other stressors where possible, and consider an easier session tomorrow.',
        confidence: 0.8,
        urgency: 0.75,
        impact: 0.75,
        expiresInHours: 20,
        sourceSignals: ['behavioral.stressLevel', 'training.tss'],
        relatedIntent: 'behavioral_reflection',
        relatedMemory: ['behavioral_drop'],
      }
    },
  },

  // ── 13. HIGH ATL WARNING ──────────────────────────────────────────────────────
  {
    type: 'high_atl_warning',
    description: 'TSS > 150 — Acute Training Load is very high (PR zone)',
    cooldownHours: 24,
    evaluate(input) {
      const { runtimeState } = input
      const t = runtimeState.training
      if (!t || (t.tss ?? 0) <= 150) return null
      const r = runtimeState.recovery
      if (r?.status === 'poor') return null // overtraining_alert handles this
      return {
        priority: 'high',
        domain: 'training',
        title: 'Exceptional training load',
        explanation: `TSS of ${t.tss} is in the peak zone. Performance record territory — but demands serious recovery attention.`,
        suggestedAction: 'Today was exceptional. Treat the next 24h as recovery-critical. Sleep, eat, hydrate.',
        confidence: 0.9,
        urgency: 0.7,
        impact: 0.8,
        expiresInHours: 24,
        sourceSignals: ['training.tss'],
        relatedIntent: 'training_reference',
        relatedMemory: ['pr_achieved'],
      }
    },
  },

  // ── 14. BEHAVIORAL FATIGUE ───────────────────────────────────────────────────
  {
    type: 'behavioral_fatigue',
    description: 'Mood ≤ 2 OR energy ≤ 2 — behavioral fatigue detected',
    cooldownHours: 12,
    evaluate(input) {
      const { runtimeState } = input
      const b = runtimeState.behavioral
      if (!b) return null
      const energyVeryLow = (b.energyLevel ?? 5) <= 2
      const moodVeryLow = (b.mood ?? 5) <= 2
      if (!energyVeryLow && !moodVeryLow) return null
      return {
        priority: 'medium',
        domain: 'behavioral',
        title: energyVeryLow ? 'Very low energy today' : 'Low mood today',
        explanation: energyVeryLow
          ? 'Energy level is very low. This may affect training quality and decision-making.'
          : 'Mood is low today. Behavioural factors impact nutrition choices and training motivation.',
        suggestedAction: 'Note what might be driving this. Rest is productive when your baseline is depleted.',
        confidence: 0.75,
        urgency: 0.55,
        impact: 0.65,
        expiresInHours: 16,
        sourceSignals: ['behavioral.energyLevel', 'behavioral.mood'],
        relatedIntent: 'behavioral_reflection',
        relatedMemory: ['behavioral_drop'],
      }
    },
  },

  // ── 15. ENERGY LOW WARNING ───────────────────────────────────────────────────
  {
    type: 'energy_low_warning',
    description: 'Energy level is low (3) combined with training today',
    cooldownHours: 10,
    evaluate(input) {
      const { runtimeState } = input
      const b = runtimeState.behavioral
      const t = runtimeState.training
      if (!b || !t) return null
      const energyModerate = b.energyLevel === 3
      if (!energyModerate) return null
      return {
        priority: 'low',
        domain: 'behavioral',
        title: 'Moderate energy on a training day',
        explanation: 'Energy is average with a training session logged. Monitor how you feel in recovery.',
        suggestedAction: 'Ensure post-training nutrition is on point. Prioritise sleep tonight.',
        confidence: 0.6,
        urgency: 0.35,
        impact: 0.5,
        expiresInHours: 12,
        sourceSignals: ['behavioral.energyLevel', 'training.durationMinutes'],
        relatedIntent: 'behavioral_reflection',
        relatedMemory: [],
      }
    },
  },

  // ── 16. LONG INACTIVITY NUDGE ────────────────────────────────────────────────
  {
    type: 'long_inactivity_nudge',
    description: 'User inactive for 2+ days — gentle re-engagement nudge',
    cooldownHours: 24,
    evaluate(input) {
      const { memory } = input
      if (!memory) return null
      const days = memory.continuityState.inactivityDays
      if (!days || days < 2) return null
      return {
        priority: days >= 5 ? 'medium' : 'low',
        domain: 'coaching',
        title: `${days}-day absence — welcome back`,
        explanation: `You haven't logged or checked in for ${days} days. Consistency in tracking helps maintain momentum.`,
        suggestedAction: 'Log how you\'re feeling today and any meals you remember. A brief check-in resets the habit.',
        confidence: 0.85,
        urgency: days >= 5 ? 0.5 : 0.3,
        impact: 0.6,
        expiresInHours: 20,
        sourceSignals: ['memory.continuityState.inactivityDays'],
        relatedIntent: 'casual_conversation',
        relatedMemory: ['inactivity'],
      }
    },
  },

  // ── 17. RECOVERY IMPROVING POSITIVE ──────────────────────────────────────────
  {
    type: 'recovery_improving_positive',
    description: 'Recovery was poor but now good/optimal — positive feedback',
    cooldownHours: 24,
    evaluate(input) {
      const { runtimeState, memory } = input
      const r = runtimeState.recovery
      if (!r || (r.status !== 'good' && r.status !== 'optimal')) return null
      if (!memory) return null
      const hadLowRecovery = memory.recentEpisodes.some((e) => e.type === 'low_recovery')
      if (!hadLowRecovery) return null
      return {
        priority: 'low',
        domain: 'recovery',
        title: 'Recovery bouncing back',
        explanation: `Recovery is now ${r.status} after a period of poor scores. Your body is responding well.`,
        suggestedAction: 'Capitalise on this window with a quality training session or a strategic rest day.',
        confidence: 0.75,
        urgency: 0.2,
        impact: 0.6,
        expiresInHours: 24,
        sourceSignals: ['recovery.status'],
        relatedIntent: 'recovery_reflection',
        relatedMemory: ['low_recovery', 'behavioral_recovery'],
      }
    },
  },

  // ── 18. POSITIVE MOMENTUM STREAK ─────────────────────────────────────────────
  {
    type: 'positive_momentum_streak',
    description: 'Multiple positive signals — user is in a good phase',
    cooldownHours: 48,
    evaluate(input) {
      const { runtimeState, memory } = input
      if (!memory) return null
      const r = runtimeState.recovery
      const b = runtimeState.behavioral
      const recoveryGood = r && (r.status === 'good' || r.status === 'optimal')
      const moodGood = b && (b.energyLevel ?? 0) >= 4 && (b.mood ?? 0) >= 4
      if (!recoveryGood || !moodGood) return null
      return {
        priority: 'low',
        domain: 'coaching',
        title: 'You\'re in a strong phase',
        explanation: 'Recovery is good and behavioral signals are positive. This is the window to push training quality.',
        suggestedAction: 'Schedule a quality session or goal-setting review while momentum is high.',
        confidence: 0.8,
        urgency: 0.15,
        impact: 0.55,
        expiresInHours: 36,
        sourceSignals: ['recovery.status', 'behavioral.energyLevel', 'behavioral.mood'],
        relatedIntent: 'progress_check',
        relatedMemory: ['behavioral_recovery'],
      }
    },
  },

  // ── 19. CALORIE DEFICIT STREAK NOTICE ────────────────────────────────────────
  {
    type: 'calorie_deficit_streak_notice',
    description: 'Calories in 50–80% of target — moderate deficit, informational',
    cooldownHours: 12,
    evaluate(input) {
      const { runtimeState } = input
      const n = runtimeState.nutrition
      if (!n || !n.dailyCalorieTarget) return null
      const ratio = n.estimatedCalories / n.dailyCalorieTarget
      if (ratio < 0.5 || ratio >= 0.8) return null
      return {
        priority: 'low',
        domain: 'nutrition',
        title: 'Calorie intake below target',
        explanation: `At ${Math.round(n.estimatedCalories)} kcal you're at ${Math.round(ratio * 100)}% of your ${n.dailyCalorieTarget} kcal target. Moderate deficit — watch energy levels.`,
        suggestedAction: 'Consider a light snack to stay in the healthy deficit zone without going too low.',
        confidence: 0.8,
        urgency: 0.35,
        impact: 0.5,
        expiresInHours: 10,
        sourceSignals: ['nutrition.estimatedCalories', 'nutrition.dailyCalorieTarget'],
        relatedIntent: 'food_log',
        relatedMemory: ['calorie_deficit_streak'],
      }
    },
  },

  // ── 20. NUTRITION GOAL MET POSITIVE ──────────────────────────────────────────
  {
    type: 'nutrition_goal_met_positive',
    description: 'Calories ≥ 80% of target — positive nutrition feedback',
    cooldownHours: 20,
    evaluate(input) {
      const { runtimeState } = input
      const n = runtimeState.nutrition
      if (!n || !n.dailyCalorieTarget) return null
      const ratio = n.estimatedCalories / n.dailyCalorieTarget
      if (ratio < 0.8) return null
      return {
        priority: 'silent',
        domain: 'nutrition',
        title: 'Nutrition goal on track',
        explanation: `${Math.round(ratio * 100)}% of daily calorie target reached. Solid nutrition day.`,
        suggestedAction: 'Keep consistent with dinner. Protein target is the next priority.',
        confidence: 0.9,
        urgency: 0.1,
        impact: 0.4,
        expiresInHours: 12,
        sourceSignals: ['nutrition.estimatedCalories', 'nutrition.dailyCalorieTarget'],
        relatedIntent: 'food_log',
        relatedMemory: ['nutrition_streak'],
      }
    },
  },

  // ── 21. UNRESOLVED TOPIC FOLLOWUP ────────────────────────────────────────────
  {
    type: 'unresolved_topic_followup',
    description: 'Short-term memory has unresolved topics from prior turns',
    cooldownHours: 4,
    evaluate(input) {
      const { memory } = input
      if (!memory || memory.unresolvedTopics.length === 0) return null
      const topic = memory.unresolvedTopics[0]
      return {
        priority: 'medium',
        domain: 'coaching',
        title: 'Pending topic',
        explanation: `There's an open topic from earlier: "${topic}". Addressing it helps the coach build continuity.`,
        suggestedAction: 'Reply to the pending topic or let me know it\'s resolved.',
        confidence: 0.7,
        urgency: 0.45,
        impact: 0.55,
        expiresInHours: 6,
        sourceSignals: ['memory.unresolvedTopics'],
        relatedIntent: null,
        relatedMemory: [],
      }
    },
  },

  // ── 22. FIRST SESSION WELCOME ─────────────────────────────────────────────────
  {
    type: 'first_session_welcome',
    description: 'First-ever session for this user — onboarding recommendation',
    cooldownHours: 72,
    evaluate(input) {
      const { memory } = input
      if (memory?.hasMemory) return null
      return {
        priority: 'medium',
        domain: 'coaching',
        title: 'Welcome — let\'s get started',
        explanation: 'This looks like your first session. The more you log, the more personalised the coaching becomes.',
        suggestedAction: 'Log today\'s first meal and tell me how you\'re feeling. That\'s all we need to start.',
        confidence: 0.95,
        urgency: 0.5,
        impact: 0.7,
        expiresInHours: 48,
        sourceSignals: ['memory.hasMemory'],
        relatedIntent: 'casual_conversation',
        relatedMemory: [],
      }
    },
  },
]

// ─── Public Engine API ────────────────────────────────────────────────────────

export interface RecommendationEngineOutput {
  recommendations: CanonicalRecommendation[]
  /** Number of rules evaluated */
  rulesEvaluated: number
  /** Number of rules that triggered but were suppressed by cooldown */
  suppressedByCooldown: number
  /** ISO timestamp of this run */
  generatedAt: string
}

/**
 * Generate recommendations for the current runtime state.
 *
 * Runs all 22 rules deterministically. Applies cooldown suppression.
 * Returns recommendations sorted by score DESC.
 *
 * No LLM. No randomness. Same input = same output.
 */
export function generateRecommendations(
  input: RecommendationEngineInput,
): RecommendationEngineOutput {
  const results: CanonicalRecommendation[] = []
  const seenTypes = new Set<RecommendationTypeName>()
  let suppressedByCooldown = 0

  for (const rule of RULES) {
    // Deduplication — only one recommendation per type per run
    if (seenTypes.has(rule.type)) continue

    // Cooldown check
    if (isInCooldown(rule.type, rule.cooldownHours, input.recentEvents)) {
      suppressedByCooldown++
      continue
    }

    const result = rule.evaluate(input)
    if (result === null) continue

    seenTypes.add(rule.type)
    results.push(buildRecommendation(rule.type, result))
  }

  // Sort by score DESC (highest urgency * confidence * impact first)
  results.sort((a, b) => b.score - a.score)

  return {
    recommendations: results,
    rulesEvaluated: RULES.length,
    suppressedByCooldown,
    generatedAt: new Date().toISOString(),
  }
}

// ─── Utility Exports ─────────────────────────────────────────────────────────

/** The number of rules registered in the engine. */
export const RULE_COUNT = RULES.length

/**
 * Get all registered rule type names (useful for testing coverage).
 */
export function getRegisteredRuleTypes(): RecommendationTypeName[] {
  return RULES.map((r) => r.type)
}
