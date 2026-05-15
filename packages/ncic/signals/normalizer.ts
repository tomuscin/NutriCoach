/**
 * NCIC Signal Normalizer
 *
 * Pure, deterministic functions that convert runtime events into normalized signals.
 * No LLM. No side effects. Same input → same output.
 */

import type {
  FoodLoggedEvent,
  MealAnalyzedEvent,
  TrainingLoggedEvent,
  RecoveryUpdatedEvent,
  DailyReflectionLoggedEvent,
  ConversationStartedEvent,
  ConversationEndedEvent,
} from '../events/types'

import type {
  NutritionSignal,
  TrainingSignal,
  RecoverySignal,
  BehavioralSignal,
  ConversationSignal,
  RecoverySignalData,
  TrainingSignalData,
  BehavioralSignalData,
} from './types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString()
}

/** Extract YYYY-MM-DD from an ISO timestamp */
function toDateString(iso: string): string {
  return iso.slice(0, 10)
}

// ─── Training Zone Derivation ─────────────────────────────────────────────────

function deriveIntensityZone(
  avgHr?: number,
  tss?: number,
  durationMinutes?: number,
): TrainingSignalData['intensityZone'] {
  // TSS-based classification if available
  if (tss !== undefined && durationMinutes && durationMinutes > 0) {
    const intensityFactor = tss / durationMinutes
    if (intensityFactor < 0.5) return 'z1'
    if (intensityFactor < 0.8) return 'z2'
    if (intensityFactor < 1.2) return 'z3'
    if (intensityFactor < 1.6) return 'z4'
    return 'z5'
  }
  // Fallback: HR-based (assumes ~180 max HR)
  if (avgHr !== undefined) {
    const hrPct = avgHr / 180
    if (hrPct < 0.6) return 'z1'
    if (hrPct < 0.7) return 'z2'
    if (hrPct < 0.8) return 'z3'
    if (hrPct < 0.9) return 'z4'
    return 'z5'
  }
  return 'unknown'
}

// ─── Recovery Status Derivation ───────────────────────────────────────────────

function deriveRecoveryStatus(
  readinessScore?: number,
  sleepScore?: number,
): RecoverySignalData['status'] {
  const score = readinessScore ?? sleepScore
  if (score === undefined) return 'unknown'
  if (score >= 80) return 'optimal'
  if (score >= 65) return 'good'
  if (score >= 45) return 'moderate'
  return 'poor'
}

// ─── Wellbeing Score Derivation ───────────────────────────────────────────────

function deriveWellbeing(
  mood?: number,
  energy?: number,
  stress?: number,
): number | undefined {
  const scores: number[] = []
  if (mood !== undefined) scores.push(mood)
  if (energy !== undefined) scores.push(energy)
  // Invert stress: high stress = low wellbeing
  if (stress !== undefined) scores.push(6 - stress)
  if (scores.length === 0) return undefined
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length
  return Math.round(avg * 10) / 10
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

export function normalizeFoodLoggedEvent(event: FoodLoggedEvent): NutritionSignal {
  return {
    eventId: event.id,
    domain: 'nutrition',
    userId: event.userId,
    date: event.payload.date,
    normalizedAt: nowIso(),
    confidence: event.payload.estimatedCalories !== undefined ? 'estimated' : 'low',
    source: event.source,
    data: {
      estimatedCalories: event.payload.estimatedCalories ?? 0,
      estimatedProteinG: event.payload.estimatedProteinG ?? 0,
      estimatedCarbsG: event.payload.estimatedCarbsG ?? 0,
      estimatedFatG: event.payload.estimatedFatG ?? 0,
      isPartialDay: true,
    },
  }
}

export function normalizeMealAnalyzedEvent(event: MealAnalyzedEvent): NutritionSignal {
  return {
    eventId: event.id,
    domain: 'nutrition',
    userId: event.userId,
    date: event.payload.date,
    normalizedAt: nowIso(),
    confidence: event.payload.confidence,
    source: event.source,
    data: {
      estimatedCalories: event.payload.calories,
      estimatedProteinG: event.payload.proteinG,
      estimatedCarbsG: event.payload.carbsG,
      estimatedFatG: event.payload.fatG,
    },
  }
}

export function normalizeTrainingLoggedEvent(event: TrainingLoggedEvent): TrainingSignal {
  return {
    eventId: event.id,
    domain: 'training',
    userId: event.userId,
    date: event.payload.date,
    normalizedAt: nowIso(),
    confidence: event.payload.tss !== undefined ? 'high' : 'medium',
    source: event.source,
    data: {
      durationMinutes: event.payload.durationMinutes,
      distanceKm: event.payload.distanceKm,
      estimatedCalories: event.payload.estimatedCalories,
      avgHeartRate: event.payload.avgHeartRate,
      tss: event.payload.tss,
      sport: event.payload.sport,
      intensityZone: deriveIntensityZone(
        event.payload.avgHeartRate,
        event.payload.tss,
        event.payload.durationMinutes,
      ),
    },
  }
}

export function normalizeRecoveryUpdatedEvent(event: RecoveryUpdatedEvent): RecoverySignal {
  return {
    eventId: event.id,
    domain: 'recovery',
    userId: event.userId,
    date: event.payload.date,
    normalizedAt: nowIso(),
    confidence: event.payload.readinessScore !== undefined ? 'high' : 'medium',
    source: event.source,
    data: {
      readinessScore: event.payload.readinessScore,
      hrvMs: event.payload.hrvMs,
      sleepScore: event.payload.sleepScore,
      totalSleepMinutes: event.payload.totalSleepMinutes,
      restingHeartRate: event.payload.restingHeartRate,
      status: event.payload.status ?? deriveRecoveryStatus(
        event.payload.readinessScore,
        event.payload.sleepScore,
      ),
    },
  }
}

export function normalizeDailyReflectionEvent(
  event: DailyReflectionLoggedEvent,
): BehavioralSignal {
  const data: BehavioralSignalData = {
    mood: event.payload.mood,
    energyLevel: event.payload.energyLevel,
    stressLevel: event.payload.stressLevel,
    wellbeingScore: deriveWellbeing(
      event.payload.mood,
      event.payload.energyLevel,
      event.payload.stressLevel,
    ),
    tags: event.payload.tags,
    hasNotes: Boolean(event.payload.notes),
  }

  return {
    eventId: event.id,
    domain: 'behavioral',
    userId: event.userId,
    date: event.payload.date,
    normalizedAt: nowIso(),
    confidence: data.mood !== undefined ? 'medium' : 'low',
    source: event.source,
    data,
  }
}

export function normalizeConversationStartedEvent(
  event: ConversationStartedEvent,
): ConversationSignal {
  return {
    eventId: event.id,
    domain: 'conversation',
    userId: event.userId,
    date: toDateString(event.timestamp),
    normalizedAt: nowIso(),
    confidence: 'high',
    source: event.source,
    data: {
      conversationId: event.payload.conversationId,
      sessionType: event.payload.sessionType,
      channel: event.payload.channel,
      producedAction: false,
    },
  }
}

export function normalizeConversationEndedEvent(
  event: ConversationEndedEvent,
): ConversationSignal {
  return {
    eventId: event.id,
    domain: 'conversation',
    userId: event.userId,
    date: toDateString(event.timestamp),
    normalizedAt: nowIso(),
    confidence: 'high',
    source: event.source,
    data: {
      conversationId: event.payload.conversationId,
      sessionType: 'chat',
      channel: 'web',
      durationSeconds: event.payload.durationSeconds,
      messageCount: event.payload.messageCount,
      resolvedIntent: event.payload.resolvedIntent,
      producedAction: false,
    },
  }
}
