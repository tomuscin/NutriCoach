// AI Safety Layer — ETAP 5
// Guards against:
//   1. Prompt injection attacks
//   2. Off-topic requests
//   3. Dangerous AI output (nutrition safety bounds, medical advice)
//
// Hard rules are enforced BEFORE sending to LLM and AFTER receiving AI output.
// AI output that violates safety rules is rejected — dashboard gets fallback.

import type { MorningInsight, MiddayInsight, EveningInsight } from './schemas'

// ─── Prompt injection patterns ────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /ignore all prior/i,
  /you are now/i,
  /pretend you are/i,
  /act as if/i,
  /jailbreak/i,
  /DAN mode/i,
  /disregard your/i,
  /forget everything/i,
  /new persona/i,
]

const OFF_TOPIC_KEYWORDS = [
  'polityka', 'religia', 'medycyna kliniczna', 'diagnoza',
  'dawkowanie leku', 'samobójstwo', 'depresja kliniczna',
]

export type SafetyCheckResult = {
  safe: boolean
  reason?: string
}

// ─── Input safety (pre-LLM) ───────────────────────────────────────────────────

export function checkMessageSafety(message: string): SafetyCheckResult {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return {
        safe: false,
        reason: 'Wykryto potencjalny atak prompt injection. Wiadomość zablokowana.',
      }
    }
  }

  const lower = message.toLowerCase()
  for (const keyword of OFF_TOPIC_KEYWORDS) {
    if (lower.includes(keyword)) {
      return {
        safe: false,
        reason: `Temat "${keyword}" wykracza poza zakres Leaxaro. Skonsultuj się z odpowiednim specjalistą.`,
      }
    }
  }

  return { safe: true }
}

export function sanitizeInput(message: string, maxLength = 2000): string {
  return message.trim().slice(0, maxLength)
}

// ─── Nutrition safety bounds (hard rules) ─────────────────────────────────────
// These are absolute limits — AI cannot recommend values outside these bounds.
// Based on conservative sports nutrition guidelines.

export const NUTRITION_BOUNDS = {
  calories: { min: 1400, max: 4500 },    // kcal — minimum viable + high performance max
  protein: { min: 80, max: 300 },         // g — min 1g/kg for 80kg, max ~3.5g/kg
  carbs: { min: 50, max: 700 },           // g
  fat: { min: 25, max: 250 },             // g — min for hormonal health
} as const

// ─── Output safety validation ─────────────────────────────────────────────────

export type OutputSafetyResult = {
  safe: boolean
  violations: string[]
  sanitized?: object
}

export function validateMorningOutput(insight: MorningInsight): OutputSafetyResult {
  const violations: string[] = []
  const rec = insight.recommendation

  if (rec.calories < NUTRITION_BOUNDS.calories.min) {
    violations.push(`Kalorie poniżej minimum bezpieczeństwa (${rec.calories} < ${NUTRITION_BOUNDS.calories.min})`)
  }
  if (rec.calories > NUTRITION_BOUNDS.calories.max) {
    violations.push(`Kalorie powyżej maksimum (${rec.calories} > ${NUTRITION_BOUNDS.calories.max})`)
  }
  if (rec.protein < NUTRITION_BOUNDS.protein.min) {
    violations.push(`Białko poniżej minimum (${rec.protein} < ${NUTRITION_BOUNDS.protein.min})`)
  }
  if (rec.fat < NUTRITION_BOUNDS.fat.min) {
    violations.push(`Tłuszcze poniżej minimum zdrowotnego (${rec.fat} < ${NUTRITION_BOUNDS.fat.min})`)
  }

  // Check for medical advice in summary/notes
  const textFields = [insight.summary, insight.yesterdaySummary, insight.movement, insight.recoveryNote ?? '']
  for (const text of textFields) {
    if (containsMedicalAdvice(text)) {
      violations.push('Wykryto potencjalnie medyczne sformułowania w output AI')
      break
    }
  }

  return {
    safe: violations.length === 0,
    violations,
    sanitized: violations.length > 0 ? clampMorningRecommendation(insight) : undefined,
  }
}

export function validateMiddayOutput(insight: MiddayInsight): OutputSafetyResult {
  const violations: string[] = []

  if (insight.remainingCalories < 0) {
    violations.push('Ujemne pozostałe kalorie — nieprawidłowy output')
  }

  return { safe: violations.length === 0, violations }
}

export function validateEveningOutput(insight: EveningInsight): OutputSafetyResult {
  const violations: string[] = []

  if (insight.dayScore < 0 || insight.dayScore > 100) {
    violations.push(`dayScore poza zakresem 0-100: ${insight.dayScore}`)
  }

  return { safe: violations.length === 0, violations }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MEDICAL_PATTERNS = [
  /diagnoz/i,
  /chorob/i,
  /leczeni/i,
  /lek[aó]/i,
  /dawkowanie/i,
  /insulina/i,
  /glukoza/i,
  /kardiolog/i,
  /endokrynolog/i,
]

function containsMedicalAdvice(text: string): boolean {
  return MEDICAL_PATTERNS.some((p) => p.test(text))
}

function clampMorningRecommendation(insight: MorningInsight): MorningInsight {
  return {
    ...insight,
    recommendation: {
      calories: Math.max(NUTRITION_BOUNDS.calories.min, Math.min(NUTRITION_BOUNDS.calories.max, insight.recommendation.calories)),
      protein: Math.max(NUTRITION_BOUNDS.protein.min, Math.min(NUTRITION_BOUNDS.protein.max, insight.recommendation.protein)),
      carbs: Math.max(NUTRITION_BOUNDS.carbs.min, Math.min(NUTRITION_BOUNDS.carbs.max, insight.recommendation.carbs)),
      fat: Math.max(NUTRITION_BOUNDS.fat.min, Math.min(NUTRITION_BOUNDS.fat.max, insight.recommendation.fat)),
    },
    confidence: Math.max(0, insight.confidence - 0.2), // lower confidence on clamped output
    warnings: [
      ...insight.warnings,
      'Zalecenia zostały dostosowane do limitów bezpieczeństwa.',
    ].slice(0, 3),
  }
}
