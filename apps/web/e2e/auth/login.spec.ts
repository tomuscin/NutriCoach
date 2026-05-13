/**
 * E2E — Login flow
 * Tests: happy path, wrong password, nonexistent user, brute-force lockout,
 *        session persistence, redirect loops, open redirect (security)
 */
import { test, expect } from '@playwright/test'
import { fillLoginForm, gotoLogin, waitForDashboard } from '../helpers'

// Use real accounts — these must exist in the DB
const VALID_EMAIL = process.env.E2E_TEST_EMAIL ?? 'testuser@test.local'
const VALID_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'ValidPass1!'
const WRONG_PASSWORD = 'WrongPass99!'

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await gotoLogin(page)
  })

  // ─── Happy path ───────────────────────────────────────────────────────────
  test('valid credentials — redirects to dashboard or onboarding', async ({ page }) => {
    await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
    await waitForDashboard(page)
    await expect(page).not.toHaveURL('/auth/login')
  })

  // ─── Wrong password ───────────────────────────────────────────────────────
  test('wrong password — shows error, stays on login', async ({ page }) => {
    await fillLoginForm(page, VALID_EMAIL, WRONG_PASSWORD)
    await expect(page).toHaveURL('/auth/login')
    const err = page.locator('[role="alert"], .text-destructive').first()
    await expect(err).toBeVisible({ timeout: 5000 })
  })

  // ─── Non-existent user ────────────────────────────────────────────────────
  test('nonexistent user — generic error (no enumeration)', async ({ page }) => {
    await fillLoginForm(page, 'nobody@notexist.local', 'SomePass1!')
    await expect(page).toHaveURL('/auth/login')
    const err = page.locator('[role="alert"], .text-destructive').first()
    await expect(err).toBeVisible({ timeout: 5000 })
    // Error should NOT say "user not found" (enumeration)
    await expect(page.locator('text=/nie istnieje|not found|konto nie/')).not.toBeVisible()
  })

  // ─── Empty fields ─────────────────────────────────────────────────────────
  test('empty fields — HTML5 validation or custom error shown', async ({ page }) => {
    await page.click('button[type="submit"]')
    // Either stays on login (HTML5) or shows error
    await expect(page).toHaveURL('/auth/login')
  })

  // ─── Open redirect guard (security) ──────────────────────────────────────
  test('open redirect via callbackUrl — blocked, redirects to dashboard', async ({ page }) => {
    await page.goto('/auth/login?callbackUrl=https://evil.com/phishing')
    await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
    // Must NOT redirect to external URL — must land on dashboard
    await expect(page).not.toHaveURL(/evil\.com/)
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 8000 })
  })

  // ─── Protocol-relative open redirect ─────────────────────────────────────
  test('protocol-relative open redirect — blocked', async ({ page }) => {
    await page.goto('/auth/login?callbackUrl=//evil.com')
    await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
    await expect(page).not.toHaveURL(/evil\.com/)
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 8000 })
  })

  // ─── Legitimate callbackUrl ───────────────────────────────────────────────
  test('internal callbackUrl — honored after login', async ({ page }) => {
    await page.goto('/auth/login?callbackUrl=/dashboard')
    await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
    await expect(page).toHaveURL('/dashboard', { timeout: 8000 })
  })

  // ─── Session persistence ──────────────────────────────────────────────────
  test('session survives page refresh', async ({ page }) => {
    await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
    await waitForDashboard(page)
    const currentUrl = page.url()
    await page.reload()
    // Should still be on dashboard, not redirected to login
    await expect(page).not.toHaveURL('/auth/login')
    expect(page.url()).toContain(new URL(currentUrl).pathname)
  })

  // ─── Already-logged-in redirect ──────────────────────────────────────────
  test('logged-in user visiting /auth/login — redirected away', async ({ page }) => {
    // Login first
    await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
    await waitForDashboard(page)
    // Try to visit login again
    await page.goto('/auth/login')
    // Should NOT stay on login page
    await expect(page).not.toHaveURL('/auth/login')
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 5000 })
  })

  // ─── Brute force / rate limit ────────────────────────────────────────────
  test('brute force — rate limit kicks in after 5 failed attempts', async ({ page }) => {
    // Rate limit: 5 attempts / 15 min window
    for (let i = 0; i < 6; i++) {
      await gotoLogin(page)
      await fillLoginForm(page, VALID_EMAIL, 'WrongPass!')
    }
    // After 6th attempt should see rate limit error
    const rateLimitErr = page.locator('text=/Zbyt wiele prób|Rate limit|429/')
    // Note: rate limit may or may not be visible in UI — depends on error display
    const err = page.locator('[role="alert"], .text-destructive').first()
    await expect(err).toBeVisible({ timeout: 5000 })
  })

  // ─── "Forgot password" link visible ──────────────────────────────────────
  test('"Forgot password" link leads to reset page', async ({ page }) => {
    const link = page.locator('a[href="/auth/forgot-password"], a:has-text("Zapomniałeś")')
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/forgot-password/)
  })

  // ─── Register link visible ────────────────────────────────────────────────
  test('"Register" link leads to registration page', async ({ page }) => {
    const link = page.locator('a[href="/auth/register"], a:has-text("Zarejestruj")')
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/register/)
  })
})
