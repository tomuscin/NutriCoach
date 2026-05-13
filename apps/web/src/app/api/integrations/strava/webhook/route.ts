// /api/integrations/strava/webhook
//
// GET  — Strava subscription validation challenge (hub.challenge echo)
// POST — Incoming webhook events (activity.create / activity.update / athlete.deauthorize)
//
// Security:
// - GET: validate hub.verify_token against STRAVA_WEBHOOK_VERIFY_TOKEN env var
// - POST: validate X-Strava-Signature HMAC-SHA256 header
// - POST: idempotency via payloadHash deduplication

import type { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { prisma as db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { stravaProvider } from '@/lib/integrations/providers/strava/provider'
import { runStravaSync } from '@/lib/integrations/sync/strava-sync'
import { trackEvent } from '@/lib/analytics/events'
import type { StravaWebhookEvent } from '@/lib/integrations/providers/strava/types'
import * as Sentry from '@sentry/nextjs'

export const dynamic = 'force-dynamic'

// ─── GET — Hub challenge verification ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const mode = searchParams.get('hub.mode')
  const challenge = searchParams.get('hub.challenge')
  const verifyToken = searchParams.get('hub.verify_token')

  if (mode !== 'subscribe' || !challenge) {
    return Response.json({ error: 'Invalid subscription request' }, { status: 400 })
  }

  const expectedToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
  if (!expectedToken || verifyToken !== expectedToken) {
    logger.warn({ verifyToken }, 'Strava webhook verify_token mismatch')
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  logger.info('Strava webhook subscription validated')
  return Response.json({ 'hub.challenge': challenge })
}

// ─── POST — Event processing ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Read raw body for signature verification before parsing JSON
  const rawBody = await request.text()

  // Signature verification (optional but strongly recommended)
  const signatureHeader = request.headers.get('x-strava-signature')
  const secret = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN ?? ''

  if (signatureHeader && secret) {
    const valid = stravaProvider.validateWebhookSignature(rawBody, signatureHeader, secret)
    if (!valid) {
      logger.warn('Strava webhook signature validation failed')
      return Response.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let event: StravaWebhookEvent
  try {
    event = JSON.parse(rawBody) as StravaWebhookEvent
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Strava requires 200 OK within 2 seconds — acknowledge immediately
  // and process asynchronously
  processStravaEvent(event, rawBody).catch(err => {
    logger.error({ err, event }, 'Strava webhook processing error')
    Sentry.captureException(err)
  })

  return new Response(null, { status: 200 })
}

// ─── Async event processing ────────────────────────────────────────────────────

async function processStravaEvent(event: StravaWebhookEvent, rawBody: string): Promise<void> {
  // Compute payload hash for idempotency
  const payloadHash = createHash('sha256').update(rawBody).digest('hex')

  // Idempotency: skip if already processed
  const existing = await db.webhookEvent.findFirst({
    where: { payloadHash, provider: 'STRAVA' },
    select: { id: true },
  })
  if (existing) {
    logger.info({ payloadHash }, 'Strava webhook event already processed — skipping')
    return
  }

  // Record event (schema: provider, eventType, athleteExternalId, payload, payloadHash, status)
  const webhookRecord = await db.webhookEvent.create({
    data: {
      provider: 'STRAVA',
      eventType: `${event.object_type}.${event.aspect_type}`,
      athleteExternalId: String(event.owner_id),
      payload: event as unknown as Record<string, unknown>,
      payloadHash,
      status: 'pending',
    },
  })

  try {
    // Find which NutriCoach user owns this Strava athlete
    const integration = await db.integration.findFirst({
      where: {
        provider: 'STRAVA',
        athleteExternalId: String(event.owner_id),
        status: 'ACTIVE',
      },
      select: { userId: true },
    })

    if (!integration) {
      logger.warn({ ownerId: event.owner_id }, 'Strava webhook: no matching active integration')
      await db.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { status: 'duplicate', processedAt: new Date() },
      })
      return
    }

    const { userId } = integration

    if (event.object_type === 'athlete' && event.aspect_type === 'update') {
      // Athlete deauthorized the app
      if (event.updates?.authorized === 'false') {
        await db.integration.updateMany({
          where: { userId, provider: 'STRAVA' },
          data: {
            status: 'REVOKED',
            accessToken: null,
            refreshToken: null,
            tokenExpiresAt: null,
          },
        })
        trackEvent({ userId, event: 'strava.disconnected' })
        logger.info({ userId }, 'Strava access revoked by athlete')
      }
    } else if (event.object_type === 'activity') {
      if (event.aspect_type === 'create' || event.aspect_type === 'update') {
        trackEvent({ userId, event: 'strava.webhook.received' })
        // Sync only the new/updated activity window (last 24h overlap)
        await runStravaSync(userId)
      } else if (event.aspect_type === 'delete') {
        // Remove the deleted activity from our DB
        await db.workout.deleteMany({
          where: { userId, externalId: String(event.object_id), source: 'STRAVA' as never },
        })
        logger.info({ userId, activityId: event.object_id }, 'Strava activity deleted')
      }
    }

    await db.webhookEvent.update({
      where: { id: webhookRecord.id },
      data: { status: 'processed', processedAt: new Date() },
    })
  } catch (err) {
    logger.error({ err, payloadHash }, 'Strava webhook processing failed')
    await db.webhookEvent.update({
      where: { id: webhookRecord.id },
      data: {
        status: 'failed',
        processedAt: new Date(),
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      },
    })
    throw err
  }
}
