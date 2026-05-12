import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Żywienie' }

export default function NutritionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Żywienie</h1>
        <p className="text-muted-foreground">Dziennik posiłków i bilans kaloryczny</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
        NutritionLogger + MealCards — ETAP 4
      </div>
    </div>
  )
}
