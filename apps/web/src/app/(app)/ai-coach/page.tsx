import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'AI Coach' }

export default function AICoachPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Coach</h1>
        <p className="text-muted-foreground">
          Twój personalny asystent — analizy, rekomendacje, odpowiedzi
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Morning brief */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          MorningBrief / MidDayCheck / EveningReview — ETAP 7
        </div>
        {/* Chat interface */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-12 text-center text-muted-foreground h-96">
          AICoachChat — ETAP 7
        </div>
        {/* Insight sidebar */}
        <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground h-96">
          InsightHistory — ETAP 7
        </div>
      </div>
    </div>
  )
}
