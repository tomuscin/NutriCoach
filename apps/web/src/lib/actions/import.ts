'use server'

// Excel Import Server Actions — ETAP 4 + ETAP 5 cache invalidation
// Handles: parse preview + commit to DB

import { revalidatePath, revalidateTag } from 'next/cache'
import { CACHE_TAGS, IMPORT_INVALIDATES } from '@/lib/cache'
import { requireOnboarded } from '@/lib/auth'
import { parseExcelBuffer, type ParseResult } from '@/lib/imports/excel-parser'
import { prisma } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ParsePreviewResult = {
  ok: boolean
  error?: string
  preview?: {
    fileHash: string
    sheetName: string
    stats: ParseResult['stats']
    dateRange: ParseResult['dateRange']
    unmappedColumns: ParseResult['unmappedColumns']
    parseErrors: ParseResult['parseErrors']
    sampleRows: ParseResult['rows']   // first 5 rows for preview
    totalRows: number
    isDuplicate: boolean
  }
}

export type CommitImportResult = {
  ok: boolean
  error?: string
  inserted?: {
    bodyMetrics: number
    dailyLogs: number
    sleepMetrics: number
    recoveryMetrics: number
    trainingLoads: number
  }
}

// ─── Parse Preview (no DB writes) ─────────────────────────────────────────────

export async function parseExcelPreview(
  formData: FormData,
): Promise<ParsePreviewResult> {
  const user = await requireOnboarded()

  const file = formData.get('file')
  if (!file || typeof file === 'string') {
    return { ok: false, error: 'Brak pliku' }
  }

  const fileObj = file as File
  if (fileObj.size > 10 * 1024 * 1024) {
    return { ok: false, error: 'Plik zbyt duży (max 10 MB)' }
  }
  if (!fileObj.name.endsWith('.xlsx')) {
    return { ok: false, error: 'Obsługiwany format: .xlsx' }
  }

  let parsed: ParseResult
  try {
    const arrayBuffer = await fileObj.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    parsed = await parseExcelBuffer(buffer)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Błąd parsowania pliku'
    return { ok: false, error: msg }
  }

  if (parsed.stats.total === 0) {
    return { ok: false, error: 'Plik jest pusty lub nie zawiera danych' }
  }

  // Check for duplicate import
  const existing = await prisma.excelImportSession.findFirst({
    where: { userId: user.id, fileHash: parsed.fileHash },
    select: { id: true },
  })

  return {
    ok: true,
    preview: {
      fileHash: parsed.fileHash,
      sheetName: parsed.sheetName,
      stats: parsed.stats,
      dateRange: parsed.dateRange,
      unmappedColumns: parsed.unmappedColumns,
      parseErrors: parsed.parseErrors,
      sampleRows: parsed.rows.slice(0, 5),
      totalRows: parsed.rows.length,
      isDuplicate: existing !== null,
    },
  }
}

// ─── Commit Import (DB writes) ────────────────────────────────────────────────

export async function commitExcelImport(
  formData: FormData,
): Promise<CommitImportResult> {
  const user = await requireOnboarded()

  const file = formData.get('file')
  if (!file || typeof file === 'string') {
    return { ok: false, error: 'Brak pliku' }
  }

  const fileObj = file as File
  const arrayBuffer = await fileObj.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let parsed: ParseResult
  try {
    parsed = await parseExcelBuffer(buffer)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Błąd parsowania'
    return { ok: false, error: msg }
  }

  // Create import session record
  const session = await prisma.excelImportSession.create({
    data: {
      userId: user.id,
      fileHash: parsed.fileHash,
      fileName: fileObj.name,
      status: 'PROCESSING',
      rowsTotal: parsed.stats.total,
      rowsParsed: parsed.stats.parsed,
      rowsFailed: parsed.stats.failed,
      columnMapping: parsed.columnMapping,
    },
  })

  const counts = {
    bodyMetrics: 0,
    dailyLogs: 0,
    sleepMetrics: 0,
    recoveryMetrics: 0,
    trainingLoads: 0,
  }

  // Process rows in batches of 50
  const BATCH = 50
  const rows = parsed.rows

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)

    await Promise.all(
      batch.map(async (row) => {
        const date = new Date(row.date)

        // Body metric — no unique userId_date constraint; find+update or create
        if (row.weightKg !== undefined) {
          const existing = await prisma.bodyMetric.findFirst({
            where: { userId: user.id, date },
            select: { id: true },
          })
          if (existing) {
            await prisma.bodyMetric.update({
              where: { id: existing.id },
              data: {
                weightKg: row.weightKg,
                bodyFatPercent: row.bodyFatPercent ?? null,
                muscleMassKg: row.muscleMassKg ?? null,
                waistCm: row.waistCm ?? null,
              },
            }).then(() => { counts.bodyMetrics++ }).catch(() => {})
          } else {
            await prisma.bodyMetric.create({
              data: {
                userId: user.id,
                date,
                weightKg: row.weightKg,
                bodyFatPercent: row.bodyFatPercent ?? null,
                muscleMassKg: row.muscleMassKg ?? null,
                waistCm: row.waistCm ?? null,
                source: 'EXCEL_IMPORT',
              },
            }).then(() => { counts.bodyMetrics++ }).catch(() => {})
          }
        }

        // Daily log (nutrition)
        if (row.calories !== undefined || row.proteinG !== undefined) {
          await prisma.dailyLog.upsert({
            where: { userId_date: { userId: user.id, date } },
            create: {
              userId: user.id,
              date,
              consumedCalories: row.calories ?? 0,
              consumedProteinG: row.proteinG ?? 0,
              consumedCarbsG: row.carbsG ?? 0,
              consumedFatG: row.fatG ?? 0,
              targetCalories: 0,
              targetProteinG: 0,
            },
            update: {
              consumedCalories: row.calories ?? 0,
              consumedProteinG: row.proteinG ?? 0,
              consumedCarbsG: row.carbsG ?? 0,
              consumedFatG: row.fatG ?? 0,
            },
          }).then(() => { counts.dailyLogs++ }).catch(() => {})
        }

        // Sleep metric — sleepStart/sleepEnd required; construct from date
        if (row.sleepTotalMinutes !== undefined) {
          const sleepStart = new Date(date)
          sleepStart.setHours(22, 0, 0, 0)  // approximate: 10pm prior night
          sleepStart.setDate(sleepStart.getDate() - 1)
          const sleepEnd = new Date(date)
          sleepEnd.setHours(6, 0, 0, 0)     // approximate: 6am

          const existingSleep = await prisma.sleepMetric.findFirst({
            where: { userId: user.id, date },
            select: { id: true },
          })
          if (existingSleep) {
            await prisma.sleepMetric.update({
              where: { id: existingSleep.id },
              data: {
                totalSleepMinutes: row.sleepTotalMinutes ?? null,
                deepSleepMinutes: row.sleepDeepMinutes ?? null,
                remSleepMinutes: row.sleepREMMinutes ?? null,
              },
            }).then(() => { counts.sleepMetrics++ }).catch(() => {})
          } else {
            await prisma.sleepMetric.create({
              data: {
                userId: user.id,
                date,
                sleepStart,
                sleepEnd,
                totalSleepMinutes: row.sleepTotalMinutes ?? null,
                deepSleepMinutes: row.sleepDeepMinutes ?? null,
                remSleepMinutes: row.sleepREMMinutes ?? null,
                source: 'EXCEL_IMPORT',
              },
            }).then(() => { counts.sleepMetrics++ }).catch(() => {})
          }
        }

        // Recovery metric — no unique userId_date constraint
        if (row.readinessScore !== undefined || row.restingHR !== undefined || row.hrv !== undefined) {
          const existingRecovery = await prisma.recoveryMetric.findFirst({
            where: { userId: user.id, date },
            select: { id: true },
          })
          if (existingRecovery) {
            await prisma.recoveryMetric.update({
              where: { id: existingRecovery.id },
              data: {
                readinessScore: row.readinessScore != null ? Math.round(row.readinessScore) : null,
                restingHR: row.restingHR != null ? Math.round(row.restingHR) : null,
                hrv: row.hrv ?? null,
              },
            }).then(() => { counts.recoveryMetrics++ }).catch(() => {})
          } else {
            await prisma.recoveryMetric.create({
              data: {
                userId: user.id,
                date,
                readinessScore: row.readinessScore != null ? Math.round(row.readinessScore) : null,
                restingHR: row.restingHR != null ? Math.round(row.restingHR) : null,
                hrv: row.hrv ?? null,
                source: 'EXCEL_IMPORT',
              },
            }).then(() => { counts.recoveryMetrics++ }).catch(() => {})
          }
        }

        // Training load snapshot — ctl/atl/tsb are required (non-nullable)
        if (row.ctl !== undefined && row.atl !== undefined && row.tsb !== undefined) {
          await prisma.trainingLoad.upsert({
            where: { userId_date: { userId: user.id, date } },
            create: {
              userId: user.id,
              date,
              ctl: row.ctl,
              atl: row.atl,
              tsb: row.tsb,
              dailyTSS: row.tss ?? 0,
            },
            update: {
              ctl: row.ctl,
              atl: row.atl,
              tsb: row.tsb,
              dailyTSS: row.tss ?? 0,
            },
          }).then(() => { counts.trainingLoads++ }).catch(() => {})
        }
      }),
    )
  }

  const totalInserted =
    counts.bodyMetrics +
    counts.dailyLogs +
    counts.sleepMetrics +
    counts.recoveryMetrics +
    counts.trainingLoads

  // Update session record
  await prisma.excelImportSession.update({
    where: { id: session.id },
    data: {
      status: totalInserted > 0 ? 'COMPLETED' : 'FAILED',
      rowsImported: totalInserted,
      finishedAt: new Date(),
    },
  })

  revalidatePath('/dashboard')
  // Invalidate all data tags + AI insights (new data may change recommendations)
  for (const tag of IMPORT_INVALIDATES) revalidateTag(tag)
  revalidateTag(CACHE_TAGS.AI_INSIGHTS)

  return { ok: true, inserted: counts }
}
