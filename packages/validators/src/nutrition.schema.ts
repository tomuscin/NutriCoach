// Nutrition Zod schemas — meals, daily logs

import { z } from 'zod'

export const MealTypeSchema = z.enum([
  'BREAKFAST', 'LUNCH', 'DINNER', 'SNACK',
  'PRE_WORKOUT', 'POST_WORKOUT', 'SUPPLEMENT',
])

export const MealSourceSchema = z.enum([
  'MANUAL', 'AI_EXTRACTED', 'OCR', 'PHOTO_ANALYSIS', 'EXCEL_IMPORT',
])

/** Macros — always validated together for caloric consistency. */
export const MacrosSchema = z.object({
  calories: z.number().min(0).max(5000),
  proteinG: z.number().min(0).max(500),
  carbsG: z.number().min(0).max(1000),
  fatG: z.number().min(0).max(500),
  fiberG: z.number().min(0).max(200).optional(),
  sodiumMg: z.number().min(0).max(20000).optional(),
  sugarG: z.number().min(0).max(500).optional(),
})

export type MacrosInput = z.infer<typeof MacrosSchema>

export const CreateMealSchema = z.object({
  mealType: MealTypeSchema,
  name: z.string().min(1).max(200).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format').optional(),
  source: MealSourceSchema.default('MANUAL'),
  ...MacrosSchema.shape,
  notes: z.string().max(500).optional(),
})

export type CreateMealInput = z.infer<typeof CreateMealSchema>

export const UpdateMealSchema = CreateMealSchema.partial()
export type UpdateMealInput = z.infer<typeof UpdateMealSchema>

/** Daily log patch — update water, notes, completedAt */
export const UpdateDailyLogSchema = z.object({
  waterMl: z.number().min(0).max(10000).optional(),
  notes: z.string().max(1000).optional(),
  completedAt: z.string().datetime().optional().nullable(),
})

export type UpdateDailyLogInput = z.infer<typeof UpdateDailyLogSchema>

/** Validate that macros are calorically plausible (soft check). */
export const MacrosConsistencySchema = MacrosSchema.superRefine((data, ctx) => {
  const estimated = data.proteinG * 4 + data.carbsG * 4 + data.fatG * 9
  const delta = Math.abs(estimated - data.calories)
  if (delta > data.calories * 0.15) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Calories inconsistent with macros (estimated ${Math.round(estimated)} kcal)`,
      path: ['calories'],
    })
  }
})
