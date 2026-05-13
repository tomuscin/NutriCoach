// Analytics event tracker — ETAP 7
// Lightweight product analytics backed by AnalyticsEvent table.
// Fire-and-forget — never throws, never blocks.

import 'server-only'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export type ProductEvent =
  // Registration funnel
  | 'registration.started'
  | 'registration.completed'
  | 'email.verification.sent'
  | 'email.verification.completed'
  // Onboarding funnel
  | 'onboarding.started'
  | 'onboarding.step_completed'
  | 'onboarding.completed'
  | 'onboarding.abandoned'
  // Integration
  | 'tp.connect.started'
  | 'tp.connect.completed'
  | 'tp.connect.failed'
  | 'tp.disconnect'
  | 'tp.sync.completed'
  // AI insights
  | 'insight.viewed'
  | 'insight.feedback.positive'
  | 'insight.feedback.negative'
  | 'insight.generated'
  | 'insight.generation.failed'
  // Retention
  | 'session.started'
  | 'dashboard.viewed'
  | 'notification.clicked'
  | 'push.subscribed'
  | 'push.denied'
  // Settings
  | 'settings.viewed'
  | 'account.deleted'
  | 'data.exported'
  // PWA lifecycle (client-side, tracked via /api/pwa/events — mirrored here for type completeness)
  | 'pwa.install.shown'
  | 'pwa.install.prompted'
  | 'pwa.install.accepted'
  | 'pwa.install.dismissed'
  | 'pwa.standalone.launch'
  | 'pwa.offline.used'
  | 'pwa.sw.updated'
  | 'pwa.push.prompted'
  | 'pwa.push.accepted'
  | 'pwa.push.dismissed'
  | 'pwa.push.denied'

interface TrackEventParams {
  userId?: string
  sessionId?: string
  event: ProductEvent
  properties?: Record<string, unknown>
  page?: string
  ip?: string
  userAgent?: string
}

export function trackEvent(params: TrackEventParams): void {
  // Fire-and-forget — wrap in void, never block
  _trackEventAsync(params).catch(err => {
    logger.warn({ event: params.event, err }, 'analytics.track.failed')
  })
}

async function _trackEventAsync(params: TrackEventParams): Promise<void> {
  await prisma.analyticsEvent.create({
    data: {
      userId: params.userId,
      sessionId: params.sessionId,
      event: params.event,
      properties: params.properties as never,
      page: params.page,
      ip: params.ip,
      userAgent: params.userAgent,
    },
  })
}

// ─── Funnel queries for runtime dashboard ────────────────────────────────────

export async function getOnboardingFunnel(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const events: ProductEvent[] = [
    'registration.completed',
    'onboarding.started',
    'tp.connect.completed',
    'onboarding.completed',
  ]
  const results = await Promise.all(
    events.map(e =>
      prisma.analyticsEvent.count({ where: { event: e, createdAt: { gte: since } } })
    )
  )
  return Object.fromEntries(events.map((e, i) => [e, results[i]]))
}

export async function getRetentionEvents(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return prisma.analyticsEvent.groupBy({
    by: ['event'],
    _count: { _all: true },
    where: { createdAt: { gte: since } },
    orderBy: [{ _count: { event: 'desc' } }],
    take: 20,
  })
}
