// InsightExplanation — ETAP 5.5 Explainability Component
// Shows WHY the AI made a recommendation.
// Designed to build trust: WHOOP/Oura style, data-centric, minimal.

'use client'

import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Activity } from 'lucide-react'
import { useState } from 'react'

type InsightExplanationProps = {
  primaryDrivers: string[]
  supportingSignals: string[]
  warnings: string[]
  className?: string
  defaultOpen?: boolean
}

export function InsightExplanation({
  primaryDrivers,
  supportingSignals,
  warnings,
  className,
  defaultOpen = false,
}: InsightExplanationProps) {
  const [open, setOpen] = useState(defaultOpen)

  const hasContent = primaryDrivers.length > 0 || supportingSignals.length > 0 || warnings.length > 0
  if (!hasContent) return null

  return (
    <div className={cn('rounded-lg border border-border bg-muted/30', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
          Dlaczego to zalecenie?
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {/* Primary drivers */}
          {primaryDrivers.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <TrendingUp className="h-3 w-3 text-primary" />
                Główne czynniki
              </div>
              <ul className="space-y-0.5">
                {primaryDrivers.map((driver, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 leading-relaxed">
                    <span className="mt-1 h-1 w-1 rounded-full bg-primary flex-shrink-0" />
                    {driver}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Supporting signals */}
          {supportingSignals.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Activity className="h-3 w-3 text-blue-500" />
                Sygnały potwierdzające
              </div>
              <ul className="space-y-0.5">
                {supportingSignals.map((signal, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 leading-relaxed">
                    <span className="mt-1 h-1 w-1 rounded-full bg-blue-400 flex-shrink-0" />
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500">
                <AlertTriangle className="h-3 w-3" />
                Zastrzeżenia
              </div>
              <ul className="space-y-0.5">
                {warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1.5 leading-relaxed">
                    <span className="mt-1 h-1 w-1 rounded-full bg-amber-500 flex-shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
