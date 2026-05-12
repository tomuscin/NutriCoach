'use client'

// NotificationsClient — renders notification list with mark-as-read
// Groups notifications by date, shows type badge and actions

import { useState } from 'react'
import { Bell, BrainCircuit, RefreshCw, AlertCircle, Trophy, Salad, CheckCheck, Check } from 'lucide-react'
import type { NotificationType, NotificationStatus } from '@prisma/client'

type NotificationItem = {
  id: string
  type: NotificationType
  status: NotificationStatus
  title: string
  body: string
  data: unknown
  readAt: Date | null
  createdAt: Date
}

interface Props {
  initialNotifications: NotificationItem[]
}

const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  MORNING_BRIEF: { icon: BrainCircuit, label: 'Brief poranny', color: 'text-blue-500 bg-blue-500/10' },
  MIDDAY_CHECK: { icon: BrainCircuit, label: 'Check w południe', color: 'text-sky-500 bg-sky-500/10' },
  EVENING_REVIEW: { icon: BrainCircuit, label: 'Przegląd wieczorny', color: 'text-indigo-500 bg-indigo-500/10' },
  GOAL_MILESTONE: { icon: Trophy, label: 'Cel osiągnięty', color: 'text-amber-500 bg-amber-500/10' },
  NUTRITION_REMINDER: { icon: Salad, label: 'Przypomnienie', color: 'text-green-500 bg-green-500/10' },
  SYNC_COMPLETE: { icon: RefreshCw, label: 'Synchronizacja', color: 'text-emerald-500 bg-emerald-500/10' },
  SYNC_ERROR: { icon: AlertCircle, label: 'Błąd synchronizacji', color: 'text-red-500 bg-red-500/10' },
  WEEKLY_REPORT: { icon: Trophy, label: 'Raport tygodniowy', color: 'text-purple-500 bg-purple-500/10' },
  SYSTEM: { icon: Bell, label: 'System', color: 'text-muted-foreground bg-muted' },
}

export function NotificationsClient({ initialNotifications }: Props) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [markingAll, setMarkingAll] = useState(false)

  const unread = notifications.filter(n => !n.readAt)

  async function markAsRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date() } : n))
    } catch {/* silent */}
  }

  async function markAllAsRead() {
    setMarkingAll(true)
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' })
      setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date() })))
    } catch {/* silent */}
    finally { setMarkingAll(false) }
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Bell className="h-8 w-8 text-muted-foreground"/>
        </div>
        <div>
          <p className="font-semibold">Brak powiadomień</p>
          <p className="text-sm text-muted-foreground mt-1">Tutaj pojawią się Twoje powiadomienia i briefy od AI Coacha.</p>
        </div>
      </div>
    )
  }

  // Group by date
  const groups = groupByDate(notifications)

  return (
    <div className="space-y-4">
      {/* Header actions */}
      {unread.length > 0 && (
        <div className="flex justify-end">
          <button type="button" onClick={markAllAsRead} disabled={markingAll}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50">
            <CheckCheck className="h-3.5 w-3.5"/>
            Oznacz wszystkie jako przeczytane
          </button>
        </div>
      )}

      {/* Groups */}
      {groups.map(({ label, items }) => (
        <div key={label} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">{label}</p>
          <div className="space-y-2">
            {items.map(n => (
              <NotificationCard key={n.id} notification={n} onMarkRead={() => markAsRead(n.id)}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function NotificationCard({ notification: n, onMarkRead }: { notification: NotificationItem; onMarkRead: () => void }) {
  const cfg = typeConfig[n.type] ?? typeConfig.SYSTEM!
  const Icon = cfg.icon
  const isUnread = !n.readAt

  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 transition-colors ${isUnread ? 'bg-card border-border' : 'bg-muted/30 border-border/50'}`}>
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${cfg.color}`}>
        <Icon className="h-4.5 w-4.5"/>
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>{n.title}</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isUnread && <div className="h-2 w-2 rounded-full bg-primary"/>}
            <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(n.createdAt)}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-snug line-clamp-2">{n.body}</p>
        <div className="flex items-center justify-between pt-1">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
            {cfg.label}
          </span>
          {isUnread && (
            <button type="button" onClick={onMarkRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Check className="h-3 w-3"/>Przeczytane
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByDate(items: NotificationItem[]): { label: string; items: NotificationItem[] }[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const groups = new Map<string, NotificationItem[]>()

  for (const item of items) {
    const d = new Date(item.createdAt)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    let label: string
    if (day.getTime() === today.getTime()) label = 'Dzisiaj'
    else if (day.getTime() === yesterday.getTime()) label = 'Wczoraj'
    else label = d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(item)
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }))
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}
