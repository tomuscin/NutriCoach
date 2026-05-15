/**
 * NCIC Episodic Memory
 *
 * Detects and manages notable episodic events from runtime signals.
 * Deterministic — no LLM, no randomness.
 *
 * An episode is a notable event worth remembering across turns:
 *   - low recovery detected
 *   - overtraining risk
 *   - behavioral drop
 *   - missed nutrition
 *   etc.
 *
 * Detection is idempotent per (userId, date, type) — no duplicates.
 */

import type { EpisodicEvent, EpisodicEventType } from './types'
import { generateMemoryId } from './types'
import type { RuntimeContextSnapshot } from '../runtime/state'

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Detect notable episodic events from the current runtime snapshot.
 * Returns only NEW events not already present for today.
 *
 * @param userId   User identifier
 * @param date     ISO date string (YYYY-MM-DD)
 * @param snapshot Current runtime state
 * @param recentEpisodes Existing episodes (to avoid duplicates)
 */
export function detectEpisodes(
  userId: string,
  date: string,
  snapshot: RuntimeContextSnapshot,
  recentEpisodes: EpisodicEvent[],
): EpisodicEvent[] {
  const detected: EpisodicEvent[] = []

  // Build set of today's already-recorded event types
  const todayTypes = new Set<EpisodicEventType>(
    recentEpisodes.filter((e) => e.date === date).map((e) => e.type),
  )

  const r = snapshot.recovery
  const t = snapshot.training
  const n = snapshot.nutrition
  const b = snapshot.behavioral

  // ── Overtraining (critical — check before high_training_load) ─────────────
  if (
    t?.tss != null &&
    t.tss > 120 &&
    r?.status === 'poor' &&
    !todayTypes.has('overtraining_detected')
  ) {
    detected.push(makeEpisode(userId, date, 'overtraining_detected', 'critical',
      `Overtraining risk: TSS ${t.tss} with poor recovery`,
      { tss: t.tss, recoveryStatus: 'poor', recoveryScore: r.readinessScore ?? null },
    ))
    todayTypes.add('overtraining_detected')
  }

  // ── Low Recovery ──────────────────────────────────────────────────────────
  if (r?.status === 'poor' && !todayTypes.has('low_recovery')) {
    detected.push(makeEpisode(userId, date, 'low_recovery', 'warning',
      `Poor recovery detected (readiness: ${r.readinessScore ?? 'unknown'})`,
      { recoveryScore: r.readinessScore ?? null, sleepMinutes: r.totalSleepMinutes ?? null },
    ))
    todayTypes.add('low_recovery')
  }

  // ── PR Achieved (TSS > 150) ───────────────────────────────────────────────
  if (
    t?.tss != null &&
    t.tss > 150 &&
    r?.status !== 'poor' &&
    !todayTypes.has('pr_achieved')
  ) {
    detected.push(makeEpisode(userId, date, 'pr_achieved', 'info',
      `High performance session: TSS ${t.tss}`,
      { tss: t.tss, durationMinutes: t.durationMinutes ?? null },
    ))
    todayTypes.add('pr_achieved')
  }

  // ── High Training Load (TSS > 100, not overtraining) ─────────────────────
  if (
    t?.tss != null &&
    t.tss > 100 &&
    t.tss <= 150 &&
    r?.status !== 'poor' &&
    !todayTypes.has('high_training_load')
  ) {
    detected.push(makeEpisode(userId, date, 'high_training_load', 'info',
      `High training load: TSS ${t.tss}`,
      { tss: t.tss, durationMinutes: t.durationMinutes ?? null },
    ))
    todayTypes.add('high_training_load')
  }

  // ── Training Streak ───────────────────────────────────────────────────────
  if (t != null && !todayTypes.has('training_streak')) {
    detected.push(makeEpisode(userId, date, 'training_streak', 'info',
      `Training logged today (${t.durationMinutes ?? 0} min)`,
      { durationMinutes: t.durationMinutes ?? null, tss: t.tss ?? null },
    ))
    todayTypes.add('training_streak')
  }

  // ── Missed Nutrition (< 50% of target) ────────────────────────────────────
  if (
    n?.dailyCalorieTarget != null &&
    n.estimatedCalories != null &&
    n.estimatedCalories < n.dailyCalorieTarget * 0.5 &&
    !todayTypes.has('missed_nutrition')
  ) {
    detected.push(makeEpisode(userId, date, 'missed_nutrition', 'warning',
      `Calories significantly below target: ${n.estimatedCalories} / ${n.dailyCalorieTarget}`,
      { calories: n.estimatedCalories, target: n.dailyCalorieTarget },
    ))
    todayTypes.add('missed_nutrition')
  }

  // ── Calorie Deficit Streak (50–80% of target) ─────────────────────────────
  if (
    n?.dailyCalorieTarget != null &&
    n.estimatedCalories != null &&
    n.estimatedCalories >= n.dailyCalorieTarget * 0.5 &&
    n.estimatedCalories < n.dailyCalorieTarget * 0.8 &&
    !todayTypes.has('calorie_deficit_streak')
  ) {
    detected.push(makeEpisode(userId, date, 'calorie_deficit_streak', 'info',
      `Calorie deficit: ${n.estimatedCalories} / ${n.dailyCalorieTarget}`,
      { calories: n.estimatedCalories, target: n.dailyCalorieTarget },
    ))
    todayTypes.add('calorie_deficit_streak')
  }

  // ── Nutrition Streak (complete day) ───────────────────────────────────────
  if (
    n != null &&
    n.estimatedCalories != null &&
    n.estimatedCalories > 500 &&
    (n.dailyCalorieTarget == null || n.estimatedCalories >= n.dailyCalorieTarget * 0.8) &&
    !todayTypes.has('nutrition_streak')
  ) {
    detected.push(makeEpisode(userId, date, 'nutrition_streak', 'info',
      `Nutrition goal met today: ${n.estimatedCalories} kcal`,
      { calories: n.estimatedCalories, target: n.dailyCalorieTarget ?? null },
    ))
    todayTypes.add('nutrition_streak')
  }

  // ── Behavioral Drop (energy ≤ 2 or mood ≤ 2) ─────────────────────────────
  if (
    b != null &&
    ((b.energyLevel != null && b.energyLevel <= 2) ||
      (b.mood != null && b.mood <= 2)) &&
    !todayTypes.has('behavioral_drop')
  ) {
    detected.push(makeEpisode(userId, date, 'behavioral_drop', 'warning',
      'Behavioral drop: low energy or mood detected',
      { energyLevel: b.energyLevel ?? null, mood: b.mood ?? null },
    ))
    todayTypes.add('behavioral_drop')
  }

  // ── Behavioral Recovery (energy ≥ 4 and mood ≥ 4) ─────────────────────────
  if (
    b != null &&
    b.energyLevel != null &&
    b.mood != null &&
    b.energyLevel >= 4 &&
    b.mood >= 4 &&
    !todayTypes.has('behavioral_recovery')
  ) {
    detected.push(makeEpisode(userId, date, 'behavioral_recovery', 'info',
      'Behavioral recovery: positive energy and mood',
      { energyLevel: b.energyLevel, mood: b.mood },
    ))
    todayTypes.add('behavioral_recovery')
  }

  return detected
}

/**
 * Append a new episode to an existing list.
 * Returns a new array — does not mutate input.
 */
export function appendEpisode(episodes: EpisodicEvent[], event: EpisodicEvent): EpisodicEvent[] {
  return [...episodes, event]
}

/**
 * Get episodes recorded within the last N days.
 * Uses `recordedAt` as the reference timestamp.
 */
export function getRecentEpisodes(episodes: EpisodicEvent[], days: number): EpisodicEvent[] {
  if (days <= 0) return []
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return episodes.filter((e) => new Date(e.recordedAt).getTime() >= cutoff)
}

/**
 * Remove episodes older than maxAgeDays.
 * Returns a new array — does not mutate input.
 */
export function expireEpisodes(episodes: EpisodicEvent[], maxAgeDays: number): EpisodicEvent[] {
  return getRecentEpisodes(episodes, maxAgeDays)
}

/**
 * Check if a specific episode type already exists for a given date.
 */
export function hasTodayEpisode(
  episodes: EpisodicEvent[],
  date: string,
  type: EpisodicEventType,
): boolean {
  return episodes.some((e) => e.date === date && e.type === type)
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function makeEpisode(
  userId: string,
  date: string,
  type: EpisodicEventType,
  severity: EpisodicEvent['severity'],
  summary: string,
  metadata: Record<string, unknown>,
): EpisodicEvent {
  return {
    eventId: generateMemoryId('ep'),
    userId,
    type,
    summary,
    date,
    recordedAt: new Date().toISOString(),
    severity,
    metadata,
  }
}
