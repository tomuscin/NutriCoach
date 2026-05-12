import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dzień dobry</h1>
        <p className="text-muted-foreground">Twój przegląd dnia — dieta, trening, regeneracja</p>
      </div>

      {/* Widget grid — mobile-first */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* DailySummaryWidget */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-2 rounded-xl border border-border bg-card p-6 h-48 flex items-center justify-center text-muted-foreground">
          DailySummaryWidget — ETAP 4
        </div>

        {/* CalorieRingWidget */}
        <div className="rounded-xl border border-border bg-card p-6 h-48 flex items-center justify-center text-muted-foreground">
          CalorieRingWidget — ETAP 4
        </div>

        {/* MacroWidget */}
        <div className="rounded-xl border border-border bg-card p-6 h-48 flex items-center justify-center text-muted-foreground">
          MacroWidget — ETAP 4
        </div>

        {/* TrainingLoadWidget */}
        <div className="rounded-xl border border-border bg-card p-6 h-48 flex items-center justify-center text-muted-foreground">
          TrainingLoadWidget — ETAP 5
        </div>

        {/* RecoveryWidget */}
        <div className="rounded-xl border border-border bg-card p-6 h-48 flex items-center justify-center text-muted-foreground">
          RecoveryWidget — ETAP 5
        </div>

        {/* AIInsightWidget */}
        <div className="col-span-1 sm:col-span-2 rounded-xl border border-border bg-card p-6 h-48 flex items-center justify-center text-muted-foreground">
          AIInsightWidget (Morning Brief) — ETAP 7
        </div>
      </div>
    </div>
  )
}
