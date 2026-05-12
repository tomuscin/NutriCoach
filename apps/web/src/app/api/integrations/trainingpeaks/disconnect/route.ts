// POST /api/integrations/trainingpeaks/disconnect
// Revokes the integration — marks as DISCONNECTED, clears tokens.
// Tokens are cleared immediately; workout data is retained.

import { requireAuth } from '@/lib/auth'
import { prisma as db } from '@/lib/db'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST() {
  const user = await requireAuth()

  const integration = await db.integration.findUnique({
    where: { userId_provider: { userId: user.id, provider: 'TRAININGPEAKS' } },
    select: { id: true, status: true },
  })

  if (!integration) {
    return Response.json({ ok: false, error: 'Not connected' }, { status: 404 })
  }

  await db.integration.update({
    where: { id: integration.id },
    data: {
      status: 'DISCONNECTED',
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      nextSyncAt: null,
    },
  })

  logger.info({ userId: user.id, provider: 'TRAININGPEAKS' }, 'Integration disconnected')

  return Response.json({ ok: true })
}
