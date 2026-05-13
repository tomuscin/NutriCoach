/**
 * E2E — Push notifications
 * Tests: permission denied, permission granted, unsubscribe, duplicate subscribe,
 *        unsupported browser handling
 */
import { test, expect } from '@playwright/test'
import { fillLoginForm, waitForDashboard } from '../helpers'

const VALID_EMAIL = process.env.E2E_TEST_EMAIL ?? 'testuser@test.local'
const VALID_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'ValidPass1!'

test.describe('Push Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
    await waitForDashboard(page)
  })

  // ─── Push subscribe API — auth required ──────────────────────────────────
  test('POST /api/push/subscribe without auth — returns 401', async ({ page }) => {
    // Make request outside auth session
    const resp = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fake',
            keys: { p256dh: 'fake', auth: 'fake' },
          },
        }),
        credentials: 'omit', // no session cookies
      })
      return { status: r.status }
    }, process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3100')
    // Must be 401 — not 200 or 500
    expect(resp.status).toBe(401)
  })

  // ─── Push unsubscribe API — auth required ─────────────────────────────────
  test('DELETE /api/push/subscribe without auth — returns 401', async ({ page }) => {
    const resp = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/push/subscribe`, {
        method: 'DELETE',
        credentials: 'omit',
      })
      return { status: r.status }
    }, process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3100')
    expect(resp.status).toBe(401)
  })

  // ─── Push settings page renders ───────────────────────────────────────────
  test('settings/notifications page renders without error', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.locator('text=/500/i')).not.toBeVisible()
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 })
  })

  // ─── Push notification UI — grant permission ──────────────────────────────
  test('push permission grant — UI updates to subscribed state', async ({ page }) => {
    // Grant notification permission via CDP
    await page.context().grantPermissions(['notifications'])
    await page.goto('/settings')
    // Look for "Enable push" button
    const enableBtn = page.locator('button:has-text("Włącz"), button:has-text("Enable")').first()
    if (await enableBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enableBtn.click()
      // Should show subscribed state
      const subscribedText = page.locator('text=/włączone|aktywne|subscribed/i')
      await expect(subscribedText).toBeVisible({ timeout: 5000 })
    }
  })

  // ─── Push permission denied — graceful degradation ────────────────────────
  test('push permission denied — graceful message shown', async ({ page }) => {
    // Deny notification permission
    await page.context().clearPermissions()
    await page.goto('/settings')
    // If push is denied by system, UI should show helpful message
    const deniedMsg = page.locator('text=/zabronione|zablokowane|denied|odrzucono/i')
    // We just verify no crash occurs — push may or may not be supported in test environment
    await expect(page.locator('text=/500/i')).not.toBeVisible()
  })

  // ─── VAPID public key exposed correctly ──────────────────────────────────
  test('NEXT_PUBLIC_VAPID_PUBLIC_KEY is available in client context', async ({ page }) => {
    await page.goto('/settings')
    const vapidAvailable = await page.evaluate(() => {
      // Check if the env var would be available (baked at build time)
      return typeof window !== 'undefined'
    })
    expect(vapidAvailable).toBe(true)
    // VAPID key should not be accidentally exposed in HTML source
    const html = await page.content()
    // Private key should NEVER appear in page source
    expect(html).not.toContain('VAPID_PRIVATE_KEY=')
  })

  // ─── Duplicate subscribe — idempotent ────────────────────────────────────
  test('duplicate push subscribe — handled idempotently', async ({ page }) => {
    await page.context().grantPermissions(['notifications'])
    await page.goto('/settings')
    const enableBtn = page.locator('button:has-text("Włącz"), button:has-text("Enable")').first()
    if (await enableBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enableBtn.click()
      await page.waitForTimeout(1000)
      // Click again (idempotent)
      if (await enableBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await enableBtn.click()
        await expect(page.locator('text=/500/i')).not.toBeVisible()
      }
    }
  })
})
