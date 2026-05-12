// /dashboard/runtime — Internal Runtime Dashboard
// DEV + ADMIN only. Shows queue health, sync health, AI runtime, webhooks,
// event bus, DLQ, and event journal.
// Server Component — data fetched server-side for freshness.

import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { metrics } from '@/lib/runtime/metrics'
import { getDLQSummary, getSyncDLQ, getWebhookDLQ, getRecoveryStats } from '@/lib/runtime/dlq'
import { getRecentJournal } from '@/lib/runtime/journal'
import { prisma as db } from '@/lib/db'
import { RuntimeDebugPanel } from '@/components/runtime/RuntimeDebugPanel'

export const metadata: Metadata = { title: 'Runtime Dashboard' }
export const dynamic = 'force-dynamic'

function MetricCard({ label, value, sublabel, alert }: { label: string; value: string | number; sublabel?: string; alert?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${alert ? 'border-red-500/40 bg-red-500/5' : 'border-border bg-card'}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${alert ? 'text-red-500' : 'text-foreground'}`}>{value}</p>
      {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SUCCESS: 'bg-green-500/20 text-green-400',
    FAILED: 'bg-red-500/20 text-red-400',
    RUNNING: 'bg-blue-500/20 text-blue-400',
    processed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
    pending: 'bg-amber-500/20 text-amber-400',
    duplicate: 'bg-muted text-muted-foreground',
    ok: 'bg-green-500/20 text-green-400',
  }
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colors[status] ?? 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  )
}

export default async function RuntimeDashboardPage() {
  const user = await requireAuth()

  // Check access
  const fullUser = await db.user.findUnique({ where: { id: user.id }, select: { role: true } })
  if (fullUser?.role !== 'ADMIN' && process.env.NODE_ENV === 'production') {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Access restricted to admins.</p>
      </div>
    )
  }

  const [todayMetrics, dlqSummary, syncDLQ, webhookDLQ, journal, recovery, recentSyncs, integrationStats] =
    await Promise.all([
      metrics.readToday(),
      getDLQSummary(),
      getSyncDLQ(8),
      getWebhookDLQ(8),
      getRecentJournal(undefined, 25),
      getRecoveryStats(7),
      db.syncLog.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true, status: true, syncType: true, createdAt: true,
          recordsCreated: true, recordsUpdated: true,
          startedAt: true, finishedAt: true, errors: true,
        },
      }),
      db.integration.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ])

  const m = Object.fromEntries(todayMetrics.map(x => [x.name, x.value]))

  const integrationsByStatus = Object.fromEntries(
    integrationStats.map(s => [s.status, s._count._all])
  )

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Runtime Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Internal observability — today ({new Date().toLocaleDateString('pl-PL')})</p>
        </div>
        <span className="text-[10px] text-muted-foreground border border-amber-500/30 text-amber-500 px-2 py-1 rounded">DEV/ADMIN</span>
      </div>

      {/* ── Sync Health ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sync Health</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Sync success (today)" value={m['sync.success'] ?? 0} />
          <MetricCard label="Sync failed (today)" value={m['sync.failed'] ?? 0} alert={(m['sync.failed'] ?? 0) > 0} />
          <MetricCard label="Workouts created" value={m['sync.workouts_created'] ?? 0} />
          <MetricCard label="Recovery rate (7d)" value={`${recovery.successRate}%`} />
        </div>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Active integrations" value={integrationsByStatus.ACTIVE ?? 0} />
          <MetricCard label="Error integrations" value={integrationsByStatus.ERROR ?? 0} alert={(integrationsByStatus.ERROR ?? 0) > 0} />
          <MetricCard label="Token refreshes" value={m['sync.token_refreshed'] ?? 0} />
          <MetricCard label="Token refresh fails" value={m['sync.token_refresh_failed'] ?? 0} alert={(m['sync.token_refresh_failed'] ?? 0) > 0} />
        </div>
      </section>

      {/* ── AI Runtime ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">AI Runtime</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Generated today" value={m['ai.generated'] ?? 0} />
          <MetricCard label="Failed" value={m['ai.failed'] ?? 0} alert={(m['ai.failed'] ?? 0) > 0} />
          <MetricCard label="Malformed JSON" value={m['ai.malformed_json'] ?? 0} alert={(m['ai.malformed_json'] ?? 0) > 0} />
          <MetricCard label="Schema invalid" value={m['ai.schema_invalid'] ?? 0} alert={(m['ai.schema_invalid'] ?? 0) > 0} />
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Retried" value={m['ai.retried'] ?? 0} />
          <MetricCard label="Insights invalidated" value={m['ai.insight_invalidated'] ?? 0} />
          <MetricCard label="Tokens used (today)" value={m['ai.tokens_used'] ?? 0} sublabel="total" />
          <MetricCard label="Avg latency" value={m['ai.latency_ms'] && m['ai.generated'] ? `${Math.round(m['ai.latency_ms'] / m['ai.generated'])}ms` : '-'} />
        </div>
      </section>

      {/* ── Webhooks ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Webhooks</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Received" value={m['webhook.received'] ?? 0} />
          <MetricCard label="Processed" value={m['webhook.processed'] ?? 0} />
          <MetricCard label="Duplicates blocked" value={m['webhook.duplicate'] ?? 0} />
          <MetricCard label="Failed" value={m['webhook.failed'] ?? 0} alert={(m['webhook.failed'] ?? 0) > 0} />
        </div>
      </section>

      {/* ── DLQ ──────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Dead Letter Queue {dlqSummary.total > 0 && <span className="text-red-500 ml-1">({dlqSummary.total} items)</span>}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Sync DLQ" value={dlqSummary.sync} alert={dlqSummary.sync > 0} />
          <MetricCard label="Webhook DLQ" value={dlqSummary.webhook} alert={dlqSummary.webhook > 0} />
          <MetricCard label="Notification DLQ" value={dlqSummary.notification} alert={dlqSummary.notification > 0} />
        </div>
      </section>

      {/* ── Recent Syncs ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent Syncs (24h)</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Time</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Type</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Status</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Created</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Updated</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {recentSyncs.map(s => {
                const durationMs = s.finishedAt && s.startedAt
                  ? new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()
                  : null
                return (
                  <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                    <td className="px-3 py-2 text-muted-foreground">{new Date(s.createdAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                    <td className="px-3 py-2">{s.syncType}</td>
                    <td className="px-3 py-2"><StatusBadge status={s.status} /></td>
                    <td className="px-3 py-2 text-right">{s.recordsCreated ?? 0}</td>
                    <td className="px-3 py-2 text-right">{s.recordsUpdated ?? 0}</td>
                    <td className="px-3 py-2 text-right">{durationMs != null ? `${durationMs}ms` : '-'}</td>
                  </tr>
                )
              })}
              {recentSyncs.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">No syncs in last 24h</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Webhook DLQ ──────────────────────────────────────────────── */}
      {webhookDLQ.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3">Webhook DLQ ({webhookDLQ.length})</h2>
          <div className="space-y-2">
            {webhookDLQ.map(w => (
              <div key={w.id} className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-muted-foreground">{w.id.slice(0, 12)}…</span>
                  <StatusBadge status={w.status} />
                </div>
                <p className="text-foreground mt-0.5">{w.eventType} · retries: {w.retryCount}</p>
                {w.errorMessage && <p className="text-red-400 mt-0.5">{w.errorMessage}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Event Journal ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Event Journal (recent 25)</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Time</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Event</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Source</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Status</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">ms</th>
              </tr>
            </thead>
            <tbody>
              {journal.map(j => (
                <tr key={j.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                  <td className="px-3 py-1.5 text-muted-foreground font-mono">{new Date(j.createdAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                  <td className="px-3 py-1.5 font-mono">{j.eventType}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{j.source}</td>
                  <td className="px-3 py-1.5"><StatusBadge status={j.status} /></td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground">{j.processingMs ?? '-'}</td>
                </tr>
              ))}
              {journal.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">No journal events yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Debug Panel (DEV only) ────────────────────────────────────── */}
      {process.env.ENABLE_RUNTIME_DEBUG === 'true' && (
        <section>
          <h2 className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-3">Debug Panel</h2>
          <RuntimeDebugPanel userId={user.id} syncDLQ={syncDLQ} webhookDLQ={webhookDLQ} />
        </section>
      )}
    </div>
  )
}
