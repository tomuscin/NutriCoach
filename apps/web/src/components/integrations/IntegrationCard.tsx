// IntegrationCard — shows status of one integration, connect/disconnect controls
'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
  ExternalLink,
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

const STATUS_CONFIG: Record<IntegrationStatus, { label: string; color: string; icon: React.ElementType }> = {
  ACTIVE: { label: 'Połączono', color: 'text-green-500', icon: CheckCircle2 },
  DISCONNECTED: { label: 'Rozłączono', color: 'text-muted-foreground', icon: XCircle },
  ERROR: { label: 'Błąd synchronizacji', color: 'text-red-500', icon: AlertTriangle },
  EXPIRED: { label: 'Token wygasł', color: 'text-amber-500', icon: AlertTriangle },
  REVOKED: { label: 'Dostęp cofnięty', color: 'text-red-500', icon: XCircle },
  PENDING: { label: 'Łączenie...', color: 'text-blue-400', icon: Loader2 },
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
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const cfg = status ? STATUS_CONFIG[status] : null
  const isConnected = status === 'ACTIVE'
  const hasError = status === 'ERROR' || status === 'EXPIRED' || status === 'REVOKED'

  async function handleSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch(`/api/integrations/${provider.toLowerCase()}/sync`, { method: 'POST' })
      const data = await res.json()
      setSyncMsg(data.message ?? (data.success ? 'Synchronizacja OK' : 'Błąd'))
    } catch {
      setSyncMsg('Błąd połączenia')
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
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{logoEmoji}</span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{displayName}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {cfg && (
          <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
            <cfg.icon className="h-3.5 w-3.5" />
            {cfg.label}
          </div>
        )}
      </div>

      {/* Error details */}
      {hasError && errorMessage && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
          <p className="text-xs text-red-500">{errorMessage}</p>
        </div>
      )}

      {/* Sync metadata */}
      {isConnected && (
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>
            <p className="font-medium text-foreground/60">Ostatnia sync</p>
            <p>{lastSyncAt ? new Date(lastSyncAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : 'Nigdy'}</p>
          </div>
          <div>
            <p className="font-medium text-foreground/60">Następna sync</p>
            <p>{nextSyncAt ? new Date(nextSyncAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</p>
          </div>
        </div>
      )}

      {/* Sync feedback */}
      {syncMsg && (
        <p className="text-xs text-muted-foreground">{syncMsg}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {!isConnected && (
          <a
            href={connectHref}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="h-4 w-4" />
            Połącz
          </a>
        )}
        {isConnected && (
          <>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium hover:bg-border transition-colors disabled:opacity-60"
            >
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Synchronizuj
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-60"
            >
              {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Rozłącz
            </button>
          </>
        )}
        {(status === 'ERROR' || status === 'REVOKED' || status === 'EXPIRED') && (
          <a
            href={connectHref}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 px-3 py-2 text-xs font-medium text-amber-500 hover:bg-amber-500/10 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Połącz ponownie
          </a>
        )}
      </div>
    </div>
  )
}
