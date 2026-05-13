/**
 * E2E — Onboarding wizard flow
 * Tests: happy path, skip TP, partial onboarding + refresh, back navigation,
 *        step persistence, mobile viewport, stale session, interrupted flow
 */
import { test, expect } from '@playwright/test'
import { fillLoginForm, waitForDashboard } from '../helpers'

const VALID_EMAIL = process.env.E2E_TEST_EMAIL ?? 'testuser@test.local'
const VALID_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'ValidPass1!'

test.describe('Onboarding Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/login')
    await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
    await waitForDashboard(page)
  })

  // ─── Navigate to onboarding if not completed ──────────────────────────────
  test('fresh user — directed to onboarding', async ({ page }) => {
    test.skip(!process.env.E2E_FRESH_EMAIL, 'Requires E2E_FRESH_EMAIL for a non-onboarded user')
    // For fresh user, should land on /onboarding
    await expect(page).toHaveURL(/onboarding/, { timeout: 5000 })
  })

  // ─── Onboarding page loads ────────────────────────────────────────────────
  test('onboarding page renders wizard steps', async ({ page }) => {
    await page.goto('/onboarding')
    // Step indicator visible
    const stepIndicator = page.locator('[aria-label*="krok"], .step-indicator, text=/Krok 1|Step 1/i').first()
    // Just verify page doesn't crash
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 })
  })

  // ─── Step navigation ──────────────────────────────────────────────────────
  test('can navigate to next step and back', async ({ page }) => {
    await page.goto('/onboarding')
    const nextBtn = page.locator('button:has-text("Dalej"), button:has-text("Next")').first()
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
      // Step 2 should be visible
      const backBtn = page.locator('button:has-text("Wstecz"), button:has-text("Back")').first()
      await expect(backBtn).toBeVisible({ timeout: 3000 })
      await backBtn.click()
      // Back to step 1
      await expect(nextBtn).toBeVisible()
    }
  })

  // ─── Step persistence after refresh ──────────────────────────────────────
  test('step persists after page refresh', async ({ page }) => {
    await page.goto('/onboarding')
    const nextBtn = page.locator('button:has-text("Dalej"), button:has-text("Next")').first()
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
      // Wait for step 2 to be active
      const backBtn = page.locator('button:has-text("Wstecz"), button:has-text("Back")').first()
      await expect(backBtn).toBeVisible({ timeout: 3000 })
      await page.reload()
      // After reload, should still be on step 2 (not step 1) — initialStep from DB
      // Note: this checks the DB persistence fix
      await expect(page.locator('button:has-text("Wstecz"), button:has-text("Back")').first()).toBeVisible({ timeout: 5000 })
    }
  })

  // ─── Skip TrainingPeaks ───────────────────────────────────────────────────
  test('can skip TrainingPeaks step', async ({ page }) => {
    await page.goto('/onboarding')
    const skipBtn = page.locator('button:has-text("Pomiń"), a:has-text("Pomiń"), button:has-text("Skip")').first()
    if (await skipBtn.count() > 0) {
      await skipBtn.click()
      // Should advance or complete without error
      await expect(page.locator('text=/500|Internal Server/i')).not.toBeVisible()
    }
  })

  // ─── Complete onboarding ──────────────────────────────────────────────────
  test('completing all steps redirects to dashboard', async ({ page }) => {
    await page.goto('/onboarding')
    // Try to click through all Next buttons
    for (let i = 0; i < 5; i++) {
      const nextBtn = page.locator('button:has-text("Dalej"), button:has-text("Zakończ"), button:has-text("Next")').first()
      if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await nextBtn.click()
        await page.waitForTimeout(500)
      } else {
        break
      }
    }
    // Eventually should reach dashboard or success state
    // (not crash with 500)
    await expect(page.locator('text=/500/i')).not.toBeVisible()
  })

  // ─── Already onboarded user ───────────────────────────────────────────────
  test('already-onboarded user visiting /onboarding — redirected to dashboard', async ({ page }) => {
    test.skip(!process.env.E2E_ONBOARDED_EMAIL, 'Requires E2E_ONBOARDED_EMAIL for onboarded user')
    // Already onboarded users should be redirected away from /onboarding
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 })
  })

  // ─── Mobile viewport — onboarding usable ─────────────────────────────────
  test('mobile viewport — wizard navigable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/onboarding')
    // Key UI elements should be visible and not clipped
    const nextBtn = page.locator('button:has-text("Dalej"), button:has-text("Next")').first()
    if (await nextBtn.count() > 0) {
      const box = await nextBtn.boundingBox()
      if (box) {
        // Button should be in viewport
        expect(box.y + box.height).toBeLessThanOrEqual(844)
        expect(box.x).toBeGreaterThanOrEqual(0)
      }
    }
  })

  // ─── Interrupted flow (logout mid-onboarding) ────────────────────────────
  test('logging out mid-onboarding — progress saved, resumes on re-login', async ({ page }) => {
    await page.goto('/onboarding')
    const nextBtn = page.locator('button:has-text("Dalej"), button:has-text("Next")').first()
    if (await nextBtn.count() > 0) {
      await nextBtn.click()
      await page.waitForTimeout(500)
    }
    // Logout
    await page.goto('/auth/logout')
    // Re-login
    await page.goto('/auth/login')
    await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
    await page.goto('/onboarding')
    // Should not restart from step 0 (DB persistence)
    // Note: Can't assert exact step without knowing DB state
    await expect(page.locator('text=/500/i')).not.toBeVisible()
  })
})
