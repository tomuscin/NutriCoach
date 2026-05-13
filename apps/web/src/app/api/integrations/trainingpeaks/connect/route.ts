// GET /api/integrations/trainingpeaks/connect
// Initiates OAuth flow: creates CSRF state, redirects to TP authorization page.

import { redirect } from 'next/navigation'
import { randomBytes } from 'crypto'
import { requireAuth } from '@/lib/auth'
import { prisma as db } from '@/lib/db'
import { trainingPeaksProvider } from '@/lib/integrations/providers/trainingpeaks/provider'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireAuth()

    // Guard: TrainingPeaks OAuth not configured
    if (!process.env.TRAININGPEAKS_CLIENT_ID || !process.env.TRAININGPEAKS_CLIENT_SECRET) {
      const url = new URL('/settings', process.env.NEXTAUTH_URL ?? 'http://localhost:3100')
      url.searchParams.set('error', 'trainingpeaks_not_configured')
      return NextResponse.redirect(url)
    }

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
  } catch (err) {
    // redirect() throws an object with a 'digest' containing NEXT_REDIRECT — let it propagate
    if (err != null && typeof err === 'object' && 'digest' in err && String((err as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')) throw err
    const url = new URL('/settings', process.env.NEXTAUTH_URL ?? 'http://localhost:3100')
    url.searchParams.set('error', 'trainingpeaks_connect_failed')
    return NextResponse.redirect(url)
  }
}
