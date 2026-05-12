// Onboarding state management (server-side)
// Tracks step, persists to DB, marks completion

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAuthEvent } from '@/lib/auth-logger'
import type { OnboardingStep } from '@/types/auth'

// Step order for linear onboarding
const ONBOARDING_STEPS: OnboardingStep[] = ['profile', 'goals', 'activity', 'sport', 'complete']

export function getNextStep(current: OnboardingStep): OnboardingStep {
  const idx = ONBOARDING_STEPS.indexOf(current)
  return ONBOARDING_STEPS[Math.min(idx + 1, ONBOARDING_STEPS.length - 1)] ?? 'complete'
}

export function isOnboardingComplete(step: OnboardingStep): boolean {
  return step === 'complete'
}

// ─── Get onboarding state for current user ────────────────────────────────────
export async function getOnboardingState(): Promise<{
  step: OnboardingStep
  completed: boolean
} | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { onboardingCompletedAt: true },
  })

  if (!profile) return { step: 'profile', completed: false }
  if (profile.onboardingCompletedAt) return { step: 'complete', completed: true }
  return { step: 'profile', completed: false }
}

// ─── Mark onboarding complete ────────────────────────────────────────────────
export async function completeOnboarding(userId: string): Promise<void> {
  // Profile upsert happens in the onboarding action BEFORE this call.
  // Here we just ensure the flag is set (idempotent).
  await prisma.userProfile.updateMany({
    where: { userId },
    data: { onboardingCompletedAt: new Date() },
  })

  logAuthEvent({ event: 'session.created', userId, meta: { milestone: 'onboarding_completed' } })
}
