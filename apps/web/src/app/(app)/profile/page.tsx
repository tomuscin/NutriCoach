import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Profil' }

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profil</h1>
        <p className="text-muted-foreground">Dane, cele, parametry metaboliczne</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          ProfileCard — ETAP 2
        </div>
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          GoalSettings — ETAP 2
        </div>
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          MetabolicParams — ETAP 4
        </div>
      </div>
    </div>
  )
}
