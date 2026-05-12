'use client'

// RuntimeDebugPanel — DEV only developer tools
// Allows: replay event, replay webhook, simulate failure, rerun sync, rerun AI

import { useState } from 'react'
import { RefreshCw, Play, Zap, Loader2, AlertTriangle } from 'lucide-react'

type SyncDLQItem = { id: string; status: string; syncType: string; errors?: unknown; createdAt: Date; [key: string]: unknown }
type WebhookDLQItem = { id: string; status: string; eventType: string; errorMessage: string | null; retryCount: number; createdAt: Date }

type Props = {
  userId: string
  syncDLQ: SyncDLQItem[]
  webhookDLQ: WebhookDLQItem[]
}

export function RuntimeDebugPanel({ userId, syncDLQ, webhookDLQ }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [messages, setMessages] = useState<string[]>([])

  function log(msg: string) {
    setMessages(prev => [`[${new Date().toLocaleTimeString('pl-PL')}] ${msg}`, ...prev.slice(0, 19)])
  }

  async function replaySync() {
    setLoading('sync')
    try {
      const res = await fetch('/api/runtime/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sync', userId }),
      })
      const data = await res.json()
      log(data.ok ? `Sync replay OK (${data.durationMs}ms)` : `Sync replay failed: ${data.message}`)
    } catch (e) { log(`Error: ${e}`) }
    setLoading(null)
  }

  async function replayWebhook(id: string) {
    setLoading(`webhook:${id}`)
    try {
      const res = await fetch('/api/runtime/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'webhook', webhookEventId: id }),
      })
      const data = await res.json()
      log(data.ok ? `Webhook ${id.slice(0, 8)} replayed OK` : `Webhook replay failed: ${data.message}`)
    } catch (e) { log(`Error: ${e}`) }
    setLoading(null)
  }

  async function replayAI(type: 'morning' | 'midday' | 'evening') {
    setLoading(`ai:${type}`)
    try {
      const res = await fetch('/api/runtime/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ai', userId, insightType: type }),
      })
      const data = await res.json()
      log(data.ok ? `AI ${type} invalidated — will regenerate` : `AI replay failed: ${data.message}`)
    } catch (e) { log(`Error: ${e}`) }
    setLoading(null)
  }

  async function triggerManualSync() {
    setLoading('manual-sync')
    try {
      const res = await fetch('/api/integrations/trainingpeaks/sync', { method: 'POST' })
      const data = await res.json()
      log(data.success ? `Manual sync OK: +${data.workoutsCreated} created` : `Sync failed: ${data.message}`)
    } catch (e) { log(`Error: ${e}`) }
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
        <div className="flex items-center gap-2 text-amber-500 text-xs font-medium mb-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          Development tools — not visible in production
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <DebugButton
          label="Rerun Sync"
          icon={<RefreshCw className="h-3.5 w-3.5" />}
          loading={loading === 'manual-sync'}
          onClick={triggerManualSync}
        />
        <DebugButton
          label="Replay Sync"
          icon={<Play className="h-3.5 w-3.5" />}
          loading={loading === 'sync'}
          onClick={replaySync}
        />
        <DebugButton
          label="Replay Morning AI"
          icon={<Zap className="h-3.5 w-3.5" />}
          loading={loading === 'ai:morning'}
          onClick={() => replayAI('morning')}
        />
        <DebugButton
          label="Replay Evening AI"
          icon={<Zap className="h-3.5 w-3.5" />}
          loading={loading === 'ai:evening'}
          onClick={() => replayAI('evening')}
        />
      </div>

      {/* Webhook DLQ replay */}
      {webhookDLQ.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Webhook DLQ — click to replay</p>
          {webhookDLQ.map(w => (
            <div key={w.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5">
              <div>
                <p className="text-xs font-mono">{w.id.slice(0, 16)}…</p>
                <p className="text-[10px] text-muted-foreground">{w.eventType} · retries: {w.retryCount}</p>
              </div>
              <button
                onClick={() => replayWebhook(w.id)}
                disabled={!!loading}
                className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
              >
                {loading === `webhook:${w.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                Replay
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Log output */}
      {messages.length > 0 && (
        <div className="rounded-lg bg-black/30 border border-border p-2 font-mono text-[10px] space-y-0.5 max-h-36 overflow-y-auto">
          {messages.map((msg, i) => <p key={i} className="text-green-400">{msg}</p>)}
        </div>
      )}
    </div>
  )
}

function DebugButton({
  label, icon, loading, onClick,
}: {
  label: string
  icon: React.ReactNode
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium hover:bg-border transition-colors disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  )
}
