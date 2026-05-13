'use server'

// Onboarding server actions

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { completeOnboarding } from '@/lib/services/onboarding'
import { redirect } from 'next/navigation'
import { trackEvent } from '@/lib/analytics/events'
import type { AuthResult } from '@/types/auth'
import type { Gender, ActivityLevel, SportType } from '@prisma/client'

// ─── Track step progress ──────────────────────────────────────────────────────
export async function updateOnboardingStepAction(step: number): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return
  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingStep: step },
  }).catch(() => {})
  trackEvent({ userId: session.user.id, event: 'onboarding.step_completed', properties: { step } })
}

// ─── Complete onboarding action ───────────────────────────────────────────────
export async function completeOnboardingAction(
  formData: FormData
): Promise<AuthResult> {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const userId = session!.user.id

  // Parse form fields — only accept known enum values, fallback to defaults
  const rawSex = formData.get('sex') as string | null
  const sex: Gender = (rawSex === 'MALE' || rawSex === 'FEMALE') ? rawSex : 'MALE'

  const rawBirthDate = formData.get('birthDate') as string | null
  const birthDate = rawBirthDate ? new Date(rawBirthDate) : new Date('1990-01-01')

  const heightCm = Number(formData.get('heightCm') ?? 0) || 170
  const currentWeightKg = Number(formData.get('currentWeightKg') ?? 0) || 70
  const targetWeightKg = formData.get('targetWeightKg') ? Number(formData.get('targetWeightKg')) : undefined

  const rawActivity = formData.get('activityLevel') as string | null
  const validActivityLevels: ActivityLevel[] = ['SEDENTARY', 'LIGHT', 'MODERATE', 'VERY_ACTIVE', 'EXTRA_ACTIVE']
  const activityLevel: ActivityLevel = (validActivityLevels as string[]).includes(rawActivity ?? '')
    ? (rawActivity as ActivityLevel)
    : 'MODERATE'

  const rawSport = formData.get('mainSport') as string | null
  const validSports: SportType[] = ['CYCLING', 'RUNNING', 'SWIMMING', 'TRIATHLON', 'DUATHLON', 'STRENGTH', 'MTB', 'GRAVEL', 'ROWING', 'SKIING', 'OTHER']
  const mainSport: SportType = (validSports as string[]).includes(rawSport ?? '')
    ? (rawSport as SportType)
    : 'CYCLING'

  // Upsert profile (required fields always present — defaults used if user skipped)
  await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      sex,
      birthDate,
      heightCm,
      currentWeightKg,
      targetWeightKg,
      activityLevel,
      mainSport,
      onboardingCompletedAt: new Date(),
    },
    update: {
      sex,
      birthDate,
      heightCm,
      currentWeightKg,
      ...(targetWeightKg !== undefined ? { targetWeightKg } : {}),
      activityLevel,
      mainSport,
      onboardingCompletedAt: new Date(),
    },
  })

  await completeOnboarding(userId)
  await prisma.user.update({ where: { id: userId }, data: { onboardingStep: 8 } }).catch(() => {})
  trackEvent({ userId, event: 'onboarding.completed' })

  // Do NOT call redirect() here — the JWT must be updated client-side first
  // (via useSession().update()) so the middleware allows /dashboard access.
  return { ok: true }
}
