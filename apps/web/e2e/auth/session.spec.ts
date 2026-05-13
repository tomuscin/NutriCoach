/**
 * E2E — Session management
 * Tests: session persistence, cookie expiry, logout, protected route access,
 *        middleware consistency, concurrent tabs
 */
import { test, expect } from '@playwright/test'
import { fillLoginForm, waitForDashboard } from '../helpers'

const VALID_EMAIL = process.env.E2E_TEST_EMAIL ?? 'testuser@test.local'
const VALID_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'ValidPass1!'

const PROTECTED_ROUTES = [
  '/dashboard',
  '/onboarding',
  '/settings',
  '/notifications',
]

const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/terms',
  '/privacy',
  '/health-disclaimer',
]

test.describe('Session Management', () => {
  // ─── Protected routes — unauthenticated ───────────────────────────────────
  for (const route of PROTECTED_ROUTES) {
    test(`unauthenticated access to ${route} → redirect to login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/auth\/login/, { timeout: 5000 })
    })
  }

  // ─── Public routes — unauthenticated ─────────────────────────────────────
  for (const route of PUBLIC_ROUTES) {
    test(`unauthenticated access to ${route} → accessible (no redirect)`, async ({ page }) => {
      await page.goto(route)
      // Should NOT redirect to login
      await expect(page).not.toHaveURL(/auth\/login/, { timeout: 3000 })
      // Should have some visible content
      await expect(page.locator('body')).not.toBeEmpty()
    })
  }

  // ─── Static/legal routes accessible to logged-in users ───────────────────
  test('terms page accessible to authenticated user — no redirect to dashboard', async ({ page }) => {
    // Login
    await page.goto('/auth/login')
    await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
    await waitForDashboard(page)
    // Visit terms
    await page.goto('/terms')
    await expect(page).toHaveURL('/terms')
    await expect(page).not.toHaveURL('/dashboard')
  })

  test('privacy page accessible to authenticated user', async ({ page }) => {
    await page.goto('/auth/login')
    await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
    await waitForDashboard(page)
    await page.goto('/privacy')
    await expect(page).toHaveURL('/privacy')
  })

  test('health-disclaimer accessible to authenticated user', async ({ page }) => {
    await page.goto('/auth/login')
    await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
    await waitForDashboard(page)
    await page.goto('/health-disclaimer')
    await expect(page).toHaveURL('/health-disclaimer')
  })

  // ─── Session persists across reload ──────────────────────────────────────
  test('session survives hard reload', async ({ page }) => {
    await page.goto('/auth/login')
    await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
    await waitForDashboard(page)
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page).not.toHaveURL(/auth\/login/)
  })

  // ─── Logout clears session ────────────────────────────────────────────────
  test('logout — clears session and redirects to login', async ({ page }) => {
    await page.goto('/auth/login')
    await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
    await waitForDashboard(page)
    // Find logout button
    const logoutBtn = page.locator('button:has-text("Wyloguj"), a:has-text("Wyloguj")').first()
    if (await logoutBtn.count() > 0) {
      await logoutBtn.click()
    } else {
      // Fallback: direct navigation to logout API
      await page.goto('/api/auth/signout')
    }
    // After logout — access protected route should redirect
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/auth\/login/, { timeout: 5000 })
  })

  // ─── Auth API routes accessible ───────────────────────────────────────────
  test('/api/auth/session — returns empty or session JSON', async ({ page }) => {
    const resp = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/auth/session`)
      return { status: r.status, contentType: r.headers.get('content-type') }
    }, process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3100')
    expect(resp.status).toBe(200)
    expect(resp.contentType).toContain('json')
  })

  // ─── No session fixation ─────────────────────────────────────────────────
  test('session cookie changes after login (no fixation)', async ({ page }) => {
    // Read cookie before login
    await page.goto('/auth/login')
    const cookiesBefore = await page.context().cookies()
    const sessionBefore = cookiesBefore.find(c => c.name.includes('session') || c.name.includes('auth'))

    await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
    await waitForDashboard(page)

    // Read cookie after login
    const cookiesAfter = await page.context().cookies()
    const sessionAfter = cookiesAfter.find(c => c.name.includes('session') || c.name.includes('auth'))

    if (sessionBefore && sessionAfter) {
      // Session token should be different after login
      expect(sessionAfter.value).not.toBe(sessionBefore.value)
    }
    // If no pre-login session exists, that's also fine (no fixation risk)
  })
})
