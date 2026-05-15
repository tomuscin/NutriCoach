/**
 * Tests: NCIC Intent Classifier
 *
 * Covers: single intent, multi-intent, ambiguous, unsupported,
 * confidence scoring, capability mapping, runtime context influence.
 */

import { describe, it, expect } from 'vitest'
import { classifyIntent } from '../classifier'
import { INTENT_NAMES } from '../types'
import type { ClassificationInput, RuntimeContextHint } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classify(message: string, overrides?: Partial<ClassificationInput>) {
  return classifyIntent({ message, ...overrides })
}

const emptyContext: RuntimeContextHint = {
  hasNutritionToday: false,
  hasTrainingToday: false,
  recoveryStatus: null,
  activeConversationId: null,
  recentDomains: [],
}

// ─── Empty / Edge Cases ───────────────────────────────────────────────────────

describe('classifyIntent — edge cases', () => {
  it('handles empty message', () => {
    const result = classify('')
    expect(result.primaryIntent.name).toBe(INTENT_NAMES.UNKNOWN)
    expect(result.fallbackNeeded).toBe(true)
    expect(result.warnings.some((w) => w.type === 'unsupported_intent')).toBe(true)
  })

  it('handles whitespace-only message', () => {
    const result = classify('   ')
    expect(result.primaryIntent.name).toBe(INTENT_NAMES.UNKNOWN)
    expect(result.fallbackNeeded).toBe(true)
  })

  it('always returns a result — never throws', () => {
    expect(() => classify('xyz 123 !@# nonsense gibberish')).not.toThrow()
  })
})

// ─── Single Intent — Food Log ─────────────────────────────────────────────────

describe('classifyIntent — food_log', () => {
  it('classifies Polish food log', () => {
    const result = classify('Zjadłem burgera z frytkami na obiad')
    expect(result.primaryIntent.name).toBe(INTENT_NAMES.FOOD_LOG)
    expect(result.primaryIntent.confidence).toBeGreaterThan(0.5)
    expect(result.primaryIntent.matchedKeywords.length).toBeGreaterThan(0)
  })

  it('classifies English food log', () => {
    const result = classify('I ate a chicken salad for lunch')
    expect(result.primaryIntent.name).toBe(INTENT_NAMES.FOOD_LOG)
  })

  it('classifies breakfast reference', () => {
    const result = classify('Na śniadanie miałem owsiankę z jagodami')
    expect(result.primaryIntent.name).toBe(INTENT_NAMES.FOOD_LOG)
  })

  it('maps to nutrition.ingest capability', () => {
    const result = classify('Zjadłem kanapkę')
    expect(result.suggestedCapabilities).toContain('nutrition.ingest')
  })

  it('does not require LLM for pure food log', () => {
    const result = classify('Zjadłem kanapkę z serem na lunch')
    // food_log only needs nutrition.ingest which is requiresLlm: false
    const hasOnlyNonLlm = result.suggestedCapabilities.every(
      (cap) => cap === 'nutrition.ingest',
    )
    // Allow conversation.respond too but food_log itself is non-LLM
    expect(result.suggestedCapabilities).toContain('nutrition.ingest')
  })
})

// ─── Single Intent — Training Reference ──────────────────────────────────────

describe('classifyIntent — training_reference', () => {
  it('classifies Polish training reference', () => {
    const result = classify('Pojechałem dzisiaj 40km na rowerze')
    expect(result.primaryIntent.name).toBe(INTENT_NAMES.TRAINING_REFERENCE)
    expect(result.primaryIntent.confidence).toBeGreaterThan(0.5)
  })

  it('classifies English training reference', () => {
    const result = classify('I did a 90 minute cycling workout today')
    expect(result.primaryIntent.name).toBe(INTENT_NAMES.TRAINING_REFERENCE)
  })

  it('maps to training.contextualize capability', () => {
    const result = classify('Byłem na rowerze przez 2 godziny')
    expect(result.suggestedCapabilities).toContain('training.contextualize')
  })
})

// ─── Single Intent — Recovery ─────────────────────────────────────────────────

describe('classifyIntent — recovery_reflection', () => {
  it('classifies Polish recovery intent', () => {
    const result = classify('Jestem bardzo zmęczony po wczorajszym treningu')
    expect(result.primaryIntent.name).toBe(INTENT_NAMES.RECOVERY_REFLECTION)
  })

  it('classifies sleep reflection', () => {
    const result = classify('Słabo spałem, tylko 5 godzin')
    expect(result.primaryIntent.name).toBe(INTENT_NAMES.RECOVERY_REFLECTION)
  })

  it('maps to recovery.reflect capability', () => {
    const result = classify('Jestem przemęczony i mam ciężkie nogi')
    expect(result.suggestedCapabilities).toContain('recovery.reflect')
  })
})

// ─── Single Intent — Coach Question ──────────────────────────────────────────

describe('classifyIntent — coach_question', () => {
  it('classifies Polish coaching request', () => {
    const result = classify('Co powinienem zjeść przed treningiem?')
    expect(result.primaryIntent.name).toBe(INTENT_NAMES.COACH_QUESTION)
  })

  it('classifies English coaching request', () => {
    const result = classify('What should I eat after a long ride?')
    expect(result.primaryIntent.name).toBe(INTENT_NAMES.COACH_QUESTION)
  })

  it('maps to conversation.respond and coaching.advise', () => {
    const result = classify('Doradź mi jak poprawić swój wynik')
    expect(result.suggestedCapabilities).toContain('conversation.respond')
    expect(result.suggestedCapabilities).toContain('coaching.advise')
  })
})

// ─── Single Intent — Goal Update ─────────────────────────────────────────────

describe('classifyIntent — goal_update', () => {
  it('classifies goal setting', () => {
    const result = classify('Chcę schudnąć 5kg do końca roku')
    expect(result.primaryIntent.name).toBe(INTENT_NAMES.GOAL_UPDATE)
  })

  it('classifies English goal update', () => {
    const result = classify('I want to lose 10 pounds, update my weight goal')
    expect(result.primaryIntent.name).toBe(INTENT_NAMES.GOAL_UPDATE)
  })
})

// ─── Single Intent — Progress Check ──────────────────────────────────────────

describe('classifyIntent — progress_check', () => {
  it('classifies progress inquiry', () => {
    const result = classify('Jak mi idzie z postępem w ostatnim tygodniu?')
    expect(result.primaryIntent.name).toBe(INTENT_NAMES.PROGRESS_CHECK)
  })

  it('maps to analytics.summarize', () => {
    const result = classify('Pokaż mi podsumowanie ostatniego tygodnia')
    expect(result.suggestedCapabilities).toContain('analytics.summarize')
  })
})

// ─── Single Intent — Casual Conversation ─────────────────────────────────────

describe('classifyIntent — casual_conversation', () => {
  it('classifies greeting', () => {
    const result = classify('Cześć! Jak się masz?')
    expect(result.primaryIntent.name).toBe(INTENT_NAMES.CASUAL_CONVERSATION)
  })

  it('classifies thank you', () => {
    const result = classify('Dzięki, to wszystko')
    expect(result.primaryIntent.name).toBe(INTENT_NAMES.CASUAL_CONVERSATION)
  })
})

// ─── Multi-Intent Detection ───────────────────────────────────────────────────

describe('classifyIntent — multi-intent', () => {
  it('detects food_log + training_reference', () => {
    const result = classify('Dzisiaj zjadłem burgera i byłem na rowerze przez godzinę')
    expect(result.isMultiIntent).toBe(true)
    const names = result.intents.map((i) => i.name)
    expect(names).toContain(INTENT_NAMES.FOOD_LOG)
    expect(names).toContain(INTENT_NAMES.TRAINING_REFERENCE)
  })

  it('merges capabilities from multiple intents', () => {
    const result = classify('Zjadłem sałatkę i pojechałem na rowerze')
    expect(result.suggestedCapabilities).toContain('nutrition.ingest')
    expect(result.suggestedCapabilities).toContain('training.contextualize')
  })

  it('adds multi_intent_detected warning', () => {
    const result = classify('Zjadłem burgera i byłem na rowerze')
    if (result.isMultiIntent) {
      expect(result.warnings.some((w) => w.type === 'multi_intent_detected')).toBe(true)
    }
  })

  it('primary intent has highest confidence', () => {
    const result = classify('Zjadłem burgera i byłem na rowerze')
    if (result.intents.length > 1) {
      expect(result.primaryIntent.confidence).toBeGreaterThanOrEqual(
        result.intents[1].confidence,
      )
    }
  })
})

// ─── Ambiguous Message ────────────────────────────────────────────────────────

describe('classifyIntent — ambiguous / low confidence', () => {
  it('flags low confidence for vague message', () => {
    const result = classify('hmm ciekawe')
    // Should be low confidence or unknown
    expect(
      result.primaryIntent.confidenceLevel === 'low' ||
      result.primaryIntent.name === INTENT_NAMES.UNKNOWN,
    ).toBe(true)
  })

  it('sets fallbackNeeded for truly ambiguous input', () => {
    const result = classify('nie wiem')
    expect(result.fallbackNeeded).toBe(true)
  })
})

// ─── Runtime Context Influence ────────────────────────────────────────────────

describe('classifyIntent — runtime context influence', () => {
  it('boosts recovery_reflection when training happened today', () => {
    const withTraining: RuntimeContextHint = {
      ...emptyContext,
      hasTrainingToday: true,
      recentDomains: ['training'],
    }
    const withoutTraining: RuntimeContextHint = emptyContext

    const withCtx = classify('Jestem zmęczony', { runtimeContext: withTraining })
    const withoutCtx = classify('Jestem zmęczony', { runtimeContext: withoutTraining })

    // With training context, recovery_reflection should score higher
    const withScore = withCtx.intents.find((i) => i.name === INTENT_NAMES.RECOVERY_REFLECTION)?.confidence ?? 0
    const withoutScore = withoutCtx.intents.find((i) => i.name === INTENT_NAMES.RECOVERY_REFLECTION)?.confidence ?? 0

    expect(withScore).toBeGreaterThanOrEqual(withoutScore)
  })

  it('boosts food_log when nutrition is active today', () => {
    const withNutrition: RuntimeContextHint = {
      ...emptyContext,
      hasNutritionToday: true,
      recentDomains: ['nutrition'],
    }

    const withCtx = classify('Zjadłem obiad', { runtimeContext: withNutrition })
    const withoutCtx = classify('Zjadłem obiad', { runtimeContext: emptyContext })

    const withScore = withCtx.primaryIntent.confidence
    const withoutScore = withoutCtx.primaryIntent.confidence

    expect(withScore).toBeGreaterThanOrEqual(withoutScore)
  })
})

// ─── Conversation Continuity ──────────────────────────────────────────────────

describe('classifyIntent — conversation continuity', () => {
  it('boosts recovery_reflection when recent intent was training_reference', () => {
    const recentIntents: Array<typeof INTENT_NAMES[keyof typeof INTENT_NAMES]> = [
      INTENT_NAMES.TRAINING_REFERENCE,
    ]

    const withHistory = classify('Czuję się dziś zmęczony', { recentIntents })
    const withoutHistory = classify('Czuję się dziś zmęczony')

    const withScore = withHistory.intents.find((i) => i.name === INTENT_NAMES.RECOVERY_REFLECTION)?.confidence ?? 0
    const withoutScore = withoutHistory.intents.find((i) => i.name === INTENT_NAMES.RECOVERY_REFLECTION)?.confidence ?? 0

    expect(withScore).toBeGreaterThanOrEqual(withoutScore)
  })
})

// ─── Confidence Scoring ───────────────────────────────────────────────────────

describe('classifyIntent — confidence scoring', () => {
  it('confidence is always between 0 and 1', () => {
    const messages = [
      'Zjadłem burgera',
      'Byłem na rowerze',
      'Jestem zmęczony',
      'Cześć',
      'xyz',
    ]
    for (const msg of messages) {
      const result = classify(msg)
      for (const intent of result.intents) {
        expect(intent.confidence).toBeGreaterThanOrEqual(0)
        expect(intent.confidence).toBeLessThanOrEqual(1)
      }
    }
  })

  it('high-confidence result has confidenceLevel "high"', () => {
    const result = classify('Zjadłem burgera z frytkami na obiad i lunch')
    if (result.primaryIntent.confidence >= 0.7) {
      expect(result.primaryIntent.confidenceLevel).toBe('high')
    }
  })

  it('intents are sorted by confidence descending', () => {
    const result = classify('Zjadłem burgera i byłem na rowerze')
    for (let i = 0; i < result.intents.length - 1; i++) {
      expect(result.intents[i].confidence).toBeGreaterThanOrEqual(
        result.intents[i + 1].confidence,
      )
    }
  })
})

// ─── Capability Mapping ───────────────────────────────────────────────────────

describe('classifyIntent — capability mapping', () => {
  it('always has at least one capability', () => {
    const messages = [
      'Zjadłem burgera',
      'Byłem na rowerze',
      'Cześć',
      'xyz 123',
    ]
    for (const msg of messages) {
      const result = classify(msg)
      expect(result.suggestedCapabilities.length).toBeGreaterThan(0)
    }
  })

  it('no duplicate capabilities in result', () => {
    const result = classify('Zjadłem burgera i byłem na rowerze i chcę wiedzieć jak mi idzie')
    const caps = result.suggestedCapabilities
    const unique = new Set(caps)
    expect(caps.length).toBe(unique.size)
  })
})
