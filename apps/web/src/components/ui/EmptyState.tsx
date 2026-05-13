// EmptyState — premium empty state with focal icon, clear hierarchy, animated entrance
// Used across: no workouts, no connection, no insights, no notifications, etc.

import { type LucideIcon, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  /** Visual size — default 'md' */
  size?: 'sm' | 'md' | 'lg'
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className = '',
  size = 'md',
}: EmptyStateProps) {
  const iconSizes = {
    sm: { wrap: 'h-10 w-10', icon: 'h-5 w-5', py: 'py-8' },
    md: { wrap: 'h-14 w-14', icon: 'h-7 w-7', py: 'py-12' },
    lg: { wrap: 'h-18 w-18', icon: 'h-9 w-9', py: 'py-16' },
  }
  const s = iconSizes[size]

  return (
    <div className={cn('flex flex-col items-center gap-5 text-center animate-fade-in', s.py, className)}>
      {/* Icon with layered gradient background — focal point */}
      <div className="relative">
        {/* Outer glow ring */}
        <div
          className={cn('absolute inset-0 rounded-2xl blur-xl opacity-20')}
          style={{ background: 'hsl(var(--primary))' }}
        />
        {/* Icon container */}
        <div
          className={cn(
            'relative flex items-center justify-center rounded-2xl',
            s.wrap,
          )}
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.06))',
            border: '1px solid hsl(var(--primary) / 0.2)',
          }}
        >
          <Icon className={cn(s.icon, 'text-primary')} />
        </div>
      </div>

      {/* Text hierarchy */}
      <div className="space-y-1.5 max-w-xs">
        <p className="font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-1">
          {action && (
            action.href ? (
              <a
                href={action.href}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-105 transition-all hover:-translate-y-0.5 shadow-elevation-2"
              >
                {action.label}
              </a>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-105 transition-all hover:-translate-y-0.5 shadow-elevation-2"
              >
                {action.label}
              </button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <a
                href={secondaryAction.href}
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {secondaryAction.label}
              </a>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
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
