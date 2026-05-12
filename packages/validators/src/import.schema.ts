// Excel import Zod schemas

import { z } from 'zod'

/** Column mapping — maps Excel column headers to domain field names. */
export const ColumnMappingSchema = z.record(z.string(), z.string())
export type ColumnMapping = z.infer<typeof ColumnMappingSchema>

/** Import session creation request. */
export const StartImportSchema = z.object({
  fileName: z.string().min(1).max(255),
  columnMapping: ColumnMappingSchema.optional(),
})

export type StartImportInput = z.infer<typeof StartImportSchema>

/** A single parsed row from Excel — loose types (strings from spreadsheet). */
export const ExcelRawRowSchema = z.object({
  date: z.string(),
  weight: z.string().optional(),
  bodyFat: z.string().optional(),
  calories: z.string().optional(),
  protein: z.string().optional(),
  carbs: z.string().optional(),
  fat: z.string().optional(),
  fiber: z.string().optional(),
  water: z.string().optional(),
  tss: z.string().optional(),
  ctl: z.string().optional(),
  atl: z.string().optional(),
  tsb: z.string().optional(),
  hrv: z.string().optional(),
  restingHR: z.string().optional(),
  sleepHours: z.string().optional(),
  notes: z.string().optional(),
})

export type ExcelRawRow = z.infer<typeof ExcelRawRowSchema>

/** Validated/normalised row ready for database insertion. */
export const ExcelNormalisedRowSchema = z.object({
  date: z.date(),
  weightKg: z.number().min(20).max(350).optional(),
  bodyFatPercent: z.number().min(2).max(70).optional(),
  calories: z.number().min(0).max(10000).optional(),
  proteinG: z.number().min(0).max(500).optional(),
  carbsG: z.number().min(0).max(1000).optional(),
  fatG: z.number().min(0).max(500).optional(),
  fiberG: z.number().min(0).max(200).optional(),
  waterMl: z.number().min(0).max(10000).optional(),
  tss: z.number().min(0).max(1000).optional(),
  ctl: z.number().min(0).max(500).optional(),
  atl: z.number().min(0).max(500).optional(),
  tsb: z.number().min(-200).max(200).optional(),
  hrv: z.number().min(0).max(300).optional(),
  restingHR: z.number().int().min(20).max(120).optional(),
  sleepMinutes: z.number().min(0).max(960).optional(),
  notes: z.string().max(500).optional(),
})

export type ExcelNormalisedRow = z.infer<typeof ExcelNormalisedRowSchema>

/** Import validation result. */
export type ImportRowResult = {
  rowNumber: number
  status: 'success' | 'skipped' | 'failed'
  data?: ExcelNormalisedRow
  errors?: Array<{ field: string; message: string }>
}
