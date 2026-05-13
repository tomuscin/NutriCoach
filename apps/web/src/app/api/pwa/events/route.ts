import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/pwa/events — lightweight PWA event tracker
// Used by client-side hooks that can't call server-only trackEvent().
// Auth optional — events are tracked anonymously (session-level context only).
// All events are fire-and-forget from the client.

const ALLOWED_EVENTS = new Set([
  'pwa.install.shown',
  'pwa.install.prompted',
  'pwa.install.accepted',
  'pwa.install.dismissed',
  'pwa.standalone.launch',
  'pwa.offline.used',
  'pwa.sw.updated',
  'pwa.push.prompted',
  'pwa.push.accepted',
  'pwa.push.dismissed',
  'pwa.push.denied',
])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, platform, timestamp } = body

    // Validate event name — allowlist only
    if (!event || typeof event !== 'string' || !ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 })
    }

    // Fire-and-forget write to analytics (don't block on errors)
    await prisma.analyticsEvent.create({
      data: {
        event,
        userAgent: request.headers.get('user-agent')?.slice(0, 256) ?? null,
        properties: {
          platform: typeof platform === 'string' ? platform.slice(0, 64) : undefined,
          clientTs: typeof timestamp === 'number' ? timestamp : undefined,
        },
      },
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch {
    // Never expose errors to client
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
