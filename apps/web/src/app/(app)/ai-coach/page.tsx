// AI Coach page — ETAP 5.5 Insight Timeline + Generation Hub
// Server Component — data fetched server-side

import type { Metadata } from 'next'
import { requireOnboarded } from '@/lib/auth'
import { getInsightHistory } from '@/lib/ai/persistence'
import { InsightTimelineClient } from './InsightTimelineClient'

export const metadata: Metadata = { title: 'AI Coach' }
export const dynamic = 'force-dynamic'

export default async function AICoachPage() {
  const user = await requireOnboarded()
  const history = await getInsightHistory(user.id, { page: 1, pageSize: 15 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Coach</h1>
        <p className="text-muted-foreground text-sm">
          Spersonalizowane zalecenia oparte na Twoich danych.
        </p>
      </div>

      <InsightTimelineClient
        initialItems={history.items}
        totalPages={history.totalPages}
        userId={user.id}
      />
    </div>
  )
}
