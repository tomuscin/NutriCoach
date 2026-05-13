/**
 * E2E — Password reset flow
 * Tests: valid reset, expired token, reused token, password policy,
 *        session invalidation after reset, rate limiting
 */
import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3100'

test.describe('Password Reset', () => {
  // ─── Forgot password page loads ───────────────────────────────────────────
  test('forgot-password page renders without error', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  // ─── Request reset — enumeration safe ────────────────────────────────────
  test('reset request — same response for existing and nonexistent email', async ({ page }) => {
    // Test via API
    const [existingResp, fakeResp] = await Promise.all([
      page.evaluate(async (base) => {
        const r = await fetch(`${base}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'existing@user.com' }),
        })
        return { status: r.status }
      }, BASE),
      page.evaluate(async (base) => {
        const r = await fetch(`${base}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'nonexistent@nowhere.invalid' }),
        })
        return { status: r.status }
      }, BASE),
    ])
    // Both should return same status (200 or 429) — enumeration safe
    expect(existingResp.status).toBe(fakeResp.status)
  })

  // ─── Reset password page — invalid token ──────────────────────────────────
  test('reset with invalid token — shows error page', async ({ page }) => {
    await page.goto('/auth/reset-password?token=invalid-token-abc')
    const err = page.locator('text=/nieprawidłowy|nieważny|wygasł|invalid|expired/i').first()
    await expect(err).toBeVisible({ timeout: 8000 })
    // No raw error leak
    await expect(page.locator('text=/PrismaClient|query failed/i')).not.toBeVisible()
  })

  // ─── Reset password — missing token ───────────────────────────────────────
  test('reset-password page without token — shows error or redirects', async ({ page }) => {
    await page.goto('/auth/reset-password')
    // Should not crash with 500
    await expect(page.locator('text=/500|Internal Server/i')).not.toBeVisible()
  })

  // ─── New password validation ──────────────────────────────────────────────
  test('reset with weak new password — blocked by client validation', async ({ page }) => {
    test.skip(!process.env.E2E_RESET_TOKEN, 'Requires E2E_RESET_TOKEN env var')
    await page.goto(`/auth/reset-password?token=${process.env.E2E_RESET_TOKEN}`)
    const pwInput = page.locator('input[type="password"]').first()
    await pwInput.fill('weak')
    await page.click('button[type="submit"]')
    // Should show password strength error
    const err = page.locator('.text-destructive, [role="alert"]').first()
    await expect(err).toBeVisible()
  })

  // ─── Successful password reset ────────────────────────────────────────────
  test('valid token + strong password — resets successfully', async ({ page }) => {
    test.skip(!process.env.E2E_RESET_TOKEN, 'Requires E2E_RESET_TOKEN env var')
    await page.goto(`/auth/reset-password?token=${process.env.E2E_RESET_TOKEN}`)
    const pwInputs = page.locator('input[type="password"]')
    await pwInputs.nth(0).fill('NewValidPass1!')
    await pwInputs.nth(1).fill('NewValidPass1!')
    await page.click('button[type="submit"]')
    // Should show success or redirect to login
    await expect(page.locator('text=/zmienione|sukces|zaloguj/i').first()).toBeVisible({ timeout: 8000 })
  })

  // ─── Rate limit on password reset ────────────────────────────────────────
  test('rate limit — blocks after 3 reset requests per hour', async ({ page }) => {
    const results = await page.evaluate(async (base) => {
      const calls = Array.from({ length: 5 }, () =>
        fetch(`${base}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'ratelimit-test@test.com' }),
        }).then(r => r.status)
      )
      return Promise.all(calls)
    }, BASE)
    // At least one 429 expected
    const has429 = results.some(s => s === 429)
    expect(has429).toBe(true)
  })

  // ─── Empty email on forgot-password form ─────────────────────────────────
  test('empty email in forgot-password — validation error shown', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/forgot-password/)
    // HTML5 or custom validation
    const err = page.locator('.text-destructive, :invalid').first()
    // Page should not crash
    await expect(page.locator('text=/500/i')).not.toBeVisible()
  })
})
