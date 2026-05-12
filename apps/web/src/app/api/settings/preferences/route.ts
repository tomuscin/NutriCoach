// PATCH /api/settings/preferences — update UserPreferences

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const prefsSchema = z.object({
  aiCoachingTone: z.enum(['supportive', 'balanced', 'direct']).optional(),
  aiVerbosity: z.enum(['brief', 'normal', 'detailed']).optional(),
  unitSystem: z.enum(['metric', 'imperial']).optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  insightSchedule: z.enum(['auto', 'morning', 'evening']).optional(),
  analyticsEnabled: z.boolean().optional(),
  crashReporting: z.boolean().optional(),
})

export async function PATCH(request: Request) {
  let user: Awaited<ReturnType<typeof requireAuth>>
  try {
    user = await requireAuth()
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = prefsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Nieprawidłowe dane' }, { status: 400 })
    }

    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...parsed.data },
      update: parsed.data,
    })

    logger.info({ userId: user.id }, 'settings.preferences.updated')
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error({ err }, 'settings.preferences.error')
    return NextResponse.json({ ok: false, error: 'Błąd serwera' }, { status: 500 })
  }
}
