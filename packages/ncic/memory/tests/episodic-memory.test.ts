/**
 * Tests: NCIC Episodic Memory
 *
 * Covers:
 *   - detectEpisodes() — all detection rules
 *   - appendEpisode()
 *   - getRecentEpisodes()
 *   - expireEpisodes()
 *   - hasTodayEpisode()
 *   - Duplicate prevention (same type + date)
 *   - Severity levels
 *   - Empty/null snapshots
 */

import { describe, it, expect } from 'vitest'
import {
  detectEpisodes,
  appendEpisode,
  getRecentEpisodes,
  expireEpisodes,
  hasTodayEpisode,
} from '../episodic-memory'
import { createEmptySnapshot } from '../../runtime/state'
import type { RuntimeContextSnapshot } from '../../runtime/state'
import type { EpisodicEvent } from '../types'

// ─── Factories ────────────────────────────────────────────────────────────────

const DATE = '2026-05-14'
const USER = 'u-episodic-test'

function makeSnapshot(overrides?: Partial<RuntimeContextSnapshot>): RuntimeContextSnapshot {
  return { ...createEmptySnapshot(USER, DATE), ...overrides }
}

function makeEpisode(type: EpisodicEvent['type'], date = DATE, daysAgo = 0): EpisodicEvent {
  const recordedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
  return {
    eventId: `ep-${Math.random().toString(36).slice(2)}`,
    userId: USER,
    type,
    summary: `test ${type}`,
    date,
    recordedAt,
    severity: 'info',
    metadata: {},
  }
}

// ─── detectEpisodes — empty snapshot ──────────────────────────────────────────

describe('detectEpisodes — empty snapshot', () => {
  it('returns empty array for completely empty snapshot', () => {
    const snap = makeSnapshot()
    const eps = detectEpisodes(USER, DATE, snap, [])
    expect(eps).toHaveLength(0)
  })

  it('returns empty when all signal domains are null', () => {
    const snap = createEmptySnapshot(USER, DATE)
    expect(detectEpisodes(USER, DATE, snap, [])).toHaveLength(0)
  })
})

// ─── detectEpisodes — low_recovery ────────────────────────────────────────────

describe('detectEpisodes — low_recovery', () => {
  it('detects low_recovery for poor recovery status', () => {
    const snap = makeSnapshot({
      recovery: { status: 'poor', readinessScore: 35, lastUpdated: `${DATE}T07:00:00Z` },
    })
    const eps = detectEpisodes(USER, DATE, snap, [])
    expect(eps.some((e) => e.type === 'low_recovery')).toBe(true)
  })

  it('low_recovery has warning severity', () => {
    const snap = makeSnapshot({
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
    })
    const eps = detectEpisodes(USER, DATE, snap, [])
    const ep = eps.find((e) => e.type === 'low_recovery')
    expect(ep?.severity).toBe('warning')
  })

  it('does NOT detect low_recovery for good recovery', () => {
    const snap = makeSnapshot({
      recovery: { status: 'good', readinessScore: 75, lastUpdated: `${DATE}T07:00:00Z` },
    })
    const eps = detectEpisodes(USER, DATE, snap, [])
    expect(eps.some((e) => e.type === 'low_recovery')).toBe(false)
  })

  it('does NOT detect low_recovery for optimal recovery', () => {
    const snap = makeSnapshot({
      recovery: { status: 'optimal', lastUpdated: `${DATE}T07:00:00Z` },
    })
    expect(detectEpisodes(USER, DATE, snap, []).some((e) => e.type === 'low_recovery')).toBe(false)
  })

  it('does not duplicate low_recovery for same date', () => {
    const snap = makeSnapshot({
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
    })
    const existing = [makeEpisode('low_recovery', DATE)]
    const eps = detectEpisodes(USER, DATE, snap, existing)
    expect(eps.some((e) => e.type === 'low_recovery')).toBe(false)
  })
})

// ─── detectEpisodes — overtraining_detected ───────────────────────────────────

describe('detectEpisodes — overtraining_detected', () => {
  it('detects overtraining when TSS > 120 and recovery is poor', () => {
    const snap = makeSnapshot({
      training: { durationMinutes: 180, tss: 135, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
    })
    const eps = detectEpisodes(USER, DATE, snap, [])
    expect(eps.some((e) => e.type === 'overtraining_detected')).toBe(true)
  })

  it('overtraining has critical severity', () => {
    const snap = makeSnapshot({
      training: { durationMinutes: 180, tss: 135, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
    })
    const ep = detectEpisodes(USER, DATE, snap, []).find((e) => e.type === 'overtraining_detected')
    expect(ep?.severity).toBe('critical')
  })

  it('does NOT detect overtraining when TSS = 120 (threshold is strict >)', () => {
    const snap = makeSnapshot({
      training: { durationMinutes: 120, tss: 120, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
    })
    const eps = detectEpisodes(USER, DATE, snap, [])
    expect(eps.some((e) => e.type === 'overtraining_detected')).toBe(false)
  })

  it('does NOT detect overtraining when recovery is not poor', () => {
    const snap = makeSnapshot({
      training: { durationMinutes: 180, tss: 135, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'moderate', lastUpdated: `${DATE}T07:00:00Z` },
    })
    expect(detectEpisodes(USER, DATE, snap, []).some((e) => e.type === 'overtraining_detected')).toBe(false)
  })

  it('does not duplicate overtraining for same date', () => {
    const snap = makeSnapshot({
      training: { durationMinutes: 180, tss: 135, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
    })
    const existing = [makeEpisode('overtraining_detected', DATE)]
    expect(detectEpisodes(USER, DATE, snap, existing).some((e) => e.type === 'overtraining_detected')).toBe(false)
  })
})

// ─── detectEpisodes — high_training_load ──────────────────────────────────────

describe('detectEpisodes — high_training_load', () => {
  it('detects high_training_load when TSS is 100–150 without poor recovery', () => {
    const snap = makeSnapshot({
      training: { durationMinutes: 120, tss: 110, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'good', lastUpdated: `${DATE}T07:00:00Z` },
    })
    const eps = detectEpisodes(USER, DATE, snap, [])
    expect(eps.some((e) => e.type === 'high_training_load')).toBe(true)
  })

  it('does NOT detect high_training_load when TSS = 100 (threshold is strict >)', () => {
    const snap = makeSnapshot({
      training: { durationMinutes: 100, tss: 100, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'good', lastUpdated: `${DATE}T07:00:00Z` },
    })
    expect(detectEpisodes(USER, DATE, snap, []).some((e) => e.type === 'high_training_load')).toBe(false)
  })

  it('does NOT detect high_training_load when TSS > 150 (that is pr_achieved territory)', () => {
    const snap = makeSnapshot({
      training: { durationMinutes: 200, tss: 160, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'good', lastUpdated: `${DATE}T07:00:00Z` },
    })
    expect(detectEpisodes(USER, DATE, snap, []).some((e) => e.type === 'high_training_load')).toBe(false)
  })
})

// ─── detectEpisodes — pr_achieved ─────────────────────────────────────────────

describe('detectEpisodes — pr_achieved', () => {
  it('detects pr_achieved when TSS > 150 and recovery is not poor', () => {
    const snap = makeSnapshot({
      training: { durationMinutes: 200, tss: 160, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'good', lastUpdated: `${DATE}T07:00:00Z` },
    })
    const eps = detectEpisodes(USER, DATE, snap, [])
    expect(eps.some((e) => e.type === 'pr_achieved')).toBe(true)
  })

  it('pr_achieved has info severity', () => {
    const snap = makeSnapshot({
      training: { durationMinutes: 200, tss: 160, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'good', lastUpdated: `${DATE}T07:00:00Z` },
    })
    const ep = detectEpisodes(USER, DATE, snap, []).find((e) => e.type === 'pr_achieved')
    expect(ep?.severity).toBe('info')
  })

  it('does NOT detect pr_achieved when recovery is poor (overtraining takes priority)', () => {
    const snap = makeSnapshot({
      training: { durationMinutes: 200, tss: 160, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
    })
    expect(detectEpisodes(USER, DATE, snap, []).some((e) => e.type === 'pr_achieved')).toBe(false)
  })
})

// ─── detectEpisodes — nutrition ───────────────────────────────────────────────

describe('detectEpisodes — nutrition', () => {
  it('detects missed_nutrition when calories < 50% of target', () => {
    const snap = makeSnapshot({
      nutrition: {
        estimatedCalories: 800,
        estimatedProteinG: 50,
        estimatedCarbsG: 100,
        estimatedFatG: 25,
        dailyCalorieTarget: 2000,
        lastUpdated: `${DATE}T20:00:00Z`,
      },
    })
    const eps = detectEpisodes(USER, DATE, snap, [])
    expect(eps.some((e) => e.type === 'missed_nutrition')).toBe(true)
  })

  it('does NOT detect missed_nutrition without a daily target', () => {
    const snap = makeSnapshot({
      nutrition: {
        estimatedCalories: 500,
        estimatedProteinG: 30,
        estimatedCarbsG: 60,
        estimatedFatG: 15,
        lastUpdated: `${DATE}T20:00:00Z`,
      },
    })
    expect(detectEpisodes(USER, DATE, snap, []).some((e) => e.type === 'missed_nutrition')).toBe(false)
  })

  it('detects calorie_deficit_streak for 50–80% range', () => {
    const snap = makeSnapshot({
      nutrition: {
        estimatedCalories: 1300,
        estimatedProteinG: 80,
        estimatedCarbsG: 160,
        estimatedFatG: 45,
        dailyCalorieTarget: 2000,
        lastUpdated: `${DATE}T20:00:00Z`,
      },
    })
    const eps = detectEpisodes(USER, DATE, snap, [])
    expect(eps.some((e) => e.type === 'calorie_deficit_streak')).toBe(true)
  })

  it('detects nutrition_streak for > 80% of target', () => {
    const snap = makeSnapshot({
      nutrition: {
        estimatedCalories: 1800,
        estimatedProteinG: 120,
        estimatedCarbsG: 220,
        estimatedFatG: 60,
        dailyCalorieTarget: 2000,
        lastUpdated: `${DATE}T20:00:00Z`,
      },
    })
    const eps = detectEpisodes(USER, DATE, snap, [])
    expect(eps.some((e) => e.type === 'nutrition_streak')).toBe(true)
  })

  it('detects training_streak when training is logged', () => {
    const snap = makeSnapshot({
      training: { durationMinutes: 60, lastUpdated: `${DATE}T10:00:00Z` },
    })
    const eps = detectEpisodes(USER, DATE, snap, [])
    expect(eps.some((e) => e.type === 'training_streak')).toBe(true)
  })
})

// ─── detectEpisodes — behavioral ─────────────────────────────────────────────

describe('detectEpisodes — behavioral', () => {
  it('detects behavioral_drop when energyLevel ≤ 2', () => {
    const snap = makeSnapshot({
      behavioral: { energyLevel: 1, hasNotes: false, lastUpdated: `${DATE}T08:00:00Z` },
    })
    expect(detectEpisodes(USER, DATE, snap, []).some((e) => e.type === 'behavioral_drop')).toBe(true)
  })

  it('detects behavioral_drop when mood ≤ 2', () => {
    const snap = makeSnapshot({
      behavioral: { mood: 2, hasNotes: false, lastUpdated: `${DATE}T08:00:00Z` },
    })
    expect(detectEpisodes(USER, DATE, snap, []).some((e) => e.type === 'behavioral_drop')).toBe(true)
  })

  it('does NOT detect behavioral_drop when energy = 3 and mood = 3', () => {
    const snap = makeSnapshot({
      behavioral: { energyLevel: 3, mood: 3, hasNotes: false, lastUpdated: `${DATE}T08:00:00Z` },
    })
    expect(detectEpisodes(USER, DATE, snap, []).some((e) => e.type === 'behavioral_drop')).toBe(false)
  })

  it('detects behavioral_recovery when energy ≥ 4 and mood ≥ 4', () => {
    const snap = makeSnapshot({
      behavioral: { energyLevel: 5, mood: 4, hasNotes: false, lastUpdated: `${DATE}T08:00:00Z` },
    })
    expect(detectEpisodes(USER, DATE, snap, []).some((e) => e.type === 'behavioral_recovery')).toBe(true)
  })

  it('does NOT detect behavioral_recovery when only one score qualifies', () => {
    const snap = makeSnapshot({
      behavioral: { energyLevel: 5, mood: 3, hasNotes: false, lastUpdated: `${DATE}T08:00:00Z` },
    })
    expect(detectEpisodes(USER, DATE, snap, []).some((e) => e.type === 'behavioral_recovery')).toBe(false)
  })

  it('behavioral_drop has warning severity', () => {
    const snap = makeSnapshot({
      behavioral: { energyLevel: 1, hasNotes: false, lastUpdated: `${DATE}T08:00:00Z` },
    })
    const ep = detectEpisodes(USER, DATE, snap, []).find((e) => e.type === 'behavioral_drop')
    expect(ep?.severity).toBe('warning')
  })
})

// ─── appendEpisode ────────────────────────────────────────────────────────────

describe('appendEpisode', () => {
  it('appends an episode to empty list', () => {
    const ep = makeEpisode('low_recovery')
    const result = appendEpisode([], ep)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('low_recovery')
  })

  it('does not mutate original list', () => {
    const original: EpisodicEvent[] = [makeEpisode('low_recovery')]
    appendEpisode(original, makeEpisode('behavioral_drop'))
    expect(original).toHaveLength(1)
  })

  it('preserves order', () => {
    const ep1 = makeEpisode('low_recovery')
    const ep2 = makeEpisode('behavioral_drop')
    const result = appendEpisode([ep1], ep2)
    expect(result[0].type).toBe('low_recovery')
    expect(result[1].type).toBe('behavioral_drop')
  })
})

// ─── getRecentEpisodes ────────────────────────────────────────────────────────

describe('getRecentEpisodes', () => {
  it('returns empty for empty list', () => {
    expect(getRecentEpisodes([], 7)).toHaveLength(0)
  })

  it('returns episodes within the look-back window', () => {
    const fresh = makeEpisode('low_recovery', DATE, 0)
    const old = makeEpisode('low_recovery', '2026-01-01', 120)
    const result = getRecentEpisodes([fresh, old], 7)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('low_recovery')
  })

  it('returns empty when days = 0', () => {
    const fresh = makeEpisode('low_recovery', DATE, 0)
    expect(getRecentEpisodes([fresh], 0)).toHaveLength(0)
  })

  it('includes episode from exactly N days ago (within boundary)', () => {
    const recent = makeEpisode('behavioral_drop', DATE, 6) // 6 days ago
    const result = getRecentEpisodes([recent], 7)
    expect(result).toHaveLength(1)
  })
})

// ─── expireEpisodes ───────────────────────────────────────────────────────────

describe('expireEpisodes', () => {
  it('removes episodes older than maxAgeDays', () => {
    const old = makeEpisode('low_recovery', '2026-01-01', 50)
    const fresh = makeEpisode('behavioral_drop', DATE, 1)
    const result = expireEpisodes([old, fresh], 30)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('behavioral_drop')
  })

  it('keeps all episodes within maxAgeDays', () => {
    const episodes = [makeEpisode('low_recovery', DATE, 5), makeEpisode('behavioral_drop', DATE, 10)]
    expect(expireEpisodes(episodes, 30)).toHaveLength(2)
  })

  it('does not mutate original list', () => {
    const episodes = [makeEpisode('low_recovery', '2026-01-01', 100)]
    expireEpisodes(episodes, 30)
    expect(episodes).toHaveLength(1)
  })
})

// ─── hasTodayEpisode ──────────────────────────────────────────────────────────

describe('hasTodayEpisode', () => {
  it('returns true when type+date match', () => {
    const ep = makeEpisode('low_recovery', DATE)
    expect(hasTodayEpisode([ep], DATE, 'low_recovery')).toBe(true)
  })

  it('returns false when date does not match', () => {
    const ep = makeEpisode('low_recovery', '2026-05-13')
    expect(hasTodayEpisode([ep], DATE, 'low_recovery')).toBe(false)
  })

  it('returns false when type does not match', () => {
    const ep = makeEpisode('low_recovery', DATE)
    expect(hasTodayEpisode([ep], DATE, 'behavioral_drop')).toBe(false)
  })

  it('returns false for empty list', () => {
    expect(hasTodayEpisode([], DATE, 'low_recovery')).toBe(false)
  })
})
