import { test, expect, devices } from '@playwright/test'

// Mobile PWA viewport tests.
// Validates correct rendering, tap targets, safe area behavior on mobile viewports.
// Uses Pixel 5 (Android) and iPhone 14 (iOS Safari proxy) configs.

const PIXEL_5 = devices['Pixel 5']
const IPHONE_14 = {
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function expectNoHorizontalScroll(page: import('@playwright/test').Page) {
  const hasHScroll = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
  expect(hasHScroll, 'Page has horizontal overflow').toBe(false)
}

async function getMinTapTargetSize(
  page: import('@playwright/test').Page,
  selector: string
): Promise<{ width: number; height: number } | null> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { width: r.width, height: r.height }
  }, selector)
}

// ── Tests ──────────────────────────────────────────────────────────────────

test.describe('Mobile PWA — Pixel 5 (Android Chrome)', () => {
  test.use({ ...PIXEL_5, viewport: { width: 393, height: 851 } })

  test('login page has no horizontal scroll', async ({ page }) => {
    await page.goto('/auth/login')
    await expectNoHorizontalScroll(page)
  })

  test('login page inputs are 16px+ (prevent iOS zoom)', async ({ page }) => {
    await page.goto('/auth/login')

    const inputFontSize = await page.evaluate(() => {
      const input = document.querySelector('input[type="email"]')
      if (!input) return '0px'
      return window.getComputedStyle(input).fontSize
    })
    const size = parseFloat(inputFontSize)
    expect(size).toBeGreaterThanOrEqual(16)
  })

  test('login button is minimum 44px tall (iOS HIG)', async ({ page }) => {
    await page.goto('/auth/login')

    const size = await getMinTapTargetSize(page, 'button[type="submit"]')
    if (size) {
      expect(size.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('viewport meta contains viewport-fit=cover', async ({ page }) => {
    await page.goto('/auth/login')
    const vpContent = await page
      .locator('meta[name="viewport"]')
      .getAttribute('content')
    expect(vpContent).toContain('viewport-fit=cover')
  })

  test('manifest is linked from login page', async ({ page }) => {
    await page.goto('/auth/login')
    const manifestHref = await page
      .locator('link[rel="manifest"]')
      .getAttribute('href')
    expect(manifestHref).toBe('/manifest.json')
  })

  test('apple-touch-icon is present', async ({ page }) => {
    await page.goto('/auth/login')
    const count = await page.locator('link[rel="apple-touch-icon"]').count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Mobile PWA — iPhone 14 (iOS Safari proxy)', () => {
  test.use(IPHONE_14)

  test('login page renders without horizontal overflow', async ({ page }) => {
    await page.goto('/auth/login')
    await expectNoHorizontalScroll(page)
  })

  test('apple-mobile-web-app-capable meta is set', async ({ page }) => {
    await page.goto('/auth/login')
    const capable = await page
      .locator('meta[name="apple-mobile-web-app-capable"]')
      .getAttribute('content')
    expect(capable).toBe('yes')
  })

  test('apple-mobile-web-app-status-bar-style is set', async ({ page }) => {
    await page.goto('/auth/login')
    const style = await page
      .locator('meta[name="apple-mobile-web-app-status-bar-style"]')
      .getAttribute('content')
    // Should be default, black, or black-translucent
    expect(style).toMatch(/^(default|black|black-translucent)$/)
  })

  test('apple-touch-startup-image links are present', async ({ page }) => {
    await page.goto('/auth/login')
    const count = await page
      .locator('link[rel="apple-touch-startup-image"]')
      .count()
    // At least one splash screen for iOS
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('PWA installability criteria', () => {
  test('HTTPS or localhost — site is served over secure origin', async ({ page }) => {
    await page.goto('/')
    const url = page.url()
    const isSecure = url.startsWith('https://') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')
    expect(isSecure).toBe(true)
  })

  test('manifest.json has required display mode', async ({ request }) => {
    const res = await request.get('/manifest.json')
    const manifest = await res.json()
    expect(manifest.display).toMatch(/^(standalone|minimal-ui|fullscreen)$/)
  })

  test('manifest start_url is reachable (no redirect to auth on /', async ({ request }) => {
    // The start_url /dashboard will redirect to auth — that's expected.
    // We just verify it returns a valid HTTP response, not 404/500.
    const manifest = await (await request.get('/manifest.json')).json()
    const startUrl: string = manifest.start_url ?? '/'

    const res = await request.get(startUrl, { maxRedirects: 5 })
    expect([200, 302, 307, 308]).toContain(res.status())
  })
})
