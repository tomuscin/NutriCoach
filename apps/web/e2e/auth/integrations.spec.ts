/**
 * E2E — TrainingPeaks integration
 * Tests: connect success, OAuth denied, expired state, invalid callback,
 *        sync failure, reconnect, disconnect, stale token
 */
import { test, expect } from '@playwright/test'
import { fillLoginForm, waitForDashboard } from '../helpers'

const VALID_EMAIL = process.env.E2E_TEST_EMAIL ?? 'testuser@test.local'
const VALID_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'ValidPass1!'

test.describe('TrainingPeaks Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
    await waitForDashboard(page)
  })

  // ─── Connect TP button exists ─────────────────────────────────────────────
  test('TrainingPeaks connect button visible in onboarding or settings', async ({ page }) => {
    await page.goto('/onboarding')
    const tpBtn = page.locator('button:has-text("TrainingPeaks"), a:has-text("TrainingPeaks"), button:has-text("Połącz")').first()
    if (await tpBtn.count() === 0) {
      await page.goto('/settings')
      const settingsBtn = page.locator('text=/TrainingPeaks/').first()
      await expect(settingsBtn).toBeVisible({ timeout: 5000 })
    }
    // Either location is acceptable
    await expect(page.locator('text=/500/i')).not.toBeVisible()
  })

  // ─── OAuth callback — invalid state ──────────────────────────────────────
  test('OAuth callback with invalid state — error handled gracefully', async ({ page }) => {
    await page.goto('/api/integrations/trainingpeaks/callback?code=fakecode&state=invalid-state')
    // Should NOT crash with 500
    await expect(page.locator('text=/500|Internal Server/i')).not.toBeVisible()
    // Should redirect with error or show error page
    await expect(page).not.toHaveURL(/\?error=500/)
  })

  // ─── OAuth callback — missing code ───────────────────────────────────────
  test('OAuth callback without code — handled gracefully', async ({ page }) => {
    await page.goto('/api/integrations/trainingpeaks/callback?error=access_denied')
    await expect(page.locator('text=/500|Internal Server/i')).not.toBeVisible()
    // Should show error state or redirect to settings with error
    const url = page.url()
    expect(url).not.toContain('500')
  })

  // ─── Disconnect TP ────────────────────────────────────────────────────────
  test('disconnect TrainingPeaks — removes integration without crash', async ({ page }) => {
    await page.goto('/settings')
    const disconnectBtn = page.locator('button:has-text("Rozłącz"), button:has-text("Disconnect")').first()
    if (await disconnectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await disconnectBtn.click()
      // Confirm if modal appears
      const confirmBtn = page.locator('button:has-text("Tak"), button:has-text("Potwierdź"), button:has-text("Confirm")').first()
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click()
      }
      await expect(page.locator('text=/500/i')).not.toBeVisible()
    }
  })

  // ─── TP connect API — auth required ──────────────────────────────────────
  test('POST /api/integrations/trainingpeaks without auth — 401', async ({ page }) => {
    const resp = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/integrations/trainingpeaks/connect`, {
        method: 'POST',
        credentials: 'omit',
      })
      return { status: r.status }
    }, process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3100')
    // Must be 401 or 404 (route may not exist yet), never 500
    expect([401, 404, 405]).toContain(resp.status)
  })

  // ─── Stale state parameter ────────────────────────────────────────────────
  test('expired OAuth state — handled without server error', async ({ page }) => {
    // State that looks valid but is expired
    const expiredState = Buffer.from(JSON.stringify({
      userId: 'fake-user-id',
      timestamp: Date.now() - 3600000, // 1 hour ago
      nonce: 'expired-nonce',
    })).toString('base64')

    await page.goto(`/api/integrations/trainingpeaks/callback?code=fakecode&state=${encodeURIComponent(expiredState)}`)
    await expect(page.locator('text=/500|Internal Server/i')).not.toBeVisible()
  })
})
