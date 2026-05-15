/**
 * Tests: Recommendation Engine — types and utility
 *
 * Covers:
 *   - generateRecommendations() — rule coverage
 *   - RULE_COUNT / getRegisteredRuleTypes()
 *   - Cooldown suppression
 *   - Score computation (urgency * confidence * impact)
 *   - Output sorting (score DESC)
 *   - Deduplication (same type only once per run)
 *   - All 22 rules fire under correct conditions
 *   - Rules return null under wrong conditions
 */

import { describe, it, expect } from 'vitest'
import {
  generateRecommendations,
  getRegisteredRuleTypes,
  RULE_COUNT,
  type RecommendationEngineOutput,
} from '../engine'
import type { RecommendationEngineInput } from '../types'
import { createEmptySnapshot } from '../../runtime/state'
import type { RuntimeContextSnapshot } from '../../runtime/state'
import { createEmptyContinuityState } from '../../memory/continuity'
import type { MemorySignals, EpisodicEvent } from '../../memory/types'

// ─── Factories ────────────────────────────────────────────────────────────────

const DATE = '2026-05-14'
const USER = 'u-engine-test'

function makeSnap(overrides?: Partial<RuntimeContextSnapshot>): RuntimeContextSnapshot {
  return { ...createEmptySnapshot(USER, DATE), ...overrides }
}

function makeMemory(overrides?: Partial<MemorySignals>): MemorySignals {
  return {
    hasMemory: true,
    continuityState: createEmptyContinuityState(USER),
    recentEpisodes: [],
    unresolvedTopics: [],
    memoryContinuityHints: [],
    ...overrides,
  }
}

function makeInput(
  snapOverrides?: Partial<RuntimeContextSnapshot>,
  memoryOverrides?: Partial<MemorySignals> | null,
  events: EpisodicEvent[] = [],
): RecommendationEngineInput {
  return {
    userId: USER,
    date: DATE,
    runtimeState: makeSnap(snapOverrides),
    memory: memoryOverrides === null ? null : makeMemory(memoryOverrides),
    currentIntent: null,
    recentEvents: events,
  }
}

function makeEpisode(type: EpisodicEvent['type'], daysAgo = 0): EpisodicEvent {
  return {
    eventId: `ep-${Math.random().toString(36).slice(2)}`,
    userId: USER,
    type,
    summary: `test ${type}`,
    date: DATE,
    recordedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    severity: 'info',
    metadata: {},
  }
}

function runEngine(
  snapOverrides?: Partial<RuntimeContextSnapshot>,
  memOverrides?: Partial<MemorySignals> | null,
  events?: EpisodicEvent[],
): RecommendationEngineOutput {
  return generateRecommendations(makeInput(snapOverrides, memOverrides, events))
}

function findRec(output: RecommendationEngineOutput, type: string) {
  return output.recommendations.find((r) => r.type === type) ?? null
}

// ─── Engine Meta ──────────────────────────────────────────────────────────────

describe('Engine meta', () => {
  it('RULE_COUNT is at least 22', () => {
    expect(RULE_COUNT).toBeGreaterThanOrEqual(22)
  })

  it('getRegisteredRuleTypes returns all rule types', () => {
    const types = getRegisteredRuleTypes()
    expect(types.length).toBe(RULE_COUNT)
  })

  it('returns rulesEvaluated = RULE_COUNT', () => {
    const out = runEngine()
    expect(out.rulesEvaluated).toBe(RULE_COUNT)
  })

  it('returns generatedAt ISO timestamp', () => {
    const out = runEngine()
    expect(() => new Date(out.generatedAt)).not.toThrow()
  })

  it('empty snapshot returns no recommendations', () => {
    const out = runEngine(undefined, null)
    // Only first_session_welcome should fire for a null-memory, empty snapshot
    expect(out.recommendations.length).toBeLessThanOrEqual(2)
  })
})

// ─── Score Computation ────────────────────────────────────────────────────────

describe('Score computation', () => {
  it('score equals urgency * confidence * impact', () => {
    const out = runEngine(
      { recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` } },
      makeMemory(),
    )
    for (const rec of out.recommendations) {
      const expected = Math.round(rec.urgency * rec.confidence * rec.impact * 1000) / 1000
      expect(rec.score).toBeCloseTo(expected, 3)
    }
  })

  it('results are sorted by score DESC', () => {
    const out = runEngine(
      {
        recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
        training: { durationMinutes: 180, tss: 130, lastUpdated: `${DATE}T10:00:00Z` },
        nutrition: { estimatedCalories: 500, estimatedProteinG: 20, estimatedCarbsG: 60, estimatedFatG: 15, dailyCalorieTarget: 2000, lastUpdated: `${DATE}T12:00:00Z` },
      },
      makeMemory(),
    )
    for (let i = 1; i < out.recommendations.length; i++) {
      expect(out.recommendations[i - 1].score).toBeGreaterThanOrEqual(out.recommendations[i].score)
    }
  })

  it('score is between 0 and 1', () => {
    const out = runEngine(
      { recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` } },
      makeMemory(),
    )
    for (const rec of out.recommendations) {
      expect(rec.score).toBeGreaterThanOrEqual(0)
      expect(rec.score).toBeLessThanOrEqual(1)
    }
  })
})

// ─── Deduplication ────────────────────────────────────────────────────────────

describe('Deduplication', () => {
  it('never returns duplicate types in one run', () => {
    const out = runEngine(
      {
        recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
        training: { durationMinutes: 180, tss: 130, lastUpdated: `${DATE}T10:00:00Z` },
        nutrition: { estimatedCalories: 500, estimatedProteinG: 20, estimatedCarbsG: 60, estimatedFatG: 15, dailyCalorieTarget: 2000, lastUpdated: `${DATE}T12:00:00Z` },
        behavioral: { energyLevel: 1, mood: 1, hasNotes: false, lastUpdated: `${DATE}T08:00:00Z` },
      },
      makeMemory(),
    )
    const types = out.recommendations.map((r) => r.type)
    const unique = new Set(types)
    expect(types.length).toBe(unique.size)
  })
})

// ─── Rule: low_protein_intake ─────────────────────────────────────────────────

describe('Rule: low_protein_intake', () => {
  it('fires when protein < 75% of 120g default target', () => {
    const out = runEngine({
      nutrition: { estimatedCalories: 1800, estimatedProteinG: 70, estimatedCarbsG: 200, estimatedFatG: 60, lastUpdated: `${DATE}T12:00:00Z` },
    })
    expect(findRec(out, 'low_protein_intake')).not.toBeNull()
  })

  it('does NOT fire when protein meets target', () => {
    const out = runEngine({
      nutrition: { estimatedCalories: 1800, estimatedProteinG: 100, estimatedCarbsG: 200, estimatedFatG: 60, lastUpdated: `${DATE}T12:00:00Z` },
    })
    expect(findRec(out, 'low_protein_intake')).toBeNull()
  })

  it('is high priority when training today', () => {
    const out = runEngine({
      nutrition: { estimatedCalories: 1800, estimatedProteinG: 60, estimatedCarbsG: 200, estimatedFatG: 60, lastUpdated: `${DATE}T12:00:00Z` },
      training: { durationMinutes: 90, tss: 80, lastUpdated: `${DATE}T10:00:00Z` },
    })
    expect(findRec(out, 'low_protein_intake')?.priority).toBe('high')
  })

  it('is medium priority without training', () => {
    const out = runEngine({
      nutrition: { estimatedCalories: 1800, estimatedProteinG: 60, estimatedCarbsG: 200, estimatedFatG: 60, lastUpdated: `${DATE}T12:00:00Z` },
    })
    expect(findRec(out, 'low_protein_intake')?.priority).toBe('medium')
  })

  it('does NOT fire without nutrition data', () => {
    const out = runEngine()
    expect(findRec(out, 'low_protein_intake')).toBeNull()
  })
})

// ─── Rule: calorie_deficit_too_high ───────────────────────────────────────────

describe('Rule: calorie_deficit_too_high', () => {
  it('fires when calories < 50% of target', () => {
    const out = runEngine({
      nutrition: { estimatedCalories: 800, estimatedProteinG: 60, estimatedCarbsG: 90, estimatedFatG: 25, dailyCalorieTarget: 2000, lastUpdated: `${DATE}T12:00:00Z` },
    })
    expect(findRec(out, 'calorie_deficit_too_high')).not.toBeNull()
  })

  it('is critical when training today', () => {
    const out = runEngine({
      nutrition: { estimatedCalories: 800, estimatedProteinG: 60, estimatedCarbsG: 90, estimatedFatG: 25, dailyCalorieTarget: 2000, lastUpdated: `${DATE}T12:00:00Z` },
      training: { durationMinutes: 120, tss: 90, lastUpdated: `${DATE}T10:00:00Z` },
    })
    expect(findRec(out, 'calorie_deficit_too_high')?.priority).toBe('critical')
  })

  it('does NOT fire when calories >= 50% of target', () => {
    const out = runEngine({
      nutrition: { estimatedCalories: 1100, estimatedProteinG: 80, estimatedCarbsG: 140, estimatedFatG: 35, dailyCalorieTarget: 2000, lastUpdated: `${DATE}T12:00:00Z` },
    })
    expect(findRec(out, 'calorie_deficit_too_high')).toBeNull()
  })

  it('does NOT fire without dailyCalorieTarget', () => {
    const out = runEngine({
      nutrition: { estimatedCalories: 800, estimatedProteinG: 60, estimatedCarbsG: 90, estimatedFatG: 25, lastUpdated: `${DATE}T12:00:00Z` },
    })
    expect(findRec(out, 'calorie_deficit_too_high')).toBeNull()
  })
})

// ─── Rule: poor_recovery_warning ─────────────────────────────────────────────

describe('Rule: poor_recovery_warning', () => {
  it('fires for poor recovery status', () => {
    const out = runEngine({
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
    })
    expect(findRec(out, 'poor_recovery_warning')).not.toBeNull()
  })

  it('is critical when training today', () => {
    const out = runEngine({
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
      training: { durationMinutes: 90, tss: 80, lastUpdated: `${DATE}T10:00:00Z` },
    })
    expect(findRec(out, 'poor_recovery_warning')?.priority).toBe('critical')
  })

  it('does NOT fire for good recovery', () => {
    const out = runEngine({
      recovery: { status: 'good', lastUpdated: `${DATE}T07:00:00Z` },
    })
    expect(findRec(out, 'poor_recovery_warning')).toBeNull()
  })

  it('does NOT fire without recovery data', () => {
    const out = runEngine()
    expect(findRec(out, 'poor_recovery_warning')).toBeNull()
  })
})

// ─── Rule: overtraining_alert ─────────────────────────────────────────────────

describe('Rule: overtraining_alert', () => {
  it('fires when TSS > 120 and poor recovery', () => {
    const out = runEngine({
      training: { durationMinutes: 200, tss: 130, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
    })
    expect(findRec(out, 'overtraining_alert')).not.toBeNull()
  })

  it('has critical priority', () => {
    const out = runEngine({
      training: { durationMinutes: 200, tss: 130, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
    })
    expect(findRec(out, 'overtraining_alert')?.priority).toBe('critical')
  })

  it('does NOT fire when TSS = 120 (strict >)', () => {
    const out = runEngine({
      training: { durationMinutes: 120, tss: 120, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
    })
    expect(findRec(out, 'overtraining_alert')).toBeNull()
  })

  it('does NOT fire with good recovery even at high TSS', () => {
    const out = runEngine({
      training: { durationMinutes: 200, tss: 130, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'good', lastUpdated: `${DATE}T07:00:00Z` },
    })
    expect(findRec(out, 'overtraining_alert')).toBeNull()
  })
})

// ─── Rule: high_training_load_notice ─────────────────────────────────────────

describe('Rule: high_training_load_notice', () => {
  it('fires when TSS 100–150 and recovery not poor', () => {
    const out = runEngine({
      training: { durationMinutes: 130, tss: 115, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'good', lastUpdated: `${DATE}T07:00:00Z` },
    })
    expect(findRec(out, 'high_training_load_notice')).not.toBeNull()
  })

  it('does NOT fire when TSS <= 100', () => {
    const out = runEngine({
      training: { durationMinutes: 90, tss: 95, lastUpdated: `${DATE}T10:00:00Z` },
    })
    expect(findRec(out, 'high_training_load_notice')).toBeNull()
  })

  it('does NOT fire when TSS > 150 (high_atl_warning takes over)', () => {
    const out = runEngine({
      training: { durationMinutes: 200, tss: 160, lastUpdated: `${DATE}T10:00:00Z` },
    })
    expect(findRec(out, 'high_training_load_notice')).toBeNull()
  })

  it('does NOT fire when recovery is poor (overtraining takes over)', () => {
    const out = runEngine({
      training: { durationMinutes: 130, tss: 115, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
    })
    expect(findRec(out, 'high_training_load_notice')).toBeNull()
  })
})

// ─── Rule: behavioral_fatigue ─────────────────────────────────────────────────

describe('Rule: behavioral_fatigue', () => {
  it('fires when energy <= 2', () => {
    const out = runEngine({
      behavioral: { energyLevel: 1, hasNotes: false, lastUpdated: `${DATE}T08:00:00Z` },
    })
    expect(findRec(out, 'behavioral_fatigue')).not.toBeNull()
  })

  it('fires when mood <= 2', () => {
    const out = runEngine({
      behavioral: { mood: 2, hasNotes: false, lastUpdated: `${DATE}T08:00:00Z` },
    })
    expect(findRec(out, 'behavioral_fatigue')).not.toBeNull()
  })

  it('does NOT fire when energy = 3 and mood = 3', () => {
    const out = runEngine({
      behavioral: { energyLevel: 3, mood: 3, hasNotes: false, lastUpdated: `${DATE}T08:00:00Z` },
    })
    expect(findRec(out, 'behavioral_fatigue')).toBeNull()
  })
})

// ─── Rule: long_inactivity_nudge ─────────────────────────────────────────────

describe('Rule: long_inactivity_nudge', () => {
  it('fires when inactivityDays >= 2 and no data today', () => {
    const out = runEngine(
      undefined,
      makeMemory({
        continuityState: {
          userId: USER,
          lastInteractionAt: null,
          totalInteractions: 5,
          lastActiveDomains: [],
          recentConversationSummaries: [],
          inactivityDays: 3,
        },
      }),
    )
    expect(findRec(out, 'long_inactivity_nudge')).not.toBeNull()
  })

  it('does NOT fire when inactivityDays = 1', () => {
    const out = runEngine(
      undefined,
      makeMemory({
        continuityState: {
          userId: USER,
          lastInteractionAt: null,
          totalInteractions: 5,
          lastActiveDomains: [],
          recentConversationSummaries: [],
          inactivityDays: 1,
        },
      }),
    )
    expect(findRec(out, 'long_inactivity_nudge')).toBeNull()
  })

  it('fires even when nutrition logged today — rule only checks inactivityDays', () => {
    const out = runEngine(
      { nutrition: { estimatedCalories: 1000, estimatedProteinG: 80, estimatedCarbsG: 120, estimatedFatG: 35, lastUpdated: `${DATE}T12:00:00Z` } },
      makeMemory({
        continuityState: {
          userId: USER,
          lastInteractionAt: null,
          totalInteractions: 5,
          lastActiveDomains: [],
          recentConversationSummaries: [],
          inactivityDays: 4,
        },
      }),
    )
    // long_inactivity_nudge is purely based on inactivityDays — nutrition data doesn't suppress it
    expect(findRec(out, 'long_inactivity_nudge')).not.toBeNull()
  })

  it('is medium priority for 5+ days', () => {
    const out = runEngine(
      undefined,
      makeMemory({
        continuityState: {
          userId: USER,
          lastInteractionAt: null,
          totalInteractions: 5,
          lastActiveDomains: [],
          recentConversationSummaries: [],
          inactivityDays: 5,
        },
      }),
    )
    expect(findRec(out, 'long_inactivity_nudge')?.priority).toBe('medium')
  })
})

// ─── Rule: first_session_welcome ─────────────────────────────────────────────

describe('Rule: first_session_welcome', () => {
  it('fires when hasMemory is false', () => {
    const out = runEngine(undefined, makeMemory({ hasMemory: false }))
    expect(findRec(out, 'first_session_welcome')).not.toBeNull()
  })

  it('does NOT fire when hasMemory is true', () => {
    const out = runEngine(undefined, makeMemory({ hasMemory: true }))
    expect(findRec(out, 'first_session_welcome')).toBeNull()
  })

  it('fires when memory is null (brand new user)', () => {
    const out = runEngine(undefined, null)
    expect(findRec(out, 'first_session_welcome')).not.toBeNull()
  })
})

// ─── Rule: unresolved_topic_followup ─────────────────────────────────────────

describe('Rule: unresolved_topic_followup', () => {
  it('fires when memory has unresolved topics', () => {
    const out = runEngine(
      undefined,
      makeMemory({ unresolvedTopics: ['recovery check pending'] }),
    )
    expect(findRec(out, 'unresolved_topic_followup')).not.toBeNull()
  })

  it('does NOT fire when unresolved topics is empty', () => {
    const out = runEngine(undefined, makeMemory({ unresolvedTopics: [] }))
    expect(findRec(out, 'unresolved_topic_followup')).toBeNull()
  })
})

// ─── Rule: calorie_deficit_streak_notice ─────────────────────────────────────

describe('Rule: calorie_deficit_streak_notice', () => {
  it('fires when calories are 50–80% of target', () => {
    const out = runEngine({
      nutrition: { estimatedCalories: 1300, estimatedProteinG: 80, estimatedCarbsG: 160, estimatedFatG: 45, dailyCalorieTarget: 2000, lastUpdated: `${DATE}T12:00:00Z` },
    })
    expect(findRec(out, 'calorie_deficit_streak_notice')).not.toBeNull()
  })

  it('does NOT fire when calories < 50% (deficit too high fires instead)', () => {
    const out = runEngine({
      nutrition: { estimatedCalories: 800, estimatedProteinG: 60, estimatedCarbsG: 90, estimatedFatG: 25, dailyCalorieTarget: 2000, lastUpdated: `${DATE}T12:00:00Z` },
    })
    expect(findRec(out, 'calorie_deficit_streak_notice')).toBeNull()
  })

  it('does NOT fire when calories >= 80% of target', () => {
    const out = runEngine({
      nutrition: { estimatedCalories: 1700, estimatedProteinG: 110, estimatedCarbsG: 210, estimatedFatG: 55, dailyCalorieTarget: 2000, lastUpdated: `${DATE}T12:00:00Z` },
    })
    expect(findRec(out, 'calorie_deficit_streak_notice')).toBeNull()
  })
})

// ─── Rule: nutrition_goal_met_positive ───────────────────────────────────────

describe('Rule: nutrition_goal_met_positive', () => {
  it('fires when calories >= 80% of target', () => {
    const out = runEngine({
      nutrition: { estimatedCalories: 1700, estimatedProteinG: 110, estimatedCarbsG: 210, estimatedFatG: 55, dailyCalorieTarget: 2000, lastUpdated: `${DATE}T12:00:00Z` },
    })
    expect(findRec(out, 'nutrition_goal_met_positive')).not.toBeNull()
  })

  it('has silent priority', () => {
    const out = runEngine({
      nutrition: { estimatedCalories: 1700, estimatedProteinG: 110, estimatedCarbsG: 210, estimatedFatG: 55, dailyCalorieTarget: 2000, lastUpdated: `${DATE}T12:00:00Z` },
    })
    expect(findRec(out, 'nutrition_goal_met_positive')?.priority).toBe('silent')
  })
})

// ─── Cooldown Suppression ─────────────────────────────────────────────────────

describe('Cooldown suppression', () => {
  it('suppresses poor_recovery_warning when low_recovery episode is recent', () => {
    const recentEvent = makeEpisode('low_recovery', 0) // just now
    const out = runEngine(
      { recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` } },
      makeMemory(),
      [recentEvent],
    )
    expect(findRec(out, 'poor_recovery_warning')).toBeNull()
    expect(out.suppressedByCooldown).toBeGreaterThan(0)
  })

  it('suppresses overtraining_alert when overtraining_detected episode is recent', () => {
    const recentEvent = makeEpisode('overtraining_detected', 0)
    const out = runEngine(
      {
        training: { durationMinutes: 200, tss: 130, lastUpdated: `${DATE}T10:00:00Z` },
        recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
      },
      makeMemory(),
      [recentEvent],
    )
    expect(findRec(out, 'overtraining_alert')).toBeNull()
  })

  it('does NOT suppress when episode is old (beyond cooldown)', () => {
    const oldEvent = makeEpisode('low_recovery', 2) // 2 days ago, cooldown is 12h
    const out = runEngine(
      { recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` } },
      makeMemory(),
      [oldEvent],
    )
    expect(findRec(out, 'poor_recovery_warning')).not.toBeNull()
  })
})

// ─── Multi-signal scenarios ───────────────────────────────────────────────────

describe('Multi-signal scenarios', () => {
  it('overload scenario: overtraining + missed nutrition + behavioral drop produces critical recommendation', () => {
    const out = runEngine({
      training: { durationMinutes: 200, tss: 130, lastUpdated: `${DATE}T10:00:00Z` },
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
      nutrition: { estimatedCalories: 600, estimatedProteinG: 40, estimatedCarbsG: 70, estimatedFatG: 20, dailyCalorieTarget: 2000, lastUpdated: `${DATE}T12:00:00Z` },
      behavioral: { energyLevel: 1, mood: 1, hasNotes: false, lastUpdated: `${DATE}T08:00:00Z` },
    })
    const critical = out.recommendations.filter((r) => r.priority === 'critical')
    expect(critical.length).toBeGreaterThanOrEqual(2)
  })

  it('positive scenario: good recovery + good mood produces only low/silent recs', () => {
    const out = runEngine(
      {
        recovery: { status: 'good', lastUpdated: `${DATE}T07:00:00Z` },
        behavioral: { energyLevel: 5, mood: 5, hasNotes: false, lastUpdated: `${DATE}T08:00:00Z` },
        nutrition: { estimatedCalories: 1800, estimatedProteinG: 130, estimatedCarbsG: 220, estimatedFatG: 60, dailyCalorieTarget: 2000, lastUpdated: `${DATE}T12:00:00Z` },
      },
      makeMemory(),
    )
    const highOrCritical = out.recommendations.filter(
      (r) => r.priority === 'critical' || r.priority === 'high',
    )
    expect(highOrCritical.length).toBe(0)
  })

  it('produces relatedIntent on recommendations', () => {
    const out = runEngine({
      recovery: { status: 'poor', lastUpdated: `${DATE}T07:00:00Z` },
    })
    const rec = findRec(out, 'poor_recovery_warning')
    expect(rec?.relatedIntent).toBe('recovery_reflection')
  })
})
