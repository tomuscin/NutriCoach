// Integrations page — ETAP 6.5
// Shows integration status, connect/disconnect controls.
// Server Component — fetches integration data server-side.

import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { prisma as db } from '@/lib/db'
import { IntegrationCard } from '@/components/integrations/IntegrationCard'
import type { IntegrationStatus } from '@prisma/client'

export const metadata: Metadata = { title: 'Integracje' }
export const dynamic = 'force-dynamic'

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const user = await requireAuth()
  const params = await searchParams

  const integrations = await db.integration.findMany({
    where: { userId: user.id },
    select: {
      provider: true,
      status: true,
      lastSyncAt: true,
      nextSyncAt: true,
      errorMessage: true,
      errorCount: true,
    },
  })

  const byProvider = Object.fromEntries(integrations.map(i => [i.provider, i]))
  const tp = byProvider['TRAININGPEAKS'] ?? null

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Integracje</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Połącz zewnętrzne źródła danych. AI trenuje się na realnych sygnałach.
        </p>
      </div>

      {/* Status banners */}
      {params.connected === 'trainingpeaks' && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-600">
          TrainingPeaks połączony. Pierwsza synchronizacja w toku.
        </div>
      )}
      {params.error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500">
          {params.error === 'access_denied' && 'Dostęp odrzucony przez TrainingPeaks.'}
          {params.error === 'invalid_state' && 'Nieprawidłowy token CSRF. Spróbuj ponownie.'}
          {params.error === 'auth_failed' && 'Błąd autoryzacji. Spróbuj ponownie.'}
          {!['access_denied', 'invalid_state', 'auth_failed'].includes(params.error) && 'Wystąpił błąd. Spróbuj ponownie.'}
        </div>
      )}

      {/* Active integrations */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Dostępne
        </h2>
        <IntegrationCard
          provider="TRAININGPEAKS"
          displayName="TrainingPeaks"
          description="Treningi, TSS, CTL/ATL/TSB, plany treningowe"
          logoEmoji="🏋️"
          status={(tp?.status as IntegrationStatus) ?? null}
          lastSyncAt={tp?.lastSyncAt?.toISOString() ?? null}
          nextSyncAt={tp?.nextSyncAt?.toISOString() ?? null}
          errorMessage={tp?.errorMessage ?? null}
          errorCount={tp?.errorCount ?? 0}
          connectHref="/api/integrations/trainingpeaks/connect"
        />
      </section>

      {/* Coming soon */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Wkrótce
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: 'Garmin Connect', emoji: '⌚', desc: 'Sen, HRV, Body Battery, aktywności' },
            { name: 'Oura Ring', emoji: '💍', desc: 'Regeneracja, sen, HRV, temperatura' },
            { name: 'Strava', emoji: '🚴', desc: 'Aktywności endurance' },
            { name: 'Apple Health', emoji: '🍎', desc: 'Kroki, sen, tętno' },
          ].map(item => (
            <div
              key={item.name}
              className="rounded-xl border border-border bg-card/50 p-4 opacity-60"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Planowane w kolejnym etapie</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
