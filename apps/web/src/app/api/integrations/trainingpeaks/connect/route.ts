// GET /api/integrations/trainingpeaks/connect
// Initiates OAuth flow: creates CSRF state, redirects to TP authorization page.

import { redirect } from 'next/navigation'
import { randomBytes } from 'crypto'
import { requireAuth } from '@/lib/auth'
import { prisma as db } from '@/lib/db'
import { trainingPeaksProvider } from '@/lib/integrations/providers/trainingpeaks/provider'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireAuth()

  // Generate CSRF state token
  const state = randomBytes(32).toString('hex')

  // Persist state with 10-minute TTL
  await db.oAuthState.create({
    data: {
      userId: user.id,
      state,
      provider: 'TRAININGPEAKS',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  })

  // Upsert integration record as PENDING
  await db.integration.upsert({
    where: { userId_provider: { userId: user.id, provider: 'TRAININGPEAKS' } },
    create: {
      userId: user.id,
      provider: 'TRAININGPEAKS',
      status: 'PENDING',
    },
    update: {
      status: 'PENDING',
      errorMessage: null,
    },
  })

  const authUrl = trainingPeaksProvider.buildAuthUrl(state)
  redirect(authUrl)
}
