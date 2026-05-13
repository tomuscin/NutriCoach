import { test, expect } from '@playwright/test'

// Dark mode E2E tests
// Covers: persistence, system preference, manual switching, SSR hydration, mobile

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3100'

test.describe('Theme system', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto(BASE + '/auth/login')
    await page.evaluate(() => localStorage.removeItem('nutricoach-theme'))
  })

  // ── 1. Default: system mode ──────────────────────────────────────────────
  test('defaults to system theme (no localStorage)', async ({ page }) => {
    await page.goto(BASE + '/auth/login')
    const lsValue = await page.evaluate(() => localStorage.getItem('nutricoach-theme'))
    // next-themes doesn't set localStorage for "system" by default until user picks
    expect(['system', null]).toContain(lsValue)
  })

  // ── 2. Dark mode via localStorage ────────────────────────────────────────
  test('applies dark mode from localStorage before hydration (no flash)', async ({ page }) => {
    // Set dark before navigating
    await page.addInitScript(() => {
      localStorage.setItem('nutricoach-theme', 'dark')
    })
    await page.goto(BASE + '/auth/login')
    // Immediately check — should not flash
    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')
  })

  // ── 3. Light mode from localStorage ──────────────────────────────────────
  test('applies light mode from localStorage', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nutricoach-theme', 'light')
    })
    await page.goto(BASE + '/auth/login')
    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass ?? '').not.toContain('dark')
  })

  // ── 4. System dark preference ─────────────────────────────────────────────
  test('respects system dark preference when no localStorage', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.addInitScript(() => {
      localStorage.removeItem('nutricoach-theme')
    })
    await page.goto(BASE + '/auth/login')
    const htmlClass = await page.locator('html').getAttribute('class')
    // System dark + no override → should have dark class
    expect(htmlClass).toContain('dark')
  })

  // ── 5. System light preference ────────────────────────────────────────────
  test('does not apply dark class with system light preference', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.addInitScript(() => {
      localStorage.removeItem('nutricoach-theme')
    })
    await page.goto(BASE + '/auth/login')
    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass ?? '').not.toContain('dark')
  })

  // ── 6. Theme persists across navigation ───────────────────────────────────
  test('theme persists across page navigation', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nutricoach-theme', 'dark')
    })
    await page.goto(BASE + '/auth/login')
    expect(await page.locator('html').getAttribute('class')).toContain('dark')

    await page.goto(BASE + '/auth/register')
    expect(await page.locator('html').getAttribute('class')).toContain('dark')
  })

  // ── 7. Theme persists after refresh ──────────────────────────────────────
  test('dark mode persists after page refresh', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nutricoach-theme', 'dark')
    })
    await page.goto(BASE + '/auth/login')
    await page.reload()
    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')
  })

  // ── 8. Background color token applied ─────────────────────────────────────
  test('dark background token is applied on body', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nutricoach-theme', 'dark')
    })
    await page.goto(BASE + '/auth/login')
    const bgColor = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor
    )
    // Dark background should NOT be white
    expect(bgColor).not.toBe('rgb(255, 255, 255)')
  })

  // ── 9. No hardcoded white in toggle thumb ─────────────────────────────────
  test('toggle thumbs use semantic token, not hardcoded white', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nutricoach-theme', 'dark')
    })
    await page.goto(BASE + '/onboarding')
    // Check that no element has literal white background via inline style
    const whiteInlineElements = await page.locator('[style*="background: white"], [style*="background-color: white"]').count()
    expect(whiteInlineElements).toBe(0)
  })
})

// ── Mobile dark mode ──────────────────────────────────────────────────────────
test.describe('Mobile dark mode', () => {
  test.use({
    viewport: { width: 390, height: 844 }, // iPhone 14
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  })

  test('dark mode works on mobile viewport', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(BASE + '/auth/login')
    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')
  })

  test('body background not white in dark mode on mobile', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nutricoach-theme', 'dark')
    })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(BASE + '/auth/login')
    const bgColor = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor
    )
    expect(bgColor).not.toBe('rgb(255, 255, 255)')
  })
})
