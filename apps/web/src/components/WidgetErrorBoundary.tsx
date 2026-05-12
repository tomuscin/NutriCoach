'use client'

// WidgetErrorBoundary — isolates widget-level crashes
// Dashboard widgets are wrapped individually so one failing widget
// doesn't crash the entire dashboard.
//
// Usage (Server Component):
//   <WidgetErrorBoundary label="Nutrition">
//     <MacroProgress nutrition={data.todayNutrition} />
//   </WidgetErrorBoundary>

import React from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  label?: string
  /** Custom fallback — defaults to compact error card */
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class WidgetErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.withScope((scope) => {
      scope.setTag('component', 'widget')
      scope.setTag('widget', this.props.label ?? 'unknown')
      scope.setExtra('componentStack', info.componentStack)
      Sentry.captureException(error)
    })
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 p-4 text-center min-h-[80px]">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <p className="text-xs text-muted-foreground">
            {this.props.label ? `${this.props.label} unavailable` : 'Widget unavailable'}
          </p>
          <button
            onClick={this.reset}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ─── Chart-specific boundary (larger fallback) ─────────────────────────────────

export class ChartErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.withScope((scope) => {
      scope.setTag('component', 'chart')
      scope.setTag('chart', this.props.label ?? 'unknown')
      scope.setExtra('componentStack', info.componentStack)
      Sentry.captureException(error)
    })
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/20 h-full min-h-[120px]">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <p className="text-sm text-muted-foreground">Chart failed to render</p>
          <button
            onClick={this.reset}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
