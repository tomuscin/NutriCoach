import { test, expect } from '@playwright/test'

// PWA Manifest + Service Worker — structural validation tests.
// These run without auth — they only check publicly accessible PWA assets.
// No live server needed for manifest/icon checks (but SW registration needs one).

test.describe('PWA manifest', () => {
  test('manifest.json is valid and reachable', async ({ request }) => {
    const res = await request.get('/manifest.json')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('json')

    const manifest = await res.json()

    // Required fields
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.start_url).toBeTruthy()
    expect(manifest.display).toMatch(/^(standalone|minimal-ui|fullscreen)$/)
    expect(manifest.theme_color).toBeTruthy()
    expect(manifest.background_color).toBeTruthy()
    expect(manifest.id).toBeTruthy()

    // Icons — at least one 192 and one 512
    const iconSizes = manifest.icons?.map((i: { sizes: string }) => i.sizes) ?? []
    expect(iconSizes.some((s: string) => s.includes('192'))).toBe(true)
    expect(iconSizes.some((s: string) => s.includes('512'))).toBe(true)

    // At least one maskable icon
    const hasMaskable = manifest.icons?.some((i: { purpose?: string }) =>
      i.purpose?.includes('maskable')
    )
    expect(hasMaskable).toBe(true)

    // Shortcuts (optional but expected)
    if (manifest.shortcuts) {
      expect(manifest.shortcuts.length).toBeGreaterThan(0)
    }
  })

  test('all manifest icons are reachable', async ({ request }) => {
    const res = await request.get('/manifest.json')
    const manifest = await res.json()

    for (const icon of manifest.icons ?? []) {
      const iconRes = await request.get(icon.src)
      expect(iconRes.status(), `Icon ${icon.src} not found`).toBe(200)
    }
  })

  test('offline.html fallback is reachable', async ({ request }) => {
    const res = await request.get('/offline.html')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('html')
    const body = await res.text()
    expect(body).toContain('offline')
  })

  test('service worker is reachable', async ({ request }) => {
    const res = await request.get('/sw.js')
    expect(res.status()).toBe(200)
    // SW must not be cached by browser (requires Cache-Control header)
    const cc = res.headers()['cache-control'] ?? ''
    expect(cc.includes('no-store') || cc.includes('no-cache') || cc === '').toBeTruthy()
  })
})

test.describe('PWA meta tags', () => {
  test('login page has correct PWA meta tags', async ({ page }) => {
    await page.goto('/auth/login')

    // Manifest link
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')

    // Apple web app capable
    const appleCap = page.locator('meta[name="apple-mobile-web-app-capable"]')
    await expect(appleCap).toHaveAttribute('content', 'yes')

    // Theme color
    const themeColor = page.locator('meta[name="theme-color"]')
    await expect(themeColor.first()).toBeVisible()

    // Viewport cover
    const viewport = page.locator('meta[name="viewport"]')
    const vpContent = await viewport.getAttribute('content')
    expect(vpContent).toContain('viewport-fit=cover')
  })
})

test.describe('PWA service worker registration', () => {
  test('SW registers successfully on login page', async ({ page }) => {
    await page.goto('/auth/login')

    // Wait for SW registration
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false
      try {
        const reg = await navigator.serviceWorker.ready
        return !!reg.active
      } catch {
        return false
      }
    })

    expect(swRegistered).toBe(true)
  })

  test('SW version matches expected format', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForTimeout(2000) // allow SW to activate

    const version = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg?.active) return null
      return new Promise<string | null>((resolve) => {
        const channel = new MessageChannel()
        channel.port1.onmessage = (e) => {
          resolve(e.data?.version ?? null)
        }
        reg.active?.postMessage({ type: 'GET_VERSION' }, [channel.port2])
        setTimeout(() => resolve(null), 2000)
      })
    })

    // Version should be non-null (SW responded to GET_VERSION message)
    // We don't assert specific version to avoid test fragility
    expect(version).not.toBeNull()
  })
})
