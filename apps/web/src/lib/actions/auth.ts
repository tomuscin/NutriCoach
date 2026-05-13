'use server'

// Auth server actions — login, register, logout
// Called from Client Components (LoginForm, RegisterForm)

import { signIn, signOut } from '@/lib/auth'
import { registerUser } from '@/lib/services/register'
import { requestPasswordReset, resetPassword } from '@/lib/services/password-reset'
import { logAuthEvent } from '@/lib/auth-logger'
import { rateLimits } from '@/lib/rate-limit'
import { prisma } from '@/lib/db'
import { trackEvent } from '@/lib/analytics/events'
import { headers } from 'next/headers'
import type { AuthResult } from '@/types/auth'

// ─── Helper: get client IP (best-effort) ────────────────────────────────────
async function getClientIp(): Promise<string | undefined> {
  const h = await headers()
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    undefined
  )
}

// ─── Login action ─────────────────────────────────────────────────────────────
export async function loginAction(
  formData: FormData
): Promise<AuthResult> {
  const ip = await getClientIp()

  // Rate limit by IP
  if (ip) {
    const rl = rateLimits.login(ip)
    if (!rl.allowed) {
      logAuthEvent({ event: 'login.rate_limited', ip, meta: { retryAfterMs: rl.retryAfterMs } })
      return {
        ok: false,
        error: `Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za ${Math.ceil(rl.retryAfterMs / 60000)} min.`,
      }
    }
  }

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Hard block: unverified email must verify before logging in
  if (email) {
    const userCheck = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, emailVerified: true },
    })
    if (userCheck && !userCheck.emailVerified) {
      logAuthEvent({ event: 'login.blocked_unverified', email, ip })
      trackEvent({ event: 'login.blocked.unverified', ip })
      return {
        ok: false,
        error: 'Najpierw potwierdź adres email. Sprawdź skrzynkę i kliknij link aktywacyjny.',
        code: 'email_not_verified',
      }
    }
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    return { ok: true }
  } catch (err: unknown) {
    // Auth.js throws on failed credentials
    const message = err instanceof Error ? err.message : String(err)
    logAuthEvent({ event: 'login.failed', email, ip, meta: { error: message } })
    return { ok: false, error: 'Nieprawidłowy email lub hasło.' }
  }
}

// ─── Register action ──────────────────────────────────────────────────────────
export async function registerAction(
  formData: FormData
): Promise<AuthResult<{ userId: string }>> {
  const ip = await getClientIp()
  const h = await headers()
  const input = {
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    name: formData.get('name'),
    acceptTerms: formData.get('acceptTerms') === 'true',
  }
  return registerUser(input, { ip, userAgent: h.get('user-agent') ?? undefined })
}

// ─── Logout action ────────────────────────────────────────────────────────────
export async function logoutAction(): Promise<void> {
  logAuthEvent({ event: 'logout' })
  await signOut({ redirectTo: '/auth/login' })
}

// ─── Password reset actions ───────────────────────────────────────────────────
export async function forgotPasswordAction(
  formData: FormData
): Promise<AuthResult> {
  const ip = await getClientIp()
  const input = { email: formData.get('email') }
  return requestPasswordReset(input, { ip })
}

export async function resetPasswordAction(
  formData: FormData
): Promise<AuthResult> {
  const ip = await getClientIp()
  const input = {
    token: formData.get('token'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  }
  return resetPassword(input, { ip })
}
