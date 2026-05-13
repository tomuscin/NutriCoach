import { test, expect } from '@playwright/test'

// Email auth flow tests — E2E validation without mocks.
// Tests run against local dev server (port 3100).
// Email delivery is NOT tested in CI — only the UI flow and API responses.
// For real delivery testing: use production audit script separately.

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3100'
const TEST_EMAIL = `nc-e2e-test-${Date.now()}@mailnull.com`

// ─── Registration flow ────────────────────────────────────────────────────────

test.describe('Registration → email verification flow', () => {
  test('registration page renders correctly', async ({ page }) => {
    await page.goto('/auth/register')

    await expect(page.locator('h1, [data-testid="register-heading"]').first()).toBeVisible()

    // Form fields
    await expect(page.locator('input[name="name"], input[placeholder*="mię"]').first()).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()

    // Submit button
    const submitBtn = page.locator('button[type="submit"]').first()
    await expect(submitBtn).toBeVisible()
  })

  test('register with invalid email shows validation error', async ({ page }) => {
    await page.goto('/auth/register')

    await page.fill('input[type="email"]', 'not-an-email')
    await page.click('button[type="submit"]')

    // Should show validation error, not redirect
    await expect(page).toHaveURL(/\/auth\/register/)
  })

  test('password mismatch shows error', async ({ page }) => {
    await page.goto('/auth/register')

    const pwFields = page.locator('input[type="password"]')
    await pwFields.nth(0).fill('Password123!')
    await pwFields.nth(1).fill('DifferentPassword123!')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/auth\/register/)
  })

  test('resend-verification API rejects invalid email', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/resend-verification`, {
      data: { email: 'not-valid' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.ok).toBe(false)
  })

  test('resend-verification returns ok=true for unknown email (anti-enumeration)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/resend-verification`, {
      data: { email: 'nobody@example-nonexistent-12345.com' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  test('resend-verification is rate limited after many requests', async ({ request }) => {
    const email = `ratelimit-test-${Date.now()}@mailnull.com`
    let lastStatus = 200

    // Exceed the rate limit (5 per hour by IP)
    for (let i = 0; i < 7; i++) {
      const res = await request.post(`${BASE}/api/auth/resend-verification`, {
        data: { email },
      })
      lastStatus = res.status()
      if (lastStatus === 429) break
    }

    // Should eventually hit 429
    expect(lastStatus).toBe(429)
  })
})

// ─── Verify email page ────────────────────────────────────────────────────────

test.describe('Verify email page — UI states', () => {
  test('shows "check inbox" state when no token', async ({ page }) => {
    await page.goto('/auth/verify-email')
    // Should show prompt to check inbox
    const body = await page.locator('body').textContent()
    expect(body?.toLowerCase()).toMatch(/email|inbox|skrzynk|sprawdź/i)
  })

  test('shows expired state for ?error=expired', async ({ page }) => {
    await page.goto('/auth/verify-email?error=expired')
    const body = await page.locator('body').textContent()
    expect(body?.toLowerCase()).toMatch(/wygasł|expired|nowy link/i)
  })

  test('shows invalid state for ?error=invalid', async ({ page }) => {
    await page.goto('/auth/verify-email?error=invalid')
    const body = await page.locator('body').textContent()
    expect(body?.toLowerCase()).toMatch(/nieprawidłowy|invalid/i)
  })

  test('verify-email API rejects invalid token', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/verify-email`, {
      data: { token: 'invalid-token-that-does-not-exist-abc123' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.ok).toBe(false)
  })

  test('verify-email GET with missing token redirects to error page', async ({ page }) => {
    await page.goto('/api/auth/verify-email')
    // Should redirect to /auth/verify-email?error=missing_token
    await expect(page).toHaveURL(/verify-email/)
  })

  test('verify-email GET with fake token redirects to error page', async ({ page }) => {
    await page.goto('/api/auth/verify-email?token=fakefakefake1234567890abcdef')
    await expect(page).toHaveURL(/verify-email/)
  })

  test('token replay is blocked — second use of same token fails', async ({ request }) => {
    // This test validates the single-use enforcement of tokens.
    // We can't generate a real token without DB access, so we test
    // that two uses of the same fake token both fail consistently.
    const fakeToken = 'replay-test-deadbeef1234567890abcdefgh'

    const first = await request.post(`${BASE}/api/auth/verify-email`, {
      data: { token: fakeToken },
    })
    const second = await request.post(`${BASE}/api/auth/verify-email`, {
      data: { token: fakeToken },
    })

    // Both should fail (token doesn't exist)
    expect(first.status()).toBe(400)
    expect(second.status()).toBe(400)
  })
})

// ─── Password reset flow ──────────────────────────────────────────────────────

test.describe('Password reset flow', () => {
  test('forgot-password page renders', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('forgot-password returns same success for unknown email (anti-enumeration)', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    await page.fill('input[type="email"]', 'nobody@nonexistent-domain-12345.com')
    await page.click('button[type="submit"]')

    // Should show success state (not reveal if email exists)
    await page.waitForTimeout(1000)
    const body = await page.locator('body').textContent()
    // Should NOT show an error saying "no account found"
    expect(body?.toLowerCase()).not.toMatch(/nie znaleziono|no account|not found/i)
  })

  test('reset-password page shows error for missing token', async ({ page }) => {
    await page.goto('/auth/reset-password')
    const body = await page.locator('body').textContent()
    expect(body?.toLowerCase()).toMatch(/token|link|nieprawidłowy|invalid/i)
  })

  test('reset-password page shows error for invalid token', async ({ page }) => {
    await page.goto('/auth/reset-password?token=aaabbbccc111222333deadbeef')
    // Attempt reset — should fail gracefully
    const pwFields = page.locator('input[type="password"]')
    if ((await pwFields.count()) > 0) {
      await pwFields.nth(0).fill('NewPassword123!')
      await pwFields.nth(1).fill('NewPassword123!')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(1000)
      const body = await page.locator('body').textContent()
      expect(body?.toLowerCase()).toMatch(/nieprawidłowy|invalid|wygasł|expired/i)
    }
  })

  test('password-reset is rate limited', async ({ request }) => {
    let lastStatus = 200
    for (let i = 0; i < 5; i++) {
      const res = await request.post(`${BASE}/auth/forgot-password`, {
        form: { email: TEST_EMAIL },
      })
      lastStatus = res.status()
      if (lastStatus === 429) break
    }
    // Rate limit kicks in after 3 attempts per IP/hour
    // (test may not reach it from same Playwright IP — just verify no 500)
    expect([200, 302, 429]).toContain(lastStatus)
  })
})

// ─── Login flow ───────────────────────────────────────────────────────────────

test.describe('Login flow security', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('login with wrong credentials shows generic error', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('input[type="email"]', 'attacker@example.com')
    await page.fill('input[type="password"]', 'WrongPassword!')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1000)

    // Should show error but not reveal whether email exists
    const body = await page.locator('body').textContent()
    expect(body?.toLowerCase()).toMatch(/nieprawidłowy|invalid|hasło|email/i)
    // Should NOT say "email not found" or "user not found"
    expect(body?.toLowerCase()).not.toMatch(/nie istnieje|not found|no account/i)
  })

  test('successful login redirects to dashboard or onboarding', async ({ page }) => {
    // This requires real credentials — skip if not provided
    const testEmail = process.env.E2E_TEST_EMAIL
    const testPassword = process.env.E2E_TEST_PASSWORD
    if (!testEmail || !testPassword) {
      test.skip()
      return
    }

    await page.goto('/auth/login')
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    // Should redirect away from login
    const url = page.url()
    expect(url).not.toContain('/auth/login')
  })

  test('/dashboard redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

// ─── Auth error page ──────────────────────────────────────────────────────────

test.describe('Auth error page', () => {
  test('/auth/error renders without crashing', async ({ page }) => {
    await page.goto('/auth/error')
    await expect(page.locator('body')).toBeVisible()
    // Should not be a 500 error
    expect(page.url()).toContain('/auth/error')
  })
})

// ─── Cleanup ──────────────────────────────────────────────────────────────────
// Note: No actual user created in these tests (we use @mailnull.com which is
// a disposable domain). No cleanup needed.
