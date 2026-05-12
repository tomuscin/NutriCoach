// LowConfidenceWarning — ETAP 5.5
// Shown when AI quality is below medium threshold.
// Tells user exactly what data to add for better insights.
// Minimal, data-centric — no alarm UX, just informative.

import { cn } from '@/lib/utils'
import { Info, Plus } from 'lucide-react'
import Link from 'next/link'

type LowConfidenceWarningProps = {
  missingSignals: string[]
  confidence: number
  className?: string
}

const MISSING_SIGNAL_ACTIONS: Record<string, { label: string; href: string }> = {
  'Brak pomiaru wagi': { label: 'Dodaj wagę', href: '/dashboard' },
  'Brak logów żywieniowych z wczoraj': { label: 'Zaloguj żywienie', href: '/nutrition' },
  'Brak danych o białku z wczoraj': { label: 'Zaloguj żywienie', href: '/nutrition' },
  'Brak danych snu': { label: 'Połącz urządzenie', href: '/integrations' },
  'Brak HRV': { label: 'Połącz Garmin/Oura', href: '/integrations' },
  'Brak danych regeneracji': { label: 'Dodaj dane regeneracji', href: '/recovery' },
  'Brak load treningowego (CTL/ATL/TSB)': { label: 'Importuj dane', href: '/dashboard/import' },
  'Brak historii treningów': { label: 'Dodaj trening', href: '/workouts' },
  'Brak celu kalorycznego': { label: 'Ustaw cel', href: '/profile' },
}

export function LowConfidenceWarning({
  missingSignals,
  confidence,
  className,
}: LowConfidenceWarningProps) {
  if (missingSignals.length === 0 || confidence >= 0.75) return null

  const top = missingSignals.slice(0, 3)
  const isInsufficient = confidence < 0.20

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5 space-y-2',
        isInsufficient
          ? 'border-amber-500/30 bg-amber-500/8'
          : 'border-border bg-muted/40',
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <Info className={cn('h-3.5 w-3.5 flex-shrink-0', isInsufficient ? 'text-amber-500' : 'text-muted-foreground')} />
        <p className={cn('text-xs font-medium', isInsufficient ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground')}>
          {isInsufficient
            ? 'Za mało danych do wiarygodnego insightu'
            : `Pewność zalecenia: ${Math.round(confidence * 100)}% — brakujące sygnały:`}
        </p>
      </div>

      <ul className="space-y-1">
        {top.map((signal) => {
          const action = MISSING_SIGNAL_ACTIONS[signal]
          return (
            <li key={signal} className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{signal}</span>
              {action && (
                <Link
                  href={action.href}
                  className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline flex-shrink-0"
                >
                  <Plus className="h-3 w-3" />
                  {action.label}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
