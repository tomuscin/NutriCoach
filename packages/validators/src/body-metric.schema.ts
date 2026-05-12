// Body metric, sleep, and recovery Zod schemas

import { z } from 'zod'

export const MetricSourceSchema = z.enum([
  'MANUAL', 'GARMIN', 'TRAININGPEAKS', 'SMART_SCALE', 'EXCEL_IMPORT', 'CALCULATED',
])

// ─── Body Metric ─────────────────────────────────────────────────────────────

export const CreateBodyMetricSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: MetricSourceSchema.default('MANUAL'),
  weightKg: z.number().min(20).max(350).optional(),
  bodyFatPercent: z.number().min(2).max(70).optional(),
  muscleMassKg: z.number().min(10).max(200).optional(),
  waistCm: z.number().min(40).max(200).optional(),
  hipCm: z.number().min(40).max(200).optional(),
  hydrationPercent: z.number().min(20).max(90).optional(),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => {
    // At least one measurement must be provided
    return (
      data.weightKg !== undefined ||
      data.bodyFatPercent !== undefined ||
      data.muscleMassKg !== undefined ||
      data.waistCm !== undefined
    )
  },
  { message: 'At least one measurement must be provided' },
)

export type CreateBodyMetricInput = z.infer<typeof CreateBodyMetricSchema>

// ─── Sleep Metric ────────────────────────────────────────────────────────────

export const CreateSleepMetricSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: MetricSourceSchema.default('MANUAL'),
  sleepStart: z.string().datetime(),
  sleepEnd: z.string().datetime(),
  totalSleepMinutes: z.number().int().min(0).max(960).optional(),
  deepSleepMinutes: z.number().int().min(0).max(480).optional(),
  remSleepMinutes: z.number().int().min(0).max(480).optional(),
  lightSleepMinutes: z.number().int().min(0).max(480).optional(),
  awakeMinutes: z.number().int().min(0).max(240).optional(),
  sleepScore: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => new Date(data.sleepEnd) > new Date(data.sleepStart),
  { message: 'Sleep end must be after sleep start', path: ['sleepEnd'] },
)

export type CreateSleepMetricInput = z.infer<typeof CreateSleepMetricSchema>

// ─── Recovery Metric ─────────────────────────────────────────────────────────

export const RecoveryStatusSchema = z.enum(['PEAK', 'HIGH', 'MODERATE', 'LOW', 'VERY_LOW'])

export const CreateRecoveryMetricSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: MetricSourceSchema.default('MANUAL'),
  hrv: z.number().min(0).max(300).optional(),
  restingHR: z.number().int().min(20).max(120).optional(),
  readinessScore: z.number().int().min(0).max(100).optional(),
  fatigueScore: z.number().int().min(0).max(100).optional(),
  stressScore: z.number().int().min(0).max(100).optional(),
  recoveryScore: z.number().int().min(0).max(100).optional(),
  status: RecoveryStatusSchema.optional(),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => data.hrv !== undefined || data.restingHR !== undefined || data.readinessScore !== undefined,
  { message: 'At least one recovery metric must be provided' },
)

export type CreateRecoveryMetricInput = z.infer<typeof CreateRecoveryMetricSchema>
