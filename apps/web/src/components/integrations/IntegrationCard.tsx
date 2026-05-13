// IntegrationCard — shows status of one integration, connect/disconnect controls
// ETAP 7: added SYNCING state, stale indicator, improved UX states
'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
  ExternalLink,
  Clock,
  WifiOff,
} from 'lucide-react'

type IntegrationStatus = 'ACTIVE' | 'DISCONNECTED' | 'ERROR' | 'EXPIRED' | 'REVOKED' | 'PENDING'

type Props = {
  provider: string
  displayName: string
  description: string
  logoEmoji: string
  status: IntegrationStatus | null
  lastSyncAt: string | null
  nextSyncAt: string | null
  errorMessage: string | null
  errorCount: number
  connectHref: string
}

const STATUS_CONFIG: Record<IntegrationStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  ACTIVE: { label: 'Połączono', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', icon: CheckCircle2 },
  DISCONNECTED: { label: 'Rozłączono', color: 'text-muted-foreground', bg: 'bg-muted', icon: WifiOff },
  ERROR: { label: 'Błąd synchronizacji', color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle },
  EXPIRED: { label: 'Token wygasł', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock },
  REVOKED: { label: 'Dostęp cofnięty', color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle },
  PENDING: { label: 'Łączenie…', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Loader2 },
}

function isStale(lastSyncAt: string | null): boolean {
  if (!lastSyncAt) return false
  return Date.now() - new Date(lastSyncAt).getTime() > 24 * 60 * 60 * 1000
}

export function IntegrationCard({
  provider,
  displayName,
  description,
  logoEmoji,
  status,
  lastSyncAt,
  nextSyncAt,
  errorMessage,
  connectHref,
}: Props) {
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncMsg, setSyncMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const cfg = status ? STATUS_CONFIG[status] : null
  const isConnected = status === 'ACTIVE'
  const hasError = status === 'ERROR' || status === 'EXPIRED' || status === 'REVOKED'
  const stale = isConnected && isStale(lastSyncAt)

  async function handleSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch(`/api/integrations/${provider.toLowerCase()}/sync`, { method: 'POST' })
      const data = await res.json()
      setSyncMsg({ text: data.message ?? (data.success ? 'Synchronizacja zakończona' : 'Błąd synchronizacji'), ok: !!data.success })
    } catch {
      setSyncMsg({ text: 'Błąd połączenia z serwerem', ok: false })
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm(`Odłączyć ${displayName}? Dane treningowe zostaną zachowane.`)) return
    setDisconnecting(true)
    try {
      await fetch(`/api/integrations/${provider.toLowerCase()}/disconnect`, { method: 'POST' })
      window.location.reload()
    } catch {
      setDisconnecting(false)
    }
  }

  return (
    <div
      className={`rounded-2xl border bg-card p-5 space-y-4 transition-all duration-200 hover:shadow-elevation-3 hover:-translate-y-0.5 ${hasError ? 'border-red-500/30' : stale ? 'border-amber-500/30' : 'border-border'}`}
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">{logoEmoji}</span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{displayName}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {cfg && (
          <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.color} ${cfg.bg}`}>
            <cfg.icon className={`h-3 w-3 ${status === 'PENDING' ? 'animate-spin' : ''}`} />
            {cfg.label}
          </div>
        )}
      </div>

      {/* Stale warning */}
      {stale && !hasError && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2">
          <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0"/>
          <p className="text-xs text-amber-600 dark:text-amber-400">Ostatnia synchronizacja była ponad 24h temu. Dane mogą być nieaktualne.</p>
        </div>
      )}

      {/* Error details */}
      {hasError && errorMessage && (
        <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0"/>
          <p className="text-xs text-red-500">{errorMessage}</p>
        </div>
      )}

      {/* Sync metadata */}
      {isConnected && (
        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="space-y-0.5">
            <p className="font-medium text-foreground/60">Ostatnia sync</p>
            <p className={stale ? 'text-amber-500' : ''}>{lastSyncAt ? new Date(lastSyncAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : 'Nigdy'}</p>
          </div>
          <div className="space-y-0.5">
            <p className="font-medium text-foreground/60">Następna sync</p>
            <p>{nextSyncAt ? new Date(nextSyncAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : 'Auto'}</p>
          </div>
        </div>
      )}

      {/* Sync feedback */}
      {syncMsg && (
        <p className={`text-xs ${syncMsg.ok ? 'text-green-500' : 'text-red-500'}`}>{syncMsg.text}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {!isConnected && !hasError && (
          <a
            href={connectHref}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Połącz {displayName}
          </a>
        )}
        {isConnected && (
          <>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-muted px-3.5 py-2 text-xs font-medium hover:bg-border transition-colors disabled:opacity-60"
            >
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {syncing ? 'Synchronizuję…' : 'Synchronizuj'}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3.5 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-60"
            >
              {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Rozłącz
            </button>
          </>
        )}
        {hasError && (
          <a
            href={connectHref}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 px-3.5 py-2 text-xs font-medium text-amber-500 hover:bg-amber-500/10 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Połącz ponownie
          </a>
        )}
      </div>
    </div>
  )
}
