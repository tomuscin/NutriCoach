// AI Output Schemas — Zod validation for all AI-generated content
// ETAP 5 — Deterministic AI Coaching Runtime
// ETAP 5.5 — Added explainability fields to all schemas
//
// All AI responses MUST conform to one of these schemas.
// No free-form text output allowed — AI returns strict JSON.

import { z } from 'zod'

// ─── Shared sub-schemas ────────────────────────────────────────────────────

export const MacroRecommendationSchema = z.object({
  calories: z.number().int().min(1200).max(5000),
  protein: z.number().int().min(50).max(400),
  carbs: z.number().int().min(0).max(800),
  fat: z.number().int().min(20).max(300),
})
export type MacroRecommendation = z.infer<typeof MacroRecommendationSchema>

export const ReadinessLevelSchema = z.enum(['low', 'medium', 'high'])
export type ReadinessLevel = z.infer<typeof ReadinessLevelSchema>

export const WarningSchema = z.string().min(1).max(300)

// ─── Explainability (ETAP 5.5) ───────────────────────────────────────────────

export const ExplanationsSchema = z.object({
  primaryDrivers: z.array(z.string().min(5).max(150)).min(1).max(4),
  supportingSignals: z.array(z.string().min(5).max(150)).max(4),
  warnings: z.array(z.string().min(5).max(200)).max(3),
})
export type Explanations = z.infer<typeof ExplanationsSchema>

// ─── Morning Insight ─────────────────────────────────────────────────────────

export const MorningInsightSchema = z.object({
  summary: z.string().min(20).max(400),
  readiness: ReadinessLevelSchema,
  yesterdaySummary: z.string().min(10).max(300),
  recommendation: MacroRecommendationSchema,
  movement: z.string().min(5).max(200),
  recoveryNote: z.string().min(5).max(200).optional(),
  explanations: ExplanationsSchema,
  warnings: z.array(WarningSchema).max(3),
  confidence: z.number().min(0).max(1),
})
export type MorningInsight = z.infer<typeof MorningInsightSchema>

// ─── Midday Insight ──────────────────────────────────────────────────────────

export const MiddayInsightSchema = z.object({
  summary: z.string().min(20).max(300),
  remainingCalories: z.number().int().min(0).max(4000),
  remainingProtein: z.number().int().min(0).max(350),
  pacingStatus: z.enum(['ahead', 'on_track', 'behind', 'no_data']),
  tip: z.string().min(10).max(200),
  explanations: ExplanationsSchema,
  warnings: z.array(WarningSchema).max(2),
  confidence: z.number().min(0).max(1),
})
export type MiddayInsight = z.infer<typeof MiddayInsightSchema>

// ─── Evening Insight ─────────────────────────────────────────────────────────

export const EveningInsightSchema = z.object({
  summary: z.string().min(20).max(400),
  dayScore: z.number().int().min(0).max(100),
  calorieBalance: z.number().int().min(-3000).max(3000),
  proteinAchieved: z.boolean(),
  consistency: z.enum(['excellent', 'good', 'fair', 'poor']),
  tomorrowFocus: z.string().min(10).max(200),
  recoveryRecommendation: z.string().min(5).max(200).optional(),
  explanations: ExplanationsSchema,
  warnings: z.array(WarningSchema).max(3),
  confidence: z.number().min(0).max(1),
})
export type EveningInsight = z.infer<typeof EveningInsightSchema>

// ─── Union type for all insight types ────────────────────────────────────────

export type AIInsightPayload =
  | { type: 'morning'; data: MorningInsight }
  | { type: 'midday'; data: MiddayInsight }
  | { type: 'evening'; data: EveningInsight }

// ─── Parse helpers — safe, returns null on malformed ─────────────────────────

export function parseMorningInsight(raw: unknown): MorningInsight | null {
  const result = MorningInsightSchema.safeParse(raw)
  return result.success ? result.data : null
}

export function parseMiddayInsight(raw: unknown): MiddayInsight | null {
  const result = MiddayInsightSchema.safeParse(raw)
  return result.success ? result.data : null
}

export function parseEveningInsight(raw: unknown): EveningInsight | null {
  const result = EveningInsightSchema.safeParse(raw)
  return result.success ? result.data : null
}

// ─── Extract JSON from AI response string ────────────────────────────────────
// AI sometimes wraps JSON in markdown code blocks — strip them

export function extractJSON(text: string): unknown {
  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : text.trim()

  try {
    return JSON.parse(jsonStr)
  } catch {
    // Try to find JSON object anywhere in the string
    const objMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0])
      } catch {
        return null
      }
    }
    return null
  }
}
