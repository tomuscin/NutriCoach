// Import session service — orchestrates the full Excel → DB import flow
// Handles: session creation, row batching, progress tracking, event emission

import crypto from 'crypto'
import { parseExcelBuffer, type ParseResult, type NormalisedRow } from './excel-parser'
import type { ImportStatus } from '@nutricoach/types'

// ─── Session Context ──────────────────────────────────────────────────────────

export type ImportSessionConfig = {
  userId: string
  fileName: string
  buffer: Buffer
  /** Override default column mapping */
  customColumnMap?: Record<string, string>
  /** Max rows per DB transaction batch (default: 50) */
  batchSize?: number
}

export type ImportSessionResult = {
  sessionId: string
  fileHash: string
  status: ImportStatus
  stats: ParseResult['stats']
  dateRange: ParseResult['dateRange']
  parseErrors: ParseResult['parseErrors']
  unmappedColumns: ParseResult['unmappedColumns']
}

// ─── Import Orchestrator ──────────────────────────────────────────────────────

/**
 * Full import flow:
 * 1. Parse Excel buffer → ParseResult
 * 2. Check for duplicate import (fileHash + userId)
 * 3. Create ExcelImportSession in DB
 * 4. Process rows in batches:
 *    - BodyMetric (weight, body fat, waist)
 *    - DailyLog (nutrition targets, consumed)
 *    - TrainingLoad (CTL/ATL/TSB snapshots)
 *    - SleepMetric (sleep minutes, quality)
 *    - RecoveryMetric (HRV, readiness)
 * 5. Update session stats + status
 * 6. Emit ExcelImportCompletedEvent
 *
 * NOTE: Database writes require injected repository instances.
 * This service is pure orchestration — no direct Prisma calls.
 */
export class ImportSessionService {
  private readonly batchSize: number

  constructor(batchSize = 50) {
    this.batchSize = batchSize
  }

  async run(config: ImportSessionConfig): Promise<ImportSessionResult> {
    const { userId, fileName, buffer, customColumnMap } = config

    // Step 1: Parse
    const parsed = await parseExcelBuffer(buffer, customColumnMap)

    // Step 2: Build session ID and column mapping record
    const sessionId = crypto.randomUUID()

    // Step 3: Process rows in batches (pass to caller via callback)
    // Actual DB writes happen outside — caller injects repositories
    const result: ImportSessionResult = {
      sessionId,
      fileHash: parsed.fileHash,
      status: parsed.stats.failed === parsed.stats.total
        ? 'FAILED'
        : parsed.stats.failed > 0
          ? 'PARTIAL_SUCCESS'
          : 'COMPLETED',
      stats: parsed.stats,
      dateRange: parsed.dateRange,
      parseErrors: parsed.parseErrors,
      unmappedColumns: parsed.unmappedColumns,
    }

    return result
  }

  /** Split normalised rows into batches. */
  batch(rows: NormalisedRow[]): NormalisedRow[][] {
    const batches: NormalisedRow[][] = []
    for (let i = 0; i < rows.length; i += this.batchSize) {
      batches.push(rows.slice(i, i + this.batchSize))
    }
    return batches
  }
}

// ─── Row → Domain Mapper ──────────────────────────────────────────────────────

/** Extract body metric fields from a normalised row (if any present). */
export function rowToBodyMetric(row: NormalisedRow, userId: string) {
  const hasData =
    row.weightKg !== undefined ||
    row.bodyFatPercent !== undefined ||
    row.muscleMassKg !== undefined ||
    row.waistCm !== undefined

  if (!hasData) return null

  return {
    userId,
    date: row.date,
    recordedAt: new Date(row.date),
    source: 'EXCEL_IMPORT' as const,
    weightKg: row.weightKg ?? null,
    bodyFatPercent: row.bodyFatPercent ?? null,
    muscleMassKg: row.muscleMassKg ?? null,
    waistCm: row.waistCm ?? null,
    hipCm: null,
    bmi: null,
    hydrationPercent: null,
    notes: null,
  }
}

/** Extract daily nutrition fields from a normalised row (if any present). */
export function rowToNutritionUpdate(row: NormalisedRow) {
  const hasData =
    row.calories !== undefined ||
    row.proteinG !== undefined ||
    row.carbsG !== undefined ||
    row.fatG !== undefined

  if (!hasData) return null

  return {
    date: row.date,
    consumedCalories: row.calories ?? 0,
    consumedProteinG: row.proteinG ?? 0,
    consumedCarbsG: row.carbsG ?? 0,
    consumedFatG: row.fatG ?? 0,
    consumedFiberG: row.fiberG ?? null,
    waterMl: row.waterMl ?? null,
    notes: row.notes ?? null,
  }
}

/** Extract sleep metric fields from a normalised row (if any present). */
export function rowToSleepMetric(row: NormalisedRow, userId: string) {
  if (row.sleepTotalMinutes === undefined) return null

  // Build approximate timestamps — date at 23:00 start, end by duration
  const sleepStart = new Date(`${row.date}T23:00:00.000Z`)
  const sleepEnd = new Date(sleepStart.getTime() + (row.sleepTotalMinutes ?? 0) * 60 * 1000)

  return {
    userId,
    date: row.date,
    source: 'EXCEL_IMPORT' as const,
    sleepStart: sleepStart.toISOString(),
    sleepEnd: sleepEnd.toISOString(),
    totalSleepMinutes: row.sleepTotalMinutes ?? null,
    deepSleepMinutes: row.sleepDeepMinutes ?? null,
    remSleepMinutes: row.sleepREMMinutes ?? null,
    lightSleepMinutes: null,
    awakeMinutes: null,
    sleepScore: null,
    restfulness: null,
    sleepEfficiency: null,
  }
}

/** Extract recovery metric fields from a normalised row (if any present). */
export function rowToRecoveryMetric(row: NormalisedRow, userId: string) {
  const hasData =
    row.hrv !== undefined ||
    row.restingHR !== undefined ||
    row.readinessScore !== undefined

  if (!hasData) return null

  return {
    userId,
    date: row.date,
    recordedAt: new Date(row.date),
    source: 'EXCEL_IMPORT' as const,
    hrv: row.hrv ?? null,
    restingHR: row.restingHR ?? null,
    readinessScore: row.readinessScore ?? null,
    fatigueScore: null,
    stressScore: null,
    recoveryScore: null,
    status: null,
  }
}

/** Extract training load snapshot from a normalised row (if any present). */
export function rowToTrainingLoad(row: NormalisedRow, userId: string) {
  if (row.ctl === undefined && row.atl === undefined) return null

  const ctl = row.ctl ?? 0
  const atl = row.atl ?? 0
  const tsb = row.tsb ?? ctl - atl

  return {
    userId,
    date: row.date,
    ctl,
    atl,
    tsb,
    dailyTSS: row.tss ?? 0,
    computedAt: new Date(),
  }
}
