import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Regeneracja' }

export default function RecoveryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Regeneracja</h1>
        <p className="text-muted-foreground">Sen, HRV, readiness i jakość odpoczynku</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
        SleepWidget + HRVChart + ReadinessScore — ETAP 5
      </div>
    </div>
  )
}
