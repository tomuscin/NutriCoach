// POST /api/webhooks/trainingpeaks
// Ingests inbound webhooks from TrainingPeaks.
// Validates HMAC-SHA256 signature, stores event, triggers partial sync.

import type { NextRequest } from 'next/server'
import { prisma as db } from '@/lib/db'
import { trainingPeaksProvider } from '@/lib/integrations/providers/trainingpeaks/provider'
import { runTrainingPeaksSync } from '@/lib/integrations/sync/training-sync'
import { emitEvent } from '@/lib/events/bus'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-trainingpeaks-signature') ?? ''
  const webhookSecret = process.env.TRAININGPEAKS_WEBHOOK_SECRET ?? ''

  // ── Signature validation ────────────────────────────────────────────────────
  if (webhookSecret && signature) {
    const valid = trainingPeaksProvider.validateWebhookSignature(rawBody, signature, webhookSecret)
    if (!valid) {
      logger.warn({ signature }, 'TP webhook: invalid signature')
      return Response.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const athleteId = String(payload.athlete_id ?? payload.AthleteId ?? '')
  const eventType = String(payload.event ?? payload.EventType ?? 'unknown')

  // ── Persist webhook event ───────────────────────────────────────────────────
  const webhookEvent = await db.webhookEvent.create({
    data: {
      provider: 'TRAININGPEAKS',
      eventType,
      athleteExternalId: athleteId || null,
      payload: payload as never,
      signature: signature || null,
      status: 'pending',
    },
  })

  logger.info({ eventType, athleteId }, 'TP webhook received')
  await emitEvent('webhook_received', { provider: 'TRAININGPEAKS', eventType, athleteId })

  // ── Respond immediately (< 5s) then process async ──────────────────────────
  // Look up user by athlete external ID
  const integration = athleteId
    ? await db.integration.findFirst({
        where: { provider: 'TRAININGPEAKS', athleteExternalId: athleteId, status: 'ACTIVE' },
        select: { userId: true },
      })
    : null

  if (integration) {
    // Non-blocking partial sync
    runTrainingPeaksSync(integration.userId)
      .then(async () => {
        await db.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: { status: 'processed', processedAt: new Date() },
        })
      })
      .catch(async err => {
        Sentry.captureException(err)
        await db.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            status: 'failed',
            errorMessage: err instanceof Error ? err.message : 'sync failed',
            retryCount: { increment: 1 },
          },
        })
      })
  } else {
    // Unknown athlete — mark processed (we can't act on it)
    await db.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: 'processed', processedAt: new Date() },
    })
  }

  return Response.json({ ok: true, id: webhookEvent.id })
}
