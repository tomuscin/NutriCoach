// Auth.js / NextAuth v5 — full configuration
// Strategy: JWT + Credentials + Prisma adapter
// Social OAuth (Google, Apple) → ETAP 6

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/db'
import { loginSchema } from '@/lib/validators/auth'
import { logAuthEvent } from '@/lib/auth-logger'
import type { AuthJWT, SessionUser } from '@/types/auth'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  // ─── JWT strategy (required for Credentials) ──────────────────────────────
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,   // refresh if >24h old
  },

  // ─── Secure cookies ───────────────────────────────────────────────────────
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  // ─── Pages ────────────────────────────────────────────────────────────────
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
    verifyRequest: '/auth/verify-email',
    newUser: '/onboarding',
  },

  // ─── Providers ────────────────────────────────────────────────────────────
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Hasło', type: 'password' },
      },
      authorize: async (credentials) => {
        // Validate shape
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        // Fetch user
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            status: true,
            image: true,
            emailVerified: true,
            profile: {
              select: { onboardingCompletedAt: true },
            },
          },
        })

        if (!user || !user.passwordHash) {
          logAuthEvent({ event: 'login.failed', email, meta: { reason: 'user_not_found' } })
          return null
        }

        // Check account status
        if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
          logAuthEvent({ event: 'login.failed', userId: user.id, email, meta: { reason: `status_${user.status}` } })
          return null
        }

        // Verify password
        const passwordValid = await compare(password, user.passwordHash)
        if (!passwordValid) {
          logAuthEvent({ event: 'login.failed', userId: user.id, email, meta: { reason: 'invalid_password' } })
          return null
        }

        // Warn if email not yet verified — hard blocked in loginAction before reaching here
        // This is a safety net in case authorize() is called directly
        if (!user.emailVerified) {
          logAuthEvent({ event: 'login.blocked_unverified', userId: user.id, email })
          return null
        }

        logAuthEvent({ event: 'login.success', userId: user.id, email })

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          role: user.role,
          status: user.status,
          image: user.image ?? null,
          emailVerified: !!user.emailVerified,
          onboardingCompleted: !!user.profile?.onboardingCompletedAt,
        }
      },
    }),
    // TODO ETAP 6: GoogleProvider, AppleProvider
  ],

  // ─── Callbacks ────────────────────────────────────────────────────────────
  callbacks: {
    // Enrich JWT with custom fields on first sign-in and on refresh
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        // First sign-in — populate from authorize() return
        const u = user as unknown as SessionUser & { onboardingCompleted: boolean }
        token.id = u.id
        token.role = u.role
        token.status = u.status
        token.onboardingCompleted = u.onboardingCompleted
      }

      // Session update (e.g. after onboarding completes)
      if (trigger === 'update' && session) {
        if ((session as { onboardingCompleted?: boolean }).onboardingCompleted !== undefined) {
          token.onboardingCompleted = (session as { onboardingCompleted?: boolean }).onboardingCompleted
        }
        // Belt-and-suspenders: re-read from DB in case the session payload
        // wasn't forwarded correctly by Auth.js v5 beta's update() mechanism.
        // This runs in Node.js runtime (API route), never in edge middleware.
        if (!token.onboardingCompleted && token.sub) {
          try {
            const profile = await prisma.userProfile.findUnique({
              where: { userId: token.sub },
              select: { onboardingCompletedAt: true },
            })
            if (profile?.onboardingCompletedAt) {
              token.onboardingCompleted = true
            }
          } catch {
            // Ignore DB errors — don't block auth
          }
        }
      }

      return token
    },

    // Expose custom fields to session.user
    session: ({ session, token }) => {
      return {
        ...session,
        user: {
          ...session.user,
          id: (token.sub ?? '') as string,
          role: token.role as SessionUser['role'],
          status: token.status as SessionUser['status'],
          onboardingCompleted: (token.onboardingCompleted as boolean) ?? false,
        },
      }
    },

    // Safe redirect — prevent open redirect attacks
    redirect: ({ url, baseUrl }) => {
      // Allow relative URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allow same origin
      if (new URL(url).origin === baseUrl) return url
      // Default: base URL
      return baseUrl
    },
  },

  // ─── Auth events ──────────────────────────────────────────────────────────
  events: {
    signIn: ({ user }) => {
      logAuthEvent({ event: 'session.created', userId: user.id ?? undefined, email: user.email ?? undefined })
    },
    signOut: () => {
      logAuthEvent({ event: 'logout' })
    },
    session: ({ session }) => {
      if (!session.user) {
        logAuthEvent({ event: 'session.invalid' })
      }
    },
  },

  debug: process.env.NODE_ENV === 'development',
})

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Get current user from session — returns null if not authenticated.
 * Use in Server Components and Route Handlers.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user) return null
  return session.user as SessionUser
}

/**
 * Require auth — throws redirect if not authenticated.
 * Use in Server Components for protected pages.
 */
export async function requireAuth(): Promise<SessionUser> {
  // DEV BYPASS — skip auth for local UI development
  if (
    process.env.DEV_BYPASS_AUTH === 'true' &&
    process.env.NODE_ENV !== 'production'
  ) {
    return {
      id: 'dev-user-bypass',
      email: 'dev@nutricoach.local',
      name: 'Dev User',
      role: 'USER' as SessionUser['role'],
      status: 'ACTIVE' as SessionUser['status'],
      onboardingCompleted: true,
      image: null,
    }
  }

  const user = await currentUser()
  if (!user) {
    const { redirect } = await import('next/navigation')
    redirect('/auth/login')
  }
  // TypeScript: after redirect (which throws) user is non-null here
  return user!
}

/**
 * Require onboarding to be completed.
 * Redirects to /onboarding if not done.
 * Exception: honours the __nc_onboarded short-lived cookie set by
 * completeOnboardingAction, which allows the dashboard to load before
 * the JWT session cookie is updated by useSession().update() on the client.
 */
export async function requireOnboarded(): Promise<SessionUser> {
  const user = await requireAuth()
  if (!user.onboardingCompleted) {
    // Check for the short-lived override cookie set by completeOnboardingAction
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const justCompleted = cookieStore.get('__nc_onboarded')?.value === '1'
    if (!justCompleted) {
      const { redirect } = await import('next/navigation')
      redirect('/onboarding')
    }
  }
  return user
}

/**
 * Check if current user has a specific role.
 */
export async function requireRole(role: SessionUser['role']): Promise<SessionUser> {
  const user = await requireAuth()
  if (user.role !== role) {
    const { redirect } = await import('next/navigation')
    redirect('/dashboard')
  }
  return user
}

