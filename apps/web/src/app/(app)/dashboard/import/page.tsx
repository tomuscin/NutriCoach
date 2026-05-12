'use client'

// Excel Import Page — ETAP 4
// Client component: drag & drop, preview, confirm import

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  X,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseExcelPreview, commitExcelImport } from '@/lib/actions/import'
import type { ParsePreviewResult, CommitImportResult } from '@/lib/actions/import'

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = 'upload' | 'preview' | 'importing' | 'done' | 'error'

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ImportPage() {
  const [stage, setStage] = useState<Stage>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ParsePreviewResult['preview'] | null>(null)
  const [result, setResult] = useState<CommitImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, startParsing] = useTransition()
  const [isCommitting, startCommitting] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Drag & Drop handlers ───────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) handleFile(selected)
  }, [])

  // ── Parse file ─────────────────────────────────────────────────────────────

  function handleFile(f: File) {
    if (!f.name.endsWith('.xlsx')) {
      setError('Obsługiwany format: .xlsx')
      setStage('error')
      return
    }
    setFile(f)
    setError(null)

    const fd = new FormData()
    fd.append('file', f)

    startParsing(async () => {
      const res = await parseExcelPreview(fd)
      if (!res.ok || !res.preview) {
        setError(res.error ?? 'Błąd parsowania')
        setStage('error')
        return
      }
      setPreview(res.preview)
      setStage('preview')
    })
  }

  // ── Commit import ──────────────────────────────────────────────────────────

  function handleCommit() {
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)

    setStage('importing')
    startCommitting(async () => {
      const res = await commitExcelImport(fd)
      setResult(res)
      if (res.ok) {
        setStage('done')
      } else {
        setError(res.error ?? 'Błąd importu')
        setStage('error')
      }
    })
  }

  function reset() {
    setStage('upload')
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
      </div>
      <div>
        <h1 className="text-xl font-bold">Import z Excel</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Prześlij plik .xlsx z danymi treningowymi, żywieniowymi lub regeneracyjnymi.
        </p>
      </div>

      {/* Stage: Upload */}
      {(stage === 'upload' || isParsing) && (
        <UploadZone
          isDragging={isDragging}
          isParsing={isParsing}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileInput={handleFileInput}
          inputRef={inputRef}
          onClick={() => inputRef.current?.click()}
        />
      )}

      {/* Stage: Preview */}
      {stage === 'preview' && preview && (
        <PreviewPanel
          file={file!}
          preview={preview}
          onConfirm={handleCommit}
          onCancel={reset}
        />
      )}

      {/* Stage: Importing */}
      {stage === 'importing' && (
        <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="font-medium">Importowanie danych...</p>
          <p className="text-sm text-muted-foreground">To może potrwać kilka sekund.</p>
        </div>
      )}

      {/* Stage: Done */}
      {stage === 'done' && result?.ok && (
        <SuccessPanel result={result} onReset={reset} />
      )}

      {/* Stage: Error */}
      {stage === 'error' && (
        <ErrorPanel error={error ?? 'Nieznany błąd'} onReset={reset} />
      )}

      {/* Info box */}
      <ImportInfoBox />
    </div>
  )
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({
  isDragging,
  isParsing,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput,
  onClick,
  inputRef,
}: {
  isDragging: boolean
  isParsing: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClick: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      className={cn(
        'rounded-xl border-2 border-dashed bg-card p-10 flex flex-col items-center gap-4 cursor-pointer transition-colors',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/30',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={onFileInput}
      />
      {isParsing ? (
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      ) : (
        <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
      )}
      <div className="text-center space-y-1">
        <p className="font-medium text-foreground">
          {isParsing ? 'Analizuję plik...' : 'Przeciągnij plik lub kliknij'}
        </p>
        <p className="text-sm text-muted-foreground">
          {isParsing ? 'Proszę czekać' : 'Obsługiwany format: .xlsx (max 10 MB)'}
        </p>
      </div>
      {!isParsing && (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          <Upload className="h-4 w-4" />
          Wybierz plik
        </div>
      )}
    </div>
  )
}

// ─── Preview Panel ────────────────────────────────────────────────────────────

function PreviewPanel({
  file,
  preview,
  onConfirm,
  onCancel,
}: {
  file: File
  preview: NonNullable<ParsePreviewResult['preview']>
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-4">
      {/* File info */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              Arkusz: {preview.sheetName} · {(file.size / 1024).toFixed(0)} KB
            </p>
          </div>
        </div>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Duplicate warning */}
      {preview.isDuplicate && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-400">
            Ten plik był już wcześniej importowany. Import nadpisze istniejące dane.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Wiersze" value={preview.stats.total.toString()} />
        <StatBox label="Poprawne" value={preview.stats.parsed.toString()} color="text-emerald-600" />
        <StatBox
          label="Błędy"
          value={preview.stats.failed.toString()}
          color={preview.stats.failed > 0 ? 'text-red-500' : undefined}
        />
      </div>

      {/* Date range */}
      {preview.dateRange && (
        <div className="rounded-lg bg-muted/50 px-4 py-2 text-sm">
          <span className="text-muted-foreground">Zakres dat: </span>
          <span className="font-medium">
            {preview.dateRange.start} – {preview.dateRange.end}
          </span>
        </div>
      )}

      {/* Unmapped columns */}
      {preview.unmappedColumns.length > 0 && (
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            Niezidentyfikowane kolumny ({preview.unmappedColumns.length}):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {preview.unmappedColumns.map((col) => (
              <span key={col} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {col}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Parse errors */}
      {preview.parseErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/10 p-3 space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
          <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1.5">
            Błędy parsowania:
          </p>
          {preview.parseErrors.slice(0, 10).map((e) => (
            <p key={e.rowIndex} className="text-xs text-red-600 dark:text-red-400">
              Wiersz {e.rowIndex}: {e.errors.join(', ')}
            </p>
          ))}
          {preview.parseErrors.length > 10 && (
            <p className="text-xs text-red-500">...i {preview.parseErrors.length - 10} więcej</p>
          )}
        </div>
      )}

      {/* Sample rows */}
      {preview.sampleRows.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Podgląd (pierwsze {preview.sampleRows.length} wierszy):
          </p>
          <div className="rounded-lg border border-border overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-2 font-medium text-muted-foreground">Data</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Waga</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Kcal</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Białko</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">HRV</th>
                </tr>
              </thead>
              <tbody>
                {preview.sampleRows.map((row) => (
                  <tr key={row.date} className="border-b border-border last:border-0">
                    <td className="p-2 text-foreground">{row.date}</td>
                    <td className="p-2 text-right text-foreground">
                      {row.weightKg !== undefined ? `${row.weightKg} kg` : '—'}
                    </td>
                    <td className="p-2 text-right text-foreground">
                      {row.calories !== undefined ? row.calories : '—'}
                    </td>
                    <td className="p-2 text-right text-foreground">
                      {row.proteinG !== undefined ? `${row.proteinG}g` : '—'}
                    </td>
                    <td className="p-2 text-right text-foreground">
                      {row.hrv !== undefined ? `${row.hrv} ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          Anuluj
        </button>
        <button
          onClick={onConfirm}
          disabled={preview.stats.parsed === 0}
          className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Importuj {preview.stats.parsed} wierszy
        </button>
      </div>
    </div>
  )
}

// ─── Success Panel ────────────────────────────────────────────────────────────

function SuccessPanel({
  result,
  onReset,
}: {
  result: CommitImportResult
  onReset: () => void
}) {
  const ins = result.inserted!
  const total = ins.bodyMetrics + ins.dailyLogs + ins.sleepMetrics + ins.recoveryMetrics + ins.trainingLoads

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-8 w-8 text-emerald-600 flex-shrink-0" />
        <div>
          <p className="font-semibold text-emerald-800 dark:text-emerald-400">
            Import zakończony
          </p>
          <p className="text-sm text-emerald-700 dark:text-emerald-500">
            Zapisano {total} rekordów w bazie danych
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ins.bodyMetrics > 0 && <ImportStat label="Waga/ciało" value={ins.bodyMetrics} />}
        {ins.dailyLogs > 0 && <ImportStat label="Odżywianie" value={ins.dailyLogs} />}
        {ins.sleepMetrics > 0 && <ImportStat label="Sen" value={ins.sleepMetrics} />}
        {ins.recoveryMetrics > 0 && <ImportStat label="Regeneracja" value={ins.recoveryMetrics} />}
        {ins.trainingLoads > 0 && <ImportStat label="Obciążenie" value={ins.trainingLoads} />}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 px-4 py-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800 text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
        >
          Importuj kolejny plik
        </button>
        <Link
          href="/dashboard"
          className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium text-center hover:bg-primary/90 transition-colors"
        >
          Przejdź do Dashboard
        </Link>
      </div>
    </div>
  )
}

// ─── Error Panel ──────────────────────────────────────────────────────────────

function ErrorPanel({ error, onReset }: { error: string; onReset: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-8 w-8 text-red-600 flex-shrink-0" />
        <div>
          <p className="font-semibold text-red-800 dark:text-red-400">Błąd importu</p>
          <p className="text-sm text-red-700 dark:text-red-500">{error}</p>
        </div>
      </div>
      <button
        onClick={onReset}
        className="w-full px-4 py-2.5 rounded-lg border border-red-300 dark:border-red-800 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
      >
        Spróbuj ponownie
      </button>
    </div>
  )
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <p className={cn('text-xl font-bold', color ?? 'text-foreground')}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

function ImportStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 px-3 py-2 text-center">
      <p className="text-base font-bold text-emerald-800 dark:text-emerald-400">{value}</p>
      <p className="text-xs text-emerald-700 dark:text-emerald-500">{label}</p>
    </div>
  )
}

function ImportInfoBox() {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Obsługiwane dane:</p>
      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
        <li>Waga ciała, % tkanki tłuszczowej, masa mięśniowa, obwód talii</li>
        <li>Kalorie, białko, węglowodany, tłuszcze, błonnik</li>
        <li>Sen: całkowity, fazy głęboki i REM</li>
        <li>HRV, tętno spoczynkowe, gotowość</li>
        <li>Obciążenie treningowe: CTL, ATL, TSB, TSS</li>
      </ul>
      <p className="text-xs text-muted-foreground">
        Nagłówki kolumn są rozpoznawane automatycznie. Duplikaty są nadpisywane.
      </p>
    </div>
  )
}
