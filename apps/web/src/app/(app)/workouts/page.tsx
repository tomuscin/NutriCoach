import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Treningi' }

export default function WorkoutsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Treningi</h1>
        <p className="text-muted-foreground">Historia, plany i analiza obciążenia treningowego</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
        WorkoutList + TrainingLoadChart — ETAP 5
      </div>
    </div>
  )
}
