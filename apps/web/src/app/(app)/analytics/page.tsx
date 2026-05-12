import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analityka' }

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analityka</h1>
        <p className="text-muted-foreground">
          Trendy, postęp, wzorce — dieta, waga, treningi, regeneracja
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
        AnalyticsDashboard + Charts — ETAP 8
      </div>
    </div>
  )
}
