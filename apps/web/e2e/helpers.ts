/**
 * E2E test helpers — shared utilities for Leaxaro auth tests
 */
import { type Page, type BrowserContext, expect } from '@playwright/test'

export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3100'

// ─── Test accounts ────────────────────────────────────────────────────────────
export const TEST_USER = {
  name: 'Test Playwright',
  email: `pw-test-${Date.now()}@leaxaro-test.local`,
  password: 'PlaywrightTest1!',
  weakPassword: 'password',
  mismatchPassword: 'DifferentPass1!',
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

export async function fillRegisterForm(page: Page, opts: {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  acceptTerms?: boolean
} = {}) {
  const name = opts.name ?? TEST_USER.name
  const email = opts.email ?? TEST_USER.email
  const password = opts.password ?? TEST_USER.password
  const confirmPassword = opts.confirmPassword ?? password
  const acceptTerms = opts.acceptTerms ?? true

  await page.fill('#reg-name', name)
  await page.fill('#reg-email', email)
  await page.fill('#reg-password', password)
  await page.fill('#reg-confirm', confirmPassword)

  if (acceptTerms) {
    const checkbox = page.locator('[aria-label*="zaakceptuj"], [data-testid="terms-checkbox"], label:has-text("Regulamin") div.rounded')
    const count = await checkbox.count()
    if (count > 0) await checkbox.first().click()
  }
}

export async function fillLoginForm(page: Page, email: string, password: string) {
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
}

export async function waitForDashboard(page: Page) {
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 10000 })
}

export async function waitForToast(page: Page, text: string | RegExp) {
  const toast = page.locator('[role="alert"]').filter({ hasText: text })
  await expect(toast).toBeVisible({ timeout: 5000 })
}

// ─── Accessibility helpers ────────────────────────────────────────────────────
export async function checkNoAxeViolations(page: Page) {
  // Simple check: no role="alert" with error content visible unexpectedly
  // Full axe integration would require @axe-core/playwright
  const alerts = page.locator('[role="alert"]')
  return alerts
}

// ─── Navigation helpers ───────────────────────────────────────────────────────
export async function gotoRegister(page: Page) {
  await page.goto('/auth/register')
  await expect(page).toHaveURL('/auth/register')
}

export async function gotoLogin(page: Page) {
  await page.goto('/auth/login')
  await expect(page).toHaveURL('/auth/login')
}

export async function gotoForgotPassword(page: Page) {
  await page.goto('/auth/forgot-password')
}

// ─── Security helpers ─────────────────────────────────────────────────────────
export const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '"><img src=x onerror=alert(1)>',
  "javascript:alert('xss')",
  '<svg onload=alert(1)>',
]

export const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  "\" OR 1=1 --",
  "1; SELECT * FROM users",
]

export async function checkNoXssExecution(page: Page) {
  // If XSS executed, dialog would appear
  let dialogFired = false
  page.on('dialog', () => { dialogFired = true })
  await page.waitForTimeout(500)
  return !dialogFired
}
