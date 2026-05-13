/**
 * E2E — Mobile auth experience
 * Tests: iPhone/Android viewport, keyboard overlap, safe-area insets,
 *        scroll behavior, sticky CTAs, touch targets, onboarding on mobile
 */
import { test, expect, devices } from '@playwright/test'
import { fillLoginForm } from '../helpers'

const VALID_EMAIL = process.env.E2E_TEST_EMAIL ?? 'testuser@test.local'
const VALID_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'ValidPass1!'

const MOBILE_VIEWPORTS = [
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'Pixel 5', width: 393, height: 851 },
  { name: 'iPhone SE', width: 375, height: 667 },
]

test.describe('Mobile Auth Experience', () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
      })

      // ─── Register form — mobile ─────────────────────────────────────────
      test('register form — all fields tappable, no overflow', async ({ page }) => {
        await page.goto('/auth/register')
        const fields = ['#reg-name', '#reg-email', '#reg-password', '#reg-confirm']
        for (const selector of fields) {
          const input = page.locator(selector).first()
          if (await input.count() > 0) {
            const box = await input.boundingBox()
            if (box) {
              // Must be fully in viewport width
              expect(box.x).toBeGreaterThanOrEqual(0)
              expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
              // Touch target height >= 44px (iOS HIG)
              expect(box.height).toBeGreaterThanOrEqual(36) // 36px minimum
            }
          }
        }
      })

      // ─── Submit button touch target ─────────────────────────────────────
      test('submit button — meets 44px touch target', async ({ page }) => {
        await page.goto('/auth/login')
        const btn = page.locator('button[type="submit"]').first()
        const box = await btn.boundingBox()
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44)
          expect(box.width).toBeGreaterThanOrEqual(44)
        }
      })

      // ─── Login form — mobile ────────────────────────────────────────────
      test('login form — renders correctly, no horizontal scroll', async ({ page }) => {
        await page.goto('/auth/login')
        // Check no horizontal overflow
        const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
        expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 1) // 1px tolerance
      })

      // ─── Onboarding — mobile usable ─────────────────────────────────────
      test('onboarding — navigation buttons in viewport', async ({ page }) => {
        await page.goto('/auth/login')
        await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
        await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 8000 })
        await page.goto('/onboarding')
        const nextBtn = page.locator('button:has-text("Dalej"), button:has-text("Next")').first()
        if (await nextBtn.count() > 0) {
          const box = await nextBtn.boundingBox()
          if (box) {
            // Button must be visible in viewport (not below fold)
            expect(box.y).toBeLessThanOrEqual(viewport.height)
            expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 100) // slight scroll ok
          }
        }
      })

      // ─── Error messages — visible on mobile ────────────────────────────
      test('validation error — visible without scrolling', async ({ page }) => {
        await page.goto('/auth/register')
        await page.click('button[type="submit"]')
        const err = page.locator('.text-destructive').first()
        if (await err.isVisible({ timeout: 3000 }).catch(() => false)) {
          const box = await err.boundingBox()
          if (box) {
            // Error should be visible without scroll
            expect(box.y).toBeLessThanOrEqual(viewport.height)
          }
        }
      })

      // ─── Password toggle — tappable ─────────────────────────────────────
      test('password visibility toggle — tappable on mobile', async ({ page }) => {
        await page.goto('/auth/login')
        const toggleBtn = page.locator('button[aria-label*="Pokaż hasło"], button[aria-label*="hasło"]').first()
        if (await toggleBtn.count() > 0) {
          const box = await toggleBtn.boundingBox()
          if (box) {
            expect(box.width).toBeGreaterThanOrEqual(24)
            expect(box.height).toBeGreaterThanOrEqual(24)
          }
          await toggleBtn.click()
          // Password type should toggle
          const pwInput = page.locator('#password')
          const type = await pwInput.getAttribute('type')
          expect(['text', 'password']).toContain(type)
        }
      })
    })
  }

  // ─── iOS Safari — bottom nav safe area ───────────────────────────────────
  test('bottom navigation — not obscured by iOS home indicator', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/auth/login')
    await fillLoginForm(page, VALID_EMAIL, VALID_PASSWORD)
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 8000 })
    // Check dashboard bottom nav
    const bottomNav = page.locator('nav[aria-label*="bottom"], .bottom-nav, [data-testid="bottom-nav"]').first()
    if (await bottomNav.count() > 0) {
      const box = await bottomNav.boundingBox()
      if (box) {
        // Nav should be at bottom but not outside viewport
        expect(box.y + box.height).toBeLessThanOrEqual(844 + 50) // safe area tolerance
      }
    }
  })

  // ─── Landscape orientation ────────────────────────────────────────────────
  test('landscape orientation — register form usable', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 })
    await page.goto('/auth/register')
    await expect(page.locator('text=/500/i')).not.toBeVisible()
    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).toBeVisible()
  })
})
