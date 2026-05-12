// Workout Zod schemas

import { z } from 'zod'

export const SportTypeSchema = z.enum([
  'CYCLING', 'RUNNING', 'SWIMMING', 'TRIATHLON', 'DUATHLON',
  'STRENGTH', 'MTB', 'GRAVEL', 'ROWING', 'SKIING', 'HIKING',
  'YOGA', 'CROSSFIT', 'WALK', 'ELLIPTICAL', 'PILATES', 'OTHER',
])

export const WorkoutSourceSchema = z.enum([
  'MANUAL', 'TRAININGPEAKS', 'GARMIN', 'EXCEL_IMPORT',
])

export const CreateWorkoutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sportType: SportTypeSchema.default('OTHER'),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  durationMinutes: z.number().min(1).max(1440),
  distanceKm: z.number().min(0).max(1000).optional(),
  elevationGainM: z.number().min(0).max(10000).optional(),
  indoor: z.boolean().default(false),

  // HR
  avgHR: z.number().int().min(30).max(250).optional(),
  maxHR: z.number().int().min(30).max(250).optional(),

  // Power
  avgPowerW: z.number().min(0).max(2000).optional(),
  normalizedPowerW: z.number().min(0).max(2000).optional(),
  avgCadence: z.number().min(0).max(200).optional(),

  // Energy
  caloriesBurned: z.number().min(0).max(10000).optional(),

  // Training load
  tss: z.number().min(0).max(1000).optional(),
  rpe: z.number().int().min(1).max(10).optional(),

  // Planning
  isPlanned: z.boolean().default(false),
  plannedDurationMin: z.number().min(1).max(1440).optional(),
  plannedTSS: z.number().min(0).max(1000).optional(),

  notes: z.string().max(2000).optional(),
}).refine(
  (data) => {
    if (data.avgHR && data.maxHR) return data.maxHR >= data.avgHR
    return true
  },
  { message: 'Max HR must be >= avg HR', path: ['maxHR'] },
).refine(
  (data) => {
    if (data.avgPowerW && data.normalizedPowerW) {
      return data.normalizedPowerW >= data.avgPowerW * 0.8
    }
    return true
  },
  { message: 'NP should be >= 80% of avg power', path: ['normalizedPowerW'] },
)

export type CreateWorkoutInput = z.infer<typeof CreateWorkoutSchema>

export const UpdateWorkoutSchema = CreateWorkoutSchema.partial().omit({ date: true })
export type UpdateWorkoutInput = z.infer<typeof UpdateWorkoutSchema>
