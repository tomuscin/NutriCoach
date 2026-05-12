// GET /api/integrations/status — returns all integration statuses for current user

import { requireAuth } from '@/lib/auth'
import { prisma as db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireAuth()

  const integrations = await db.integration.findMany({
    where: { userId: user.id },
    select: {
      provider: true,
      status: true,
      lastSyncAt: true,
      nextSyncAt: true,
      errorMessage: true,
      errorCount: true,
      scope: true,
      athleteExternalId: true,
      createdAt: true,
      syncLogs: {
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: {
          status: true,
          recordsCreated: true,
          recordsUpdated: true,
          startedAt: true,
          finishedAt: true,
        },
      },
    },
  })

  return Response.json({
    integrations: integrations.map(i => ({
      ...i,
      // Never expose tokens
      lastSync: i.syncLogs[0] ?? null,
      syncLogs: undefined,
    })),
  })
}
