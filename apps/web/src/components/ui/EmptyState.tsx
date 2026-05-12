// EmptyState — reusable empty state component with icon, title, description, and optional CTA
// Used across all sections: no workouts, no TP connection, no insights, no notifications, etc.

import { type LucideIcon, Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  secondaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-4 py-12 text-center ${className}`}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="space-y-1 max-w-xs">
        <p className="font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          {action && (
            action.href ? (
              <a
                href={action.href}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {action.label}
              </a>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {action.label}
              </button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <a
                href={secondaryAction.href}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {secondaryAction.label}
              </a>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {secondaryAction.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ─── Pre-configured variants ──────────────────────────────────────────────────

import { Dumbbell, BrainCircuit, Link2, Bell, BarChart2, Heart, Salad } from 'lucide-react'

export function NoWorkoutsEmpty() {
  return (
    <EmptyState
      icon={Dumbbell}
      title="Brak treningów"
      description="Połącz TrainingPeaks, aby zsynchronizować swoje treningi i odblokować pełne możliwości AI Coacha."
      action={{ label: 'Połącz TrainingPeaks', href: '/integrations' }}
      secondaryAction={{ label: 'Dowiedz się więcej', href: '/health-disclaimer' }}
    />
  )
}

export function NoTPConnectionEmpty() {
  return (
    <EmptyState
      icon={Link2}
      title="TrainingPeaks nie połączony"
      description="Aby zobaczyć swoje treningi i otrzymać spersonalizowane rekomendacje żywieniowe, połącz swoje konto TrainingPeaks."
      action={{ label: 'Połącz teraz', href: '/integrations' }}
    />
  )
}

export function NoInsightsEmpty() {
  return (
    <EmptyState
      icon={BrainCircuit}
      title="Brak rekomendacji AI"
      description="AI Coach wygeneruje Twój pierwszy brief po pierwszej synchronizacji treningów. Wróć jutro rano!"
      action={{ label: 'Synchronizuj teraz', href: '/integrations' }}
    />
  )
}

export function NoNotificationsEmpty() {
  return (
    <EmptyState
      icon={Bell}
      title="Brak powiadomień"
      description="Tutaj pojawią się Twoje briefy poranne, przypomnienia i ważne informacje od AI Coacha."
    />
  )
}

export function NoAnalyticsEmpty() {
  return (
    <EmptyState
      icon={BarChart2}
      title="Brak danych analitycznych"
      description="Dane dotyczące Twojej aktywności i odżywiania pojawią się tutaj po kilku tygodniach używania aplikacji."
    />
  )
}

export function NoRecoveryDataEmpty() {
  return (
    <EmptyState
      icon={Heart}
      title="Brak danych regeneracji"
      description="Dane o Twojej regeneracji zostaną obliczone po synchronizacji treningów z TrainingPeaks."
      action={{ label: 'Połącz TrainingPeaks', href: '/integrations' }}
    />
  )
}

export function NoNutritionPlanEmpty() {
  return (
    <EmptyState
      icon={Salad}
      title="Brak planu żywieniowego"
      description="Zakończ konfigurację profilu, aby AI Coach mógł wygenerować Twój spersonalizowany plan żywieniowy."
      action={{ label: 'Uzupełnij profil', href: '/profile' }}
    />
  )
}
