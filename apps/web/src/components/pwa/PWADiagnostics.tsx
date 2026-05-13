'use client'

// PWADiagnostics — dev-only panel showing PWA runtime state.
// Only renders in development (process.env.NODE_ENV === 'development').
// Toggle with ?pwa-debug=1 in URL or click the floating icon.
//
// Shows: SW state, cache status, install state, push permission, network status.

import { useState, useEffect } from 'react'
import { usePWAContext } from '@/components/providers/PWAProvider'

interface SWInfo {
  controller: string
  waiting: boolean
  installing: boolean
  cacheKeys: string[]
}

async function getSWInfo(): Promise<SWInfo | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return null

    const cacheKeys = await caches.keys()

    return {
      controller: reg.active?.state ?? 'none',
      waiting: !!reg.waiting,
      installing: !!reg.installing,
      cacheKeys,
    }
  } catch {
    return null
  }
}

function Badge({ label, value, variant = 'default' }: { label: string; value: string; variant?: 'success' | 'warning' | 'error' | 'default' }) {
  const colors = {
    success: 'bg-green-500/15 text-green-400 border-green-500/20',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    error: 'bg-red-500/15 text-red-400 border-red-500/20',
    default: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${colors[variant]}`}>{value}</span>
    </div>
  )
}

export function PWADiagnostics() {
  const [open, setOpen] = useState(false)
  const [swInfo, setSwInfo] = useState<SWInfo | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const pwa = usePWAContext()

  // Only show in dev
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('pwa-debug') === '1') {
      setOpen(true)
    }
    setShowPanel(true)
  }, [])

  useEffect(() => {
    if (!open) return
    getSWInfo().then(setSwInfo)
    const interval = setInterval(() => getSWInfo().then(setSwInfo), 3000)
    return () => clearInterval(interval)
  }, [open])

  if (!showPanel) return null

  function getInstallVariant(): 'success' | 'warning' | 'error' | 'default' {
    if (pwa.isStandalone) return 'success'
    if (pwa.canInstall) return 'warning'
    if (pwa.installState === 'unsupported') return 'error'
    return 'default'
  }

  function getPushVariant(): 'success' | 'warning' | 'error' | 'default' {
    if (pwa.pushPermission === 'granted') return 'success'
    if (pwa.pushPermission === 'denied') return 'error'
    return 'warning'
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] right-3 z-[9999] flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold shadow-lg transition-all"
        style={{
          background: open ? 'hsl(var(--primary))' : 'hsl(var(--surface-3))',
          border: '1px solid hsl(var(--border-strong))',
          color: open ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
        }}
        title="PWA Diagnostics (dev only)"
      >
        PWA
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+8rem)] right-3 z-[9998] w-64 rounded-xl p-3 animate-scale-in"
          style={{
            background: 'hsl(var(--surface-4))',
            border: '1px solid hsl(var(--border-strong))',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">PWA Debug</p>

          {/* Network */}
          <Badge label="Network" value={pwa.isOnline ? 'online' : 'offline'} variant={pwa.isOnline ? 'success' : 'error'} />

          {/* Install */}
          <Badge label="Install state" value={pwa.installState} variant={getInstallVariant()} />
          <Badge label="Platform" value={pwa.platform} />
          <Badge label="Standalone" value={String(pwa.isStandalone)} variant={pwa.isStandalone ? 'success' : 'default'} />

          {/* SW */}
          <div className="border-t border-border mt-1.5 pt-1.5">
            <Badge label="SW controller" value={swInfo?.controller ?? '—'} variant={swInfo?.controller === 'activated' ? 'success' : 'warning'} />
            <Badge label="SW waiting" value={String(swInfo?.waiting ?? '—')} variant={swInfo?.waiting ? 'warning' : 'default'} />
            <Badge label="SW version" value={pwa.swVersion ?? '—'} />
            <Badge label="Update ready" value={String(pwa.updateAvailable)} variant={pwa.updateAvailable ? 'warning' : 'default'} />
          </div>

          {/* Push */}
          <div className="border-t border-border mt-1.5 pt-1.5">
            <Badge label="Push permission" value={pwa.pushPermission} variant={getPushVariant()} />
          </div>

          {/* Cache keys */}
          {swInfo?.cacheKeys && swInfo.cacheKeys.length > 0 && (
            <div className="border-t border-border mt-1.5 pt-1.5">
              <p className="text-[10px] text-muted-foreground mb-1">Caches ({swInfo.cacheKeys.length})</p>
              {swInfo.cacheKeys.map(k => (
                <p key={k} className="text-[10px] font-mono text-muted-foreground truncate">{k}</p>
              ))}
            </div>
          )}

          {/* Actions */}
          {pwa.updateAvailable && (
            <button
              onClick={pwa.applyUpdate}
              className="mt-2 w-full rounded-lg py-1.5 text-[11px] font-semibold bg-primary text-primary-foreground"
            >
              Apply Update
            </button>
          )}
        </div>
      )}
    </>
  )
}
