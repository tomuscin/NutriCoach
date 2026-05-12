import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Integracje' }

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integracje</h1>
        <p className="text-muted-foreground">Połącz TrainingPeaks, Garmin i inne usługi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TrainingPeaks card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">TrainingPeaks</h3>
              <p className="text-sm text-muted-foreground">
                Synchronizuj treningi, TSS, HRV, plany
              </p>
            </div>
            {/* Status badge */}
            <span className="text-xs rounded-full px-2 py-1 bg-muted text-muted-foreground">
              Niepołączony
            </span>
          </div>
          <div className="text-center text-sm text-muted-foreground rounded-lg border border-dashed border-border p-4">
            OAuth flow — ETAP 9
          </div>
        </div>

        {/* Garmin card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Garmin Connect</h3>
              <p className="text-sm text-muted-foreground">
                Aktywności, sen, HRV, Body Battery
              </p>
            </div>
            <span className="text-xs rounded-full px-2 py-1 bg-muted text-muted-foreground">
              Przyszłość
            </span>
          </div>
          <div className="text-center text-sm text-muted-foreground rounded-lg border border-dashed border-border p-4">
            Garmin OAuth — ETAP 10
          </div>
        </div>
      </div>
    </div>
  )
}
