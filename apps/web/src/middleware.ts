// NutriCoach — Auth middleware
// Route protection, onboarding redirect, safe redirects, security headers
//
// Public routes: /auth/*, /api/auth/*, /api/health
// Protected routes: everything else (redirects → /auth/login)
// Onboarding gate: authenticated but onboarding not done → /onboarding

import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { REQUEST_ID_HEADER } from '@/lib/correlation'

// ─── Route configuration ──────────────────────────────────────────────────────
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/verify-email-pending',
  '/auth/verify-success',
  '/auth/error',
]

const PUBLIC_API_ROUTES = [
  '/api/auth',
  '/api/health',
]

// Static informational pages — always accessible, never auto-redirect authenticated users away
const STATIC_ROUTES = [
  '/terms',
  '/privacy',
  '/health-disclaimer',
  '/offline',
]

const ONBOARDING_ROUTE = '/onboarding'

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  if (PUBLIC_API_ROUTES.some((p) => pathname.startsWith(p))) return true
  if (STATIC_ROUTES.includes(pathname)) return true
  if (pathname === '/') return true
  return false
}

function isStaticRoute(pathname: string): boolean {
  return STATIC_ROUTES.includes(pathname)
}

// ─── Security headers ─────────────────────────────────────────────────────────
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  // HSTS — production only
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    )
  }
  return response
}

// ─── Safe redirect ────────────────────────────────────────────────────────────
function safeRedirect(request: NextRequest, to: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = to
  // Preserve callbackUrl only for app routes (prevent open redirect)
  const response = NextResponse.redirect(url)
  return addSecurityHeaders(response)
}

// ─── Middleware ───────────────────────────────────────────────────────────────
export default auth((request) => {
  const { nextUrl, auth: session } = request as typeof request & { auth: Awaited<ReturnType<typeof auth>> }
  const { pathname } = nextUrl

  // Static assets — pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?)$/)
  ) {
    return NextResponse.next()
  }

  // DEV BYPASS — skip all auth checks locally when flag is set
  if (
    process.env.DEV_BYPASS_AUTH === 'true' &&
    process.env.NODE_ENV !== 'production'
  ) {
    const requestId = crypto.randomUUID()
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set(REQUEST_ID_HEADER, requestId)
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    response.headers.set(REQUEST_ID_HEADER, requestId)
    return addSecurityHeaders(response)
  }

  const isAuth = !!session?.user
  const isPublic = isPublicRoute(pathname)

  // ─── Not authenticated → redirect to login ────────────────────────────────
  if (!isAuth && !isPublic) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    // Attach callbackUrl so user lands back after login
    const callbackUrl = encodeURIComponent(pathname)
    loginUrl.search = `?callbackUrl=${callbackUrl}`
    const response = NextResponse.redirect(loginUrl)
    return addSecurityHeaders(response)
  }

  // ─── Authenticated + public route → redirect to dashboard or onboarding ───
  // Exception: static informational pages (/terms, /privacy, /health-disclaimer) are always passthrough
  if (isAuth && isPublic && pathname !== '/' && !isStaticRoute(pathname)) {
    const user = session!.user as { onboardingCompleted?: boolean }
    const target = user.onboardingCompleted ? '/dashboard' : ONBOARDING_ROUTE
    return safeRedirect(request, target)
  }

  // ─── Authenticated but onboarding not done ─────────────────────────────────
  if (isAuth) {
    const user = session!.user as { onboardingCompleted?: boolean }
    const isOnboardingRoute = pathname.startsWith(ONBOARDING_ROUTE)

    if (!user.onboardingCompleted && !isOnboardingRoute) {
      return safeRedirect(request, ONBOARDING_ROUTE)
    }

    // If onboarding done, prevent going back to /onboarding
    if (user.onboardingCompleted && isOnboardingRoute) {
      return safeRedirect(request, '/dashboard')
    }
  }

  // ─── Pass through + add security headers ─────────────────────────────────
  const requestId = crypto.randomUUID()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(REQUEST_ID_HEADER, requestId)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set(REQUEST_ID_HEADER, requestId)
  return addSecurityHeaders(response)
})

export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
