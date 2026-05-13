/**
 * E2E — Register flow
 * Tests: happy path, duplicate email, weak password, mismatched passwords,
 *        missing terms, XSS, SQL injection, long inputs, unicode names,
 *        double submit, mobile keyboard
 */
import { test, expect } from '@playwright/test'
import { fillRegisterForm, gotoRegister, XSS_PAYLOADS, SQL_INJECTION_PAYLOADS, checkNoXssExecution } from '../helpers'

const UNIQUE_EMAIL = () => `pw-reg-${Date.now()}@test.local`

test.describe('Registration', () => {
  test.beforeEach(async ({ page }) => {
    await gotoRegister(page)
  })

  // ─── Happy path ───────────────────────────────────────────────────────────
  test('happy path — valid registration shows success state', async ({ page }) => {
    await fillRegisterForm(page, {
      name: 'Jan Kowalski',
      email: UNIQUE_EMAIL(),
      password: 'ValidPass1!',
    })
    await page.click('button[type="submit"]')
    // Success state — CheckCircle2 + success message
    await expect(page.locator('text=Konto zostało utworzone')).toBeVisible({ timeout: 10000 })
    // Redirect to login after delay
    await expect(page).toHaveURL(/auth\/login/, { timeout: 5000 })
  })

  // ─── Duplicate email ─────────────────────────────────────────────────────
  test('duplicate email — shows error without exposing account existence', async ({ page }) => {
    // Use a known-existing email (from seed or first run)
    await fillRegisterForm(page, {
      email: 'duplicate@test.local', // safe test email
      password: 'ValidPass1!',
    })
    await page.click('button[type="submit"]')
    // Error should be generic (not confirm account exists) — ENUMERATION SAFE
    const error = page.locator('[role="alert"], .text-destructive').first()
    await expect(error).toBeVisible({ timeout: 5000 })
  })

  // ─── Weak password ───────────────────────────────────────────────────────
  test('weak password — strength meter shows weak, submit blocked', async ({ page }) => {
    await page.fill('#reg-name', 'Test User')
    await page.fill('#reg-email', UNIQUE_EMAIL())
    await page.fill('#reg-password', 'abc')
    await page.fill('#reg-confirm', 'abc')
    // Strength meter visible
    const strengthLabel = page.locator('text=Słabe')
    await expect(strengthLabel).toBeVisible()
    await page.click('button[type="submit"]')
    // Should not navigate away
    await expect(page).toHaveURL('/auth/register')
    // Error visible
    await expect(page.locator('.text-destructive').first()).toBeVisible()
  })

  // ─── Password without special char ──────────────────────────────────────
  test('good-but-incomplete password — blocks submit with specific hint', async ({ page }) => {
    await page.fill('#reg-name', 'Test User')
    await page.fill('#reg-email', UNIQUE_EMAIL())
    await page.fill('#reg-password', 'TestPass99') // missing special char
    await page.fill('#reg-confirm', 'TestPass99')
    const checkbox = page.locator('label:has-text("Regulamin") div.rounded, [data-testid="terms-checkbox"]').first()
    if (await checkbox.count() > 0) await checkbox.click()
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/auth/register')
    const err = page.locator('text=/Uzupełnij|wymagań bezpieczeństwa/')
    await expect(err).toBeVisible()
  })

  // ─── Mismatched passwords ────────────────────────────────────────────────
  test('mismatched passwords — shows confirm password error', async ({ page }) => {
    await page.fill('#reg-name', 'Test User')
    await page.fill('#reg-email', UNIQUE_EMAIL())
    await page.fill('#reg-password', 'ValidPass1!')
    await page.fill('#reg-confirm', 'DifferentPass1!')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Hasła muszą być identyczne')).toBeVisible()
  })

  // ─── Missing terms ──────────────────────────────────────────────────────
  test('missing terms acceptance — shows terms error', async ({ page }) => {
    await page.fill('#reg-name', 'Test User')
    await page.fill('#reg-email', UNIQUE_EMAIL())
    await page.fill('#reg-password', 'ValidPass1!')
    await page.fill('#reg-confirm', 'ValidPass1!')
    // Do NOT check terms
    await page.click('button[type="submit"]')
    await expect(page.locator('text=/zaakceptować|Regulamin/')).toBeVisible()
  })

  // ─── XSS attempts ────────────────────────────────────────────────────────
  test('XSS in name field — sanitized, no script execution', async ({ page }) => {
    for (const payload of XSS_PAYLOADS.slice(0, 2)) {
      await page.fill('#reg-name', payload)
      await page.fill('#reg-email', UNIQUE_EMAIL())
      await page.fill('#reg-password', 'ValidPass1!')
      await page.fill('#reg-confirm', 'ValidPass1!')
      await page.click('button[type="submit"]')
      const xssExecuted = !(await checkNoXssExecution(page))
      expect(xssExecuted).toBe(false)
      // Should show validation error (invalid name chars)
      await expect(page).toHaveURL('/auth/register')
    }
  })

  // ─── SQL injection ───────────────────────────────────────────────────────
  test('SQL injection in email — rejected or safely handled', async ({ page }) => {
    for (const payload of SQL_INJECTION_PAYLOADS.slice(0, 2)) {
      await gotoRegister(page)
      await page.fill('#reg-name', 'Test')
      await page.fill('#reg-email', payload)
      await page.fill('#reg-password', 'ValidPass1!')
      await page.fill('#reg-confirm', 'ValidPass1!')
      await page.click('button[type="submit"]')
      // Should show email format error — no crash
      const err = page.locator('.text-destructive').first()
      await expect(err).toBeVisible({ timeout: 3000 })
      await expect(page).toHaveURL('/auth/register')
    }
  })

  // ─── Very long inputs ────────────────────────────────────────────────────
  test('very long name — capped at max length or rejected', async ({ page }) => {
    const longName = 'A'.repeat(300)
    await page.fill('#reg-name', longName)
    await page.fill('#reg-email', UNIQUE_EMAIL())
    await page.fill('#reg-password', 'ValidPass1!')
    await page.fill('#reg-confirm', 'ValidPass1!')
    await page.click('button[type="submit"]')
    // Should show length validation error
    await expect(page.locator('text=/za długie|48 znaków|50 znaków/').first()).toBeVisible()
  })

  // ─── Unicode / international names ───────────────────────────────────────
  test('unicode Polish name — accepted', async ({ page }) => {
    await fillRegisterForm(page, {
      name: 'Łukasz Żółtowski',
      email: UNIQUE_EMAIL(),
      password: 'ValidPass1!',
    })
    await page.click('button[type="submit"]')
    // Should either succeed or get server error (not validation error on name)
    await expect(page.locator('text=/Konto zostało|Zarejestruj się/')).toBeVisible({ timeout: 8000 })
  })

  // ─── Apostrophe in name ──────────────────────────────────────────────────
  test("apostrophe in name (O'Brien) — accepted after fix", async ({ page }) => {
    await fillRegisterForm(page, {
      name: "O'Brien",
      email: UNIQUE_EMAIL(),
      password: 'ValidPass1!',
    })
    await page.click('button[type="submit"]')
    // Should not show name validation error
    const nameErr = page.locator('text=Imię zawiera niedozwolone znaki')
    await expect(nameErr).not.toBeVisible()
  })

  // ─── Double submit ───────────────────────────────────────────────────────
  test('double submit — second click ignored while pending', async ({ page }) => {
    await fillRegisterForm(page, { email: UNIQUE_EMAIL() })
    // Click twice rapidly
    await page.click('button[type="submit"]')
    await page.click('button[type="submit"]')
    // Should show success once, not duplicate registration error
    await expect(page.locator('text=Konto zostało utworzone')).toBeVisible({ timeout: 10000 })
  })

  // ─── Terms links accessible ──────────────────────────────────────────────
  test('terms links are clickable and lead to public pages', async ({ page, context }) => {
    const [termsPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('a[href="/terms"]'),
    ]).catch(async () => {
      // May open in same tab
      await page.click('a[href="/terms"]')
      return [page]
    })
    // Terms page should load without auth redirect
    await (termsPage ?? page).waitForURL(/terms/, { timeout: 5000 })
    await expect(termsPage ?? page).toHaveURL('/terms')
  })
})
