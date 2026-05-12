// Excel Import Parser — Full implementation (ETAP 2)
// Uses 'exceljs' — handles .xlsx files from Tomasz's training log
//
// Flow:
//   1. Buffer in → SHA-256 hash (duplicate check)
//   2. exceljs reads first sheet
//   3. Row 1 = headers → matched via EXCEL_COLUMN_MAP
//   4. Rows 2+ → normalised & validated
//   5. Returns NormalisedRows + parse errors

import crypto from 'crypto'
import ExcelJS from 'exceljs'
import { findDomainField, FIELD_VALIDATORS, type DomainField } from './column-map'

// ─── Output Types ─────────────────────────────────────────────────────────────

export type NormalisedRow = {
  date: string          // YYYY-MM-DD
  rowIndex: number      // 1-based Excel row number (for error reporting)

  // Body metrics
  weightKg?: number
  bodyFatPercent?: number
  muscleMassKg?: number
  waistCm?: number

  // Nutrition
  calories?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  fiberG?: number
  waterMl?: number

  // Training
  tss?: number
  ctl?: number
  atl?: number
  tsb?: number

  // Recovery
  hrv?: number
  restingHR?: number
  sleepTotalMinutes?: number
  sleepDeepMinutes?: number
  sleepREMMinutes?: number
  readinessScore?: number

  notes?: string
}

export type ParsedRow =
  | { ok: true; row: NormalisedRow }
  | { ok: false; rowIndex: number; errors: string[] }

export type ParseResult = {
  fileHash: string
  sheetName: string
  columnMapping: Record<string, string>   // headerName → domainField
  unmappedColumns: string[]
  rows: NormalisedRow[]
  parseErrors: Array<{ rowIndex: number; errors: string[] }>
  dateRange: { start: string; end: string } | null
  stats: {
    total: number
    parsed: number
    skipped: number
    failed: number
  }
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

export async function parseExcelBuffer(
  buffer: Buffer,
  customColumnMap?: Record<string, string>,
): Promise<ParseResult> {
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex')

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0])

  const sheet = workbook.worksheets[0]
  if (!sheet) throw new Error('Excel file has no worksheets')

  const sheetName = sheet.name

  // Extract headers from row 1
  const headerRow = sheet.getRow(1)
  const headers: Array<{ col: number; raw: string; field: DomainField | null }> = []
  const columnMapping: Record<string, string> = {}
  const unmappedColumns: string[] = []

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const raw = String(cell.value ?? '').trim()
    if (!raw) return
    const field = findDomainField(raw, customColumnMap)
    headers.push({ col: colNumber, raw, field })
    if (field) {
      columnMapping[raw] = field
    } else {
      unmappedColumns.push(raw)
    }
  })

  // Parse data rows
  const rows: NormalisedRow[] = []
  const parseErrors: Array<{ rowIndex: number; errors: string[] }> = []

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return // skip header

    const rawValues: Record<DomainField, string> = {} as Record<DomainField, string>

    headers.forEach(({ col, field }) => {
      if (!field) return
      const cell = row.getCell(col)
      const val = extractCellValue(cell)
      if (val !== null) rawValues[field] = val
    })

    const result = normaliseRow(rawValues, rowNumber)
    if (result.ok) {
      rows.push(result.row)
    } else {
      parseErrors.push({ rowIndex: result.rowIndex, errors: result.errors })
    }
  })

  // Date range
  const dates = rows.map((r) => r.date).sort()
  const dateRange = dates.length > 0
    ? { start: dates[0], end: dates[dates.length - 1] }
    : null

  return {
    fileHash,
    sheetName,
    columnMapping,
    unmappedColumns,
    rows,
    parseErrors,
    dateRange,
    stats: {
      total: rows.length + parseErrors.length,
      parsed: rows.length,
      skipped: 0,
      failed: parseErrors.length,
    },
  }
}

// ─── Row Normaliser ───────────────────────────────────────────────────────────

function normaliseRow(
  raw: Partial<Record<DomainField, string>>,
  rowIndex: number,
): ParsedRow {
  const errors: string[] = []

  // Date is required
  if (!raw.date) {
    return { ok: false, rowIndex, errors: ['Missing date column'] }
  }

  // Validate all present fields
  for (const [field, value] of Object.entries(raw)) {
    if (!value) continue
    const validator = FIELD_VALIDATORS[field as DomainField]
    if (validator) {
      const error = validator(value)
      if (error) errors.push(error)
    }
  }

  if (errors.length > 0) return { ok: false, rowIndex, errors }

  const parseNum = (v?: string): number | undefined => {
    if (!v) return undefined
    const n = parseFloat(v.replace(',', '.'))
    return isNaN(n) ? undefined : n
  }

  const date = parseDate(raw.date)
  if (!date) return { ok: false, rowIndex, errors: [`Cannot parse date: "${raw.date}"`] }

  // Sleep: if given in hours (float), convert to minutes
  const sleepRaw = parseNum(raw.sleepTotal)
  const sleepTotalMinutes = sleepRaw !== undefined
    ? (sleepRaw <= 24 ? Math.round(sleepRaw * 60) : sleepRaw)
    : undefined

  const row: NormalisedRow = {
    date,
    rowIndex,
    weightKg: parseNum(raw.weight),
    bodyFatPercent: parseNum(raw.bodyFat),
    muscleMassKg: parseNum(raw.muscleMass),
    waistCm: parseNum(raw.waist),
    calories: parseNum(raw.calories),
    proteinG: parseNum(raw.protein),
    carbsG: parseNum(raw.carbs),
    fatG: parseNum(raw.fat),
    fiberG: parseNum(raw.fiber),
    waterMl: parseNum(raw.water),
    tss: parseNum(raw.tss),
    ctl: parseNum(raw.ctl),
    atl: parseNum(raw.atl),
    tsb: parseNum(raw.tsb),
    hrv: parseNum(raw.hrv),
    restingHR: parseNum(raw.restingHR),
    sleepTotalMinutes,
    sleepDeepMinutes: parseNum(raw.sleepDeep),
    sleepREMMinutes: parseNum(raw.sleepREM),
    readinessScore: parseNum(raw.readiness),
    notes: raw.notes ?? undefined,
  }

  return { ok: true, row }
}

// ─── Cell value extractor ─────────────────────────────────────────────────────

function extractCellValue(cell: ExcelJS.Cell): string | null {
  const v = cell.value
  if (v === null || v === undefined) return null

  if (v instanceof Date) {
    return v.toISOString().slice(0, 10)
  }

  if (typeof v === 'object' && 'result' in v) {
    // Formula cell — use result
    return extractCellValue({ ...cell, value: (v as ExcelJS.CellFormulaValue).result } as ExcelJS.Cell)
  }

  if (typeof v === 'object' && 'richText' in v) {
    return (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join('')
  }

  return String(v).trim()
}

// ─── Date parser ─────────────────────────────────────────────────────────────

function parseDate(raw: string): string | null {
  // Try ISO first
  const iso = raw.replace(/\./g, '-')
  const d = new Date(iso)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)

  // DD.MM.YYYY or D.M.YYYY
  const parts = raw.split(/[.\-\/]/)
  if (parts.length === 3) {
    const [d1, m1, y1] = parts
    const day = d1.padStart(2, '0')
    const month = m1.padStart(2, '0')
    const candidate = new Date(`${y1}-${month}-${day}`)
    if (!isNaN(candidate.getTime())) return candidate.toISOString().slice(0, 10)
  }

  return null
}
