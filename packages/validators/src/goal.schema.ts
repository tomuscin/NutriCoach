// Goal Zod schemas

import { z } from 'zod'

export const GoalTypeSchema = z.enum(['REDUCTION', 'MAINTENANCE', 'GAIN', 'PERFORMANCE'])
export const GoalPrioritySchema = z.enum(['PERFORMANCE', 'BALANCED', 'AGGRESSIVE_CUT'])
export const GoalStatusSchema = z.enum(['ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED', 'ARCHIVED'])

export const CreateGoalSchema = z.object({
  type: GoalTypeSchema,
  priority: GoalPrioritySchema.default('BALANCED'),
  startWeightKg: z.number().min(30).max(300),
  targetWeightKg: z.number().min(30).max(300),
  startFTP: z.number().min(50).max(600).optional(),
  targetFTP: z.number().min(50).max(600).optional(),
  targetFTPperKg: z.number().min(0.5).max(10).optional(),
  weeklyWeightChangeKg: z.number().min(-1.5).max(1.5).default(-0.5),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => {
    if (data.type === 'REDUCTION') return data.targetWeightKg < data.startWeightKg
    if (data.type === 'GAIN') return data.targetWeightKg > data.startWeightKg
    return true
  },
  {
    message: 'Target weight must be lower than start weight for REDUCTION, higher for GAIN',
    path: ['targetWeightKg'],
  },
)

export type CreateGoalInput = z.infer<typeof CreateGoalSchema>

export const UpdateGoalSchema = CreateGoalSchema.partial().omit({ startDate: true })
export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>

export const ChangeGoalStatusSchema = z.object({
  status: GoalStatusSchema,
  reason: z.string().max(500).optional(),
})

export type ChangeGoalStatusInput = z.infer<typeof ChangeGoalStatusSchema>
