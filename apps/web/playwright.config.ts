import { defineConfig, devices } from '@playwright/test'

/**
 * Leaxaro — Playwright E2E configuration
 * Targets the local dev server at port 3100.
 * Tests run against a real DB — use DEV_BYPASS_AUTH=false for auth tests.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,    // sequential — auth tests share DB state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,              // single worker to avoid race conditions on shared DB
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Emulate mobile viewport for mobile tests
    ...devices['Pixel 5'],
    viewport: { width: 390, height: 844 }, // iPhone 14 default
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      testMatch: ['**/*.spec.ts'],
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
      testMatch: ['**/mobile-*.spec.ts'],
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 14'],
      },
      testMatch: ['**/mobile-*.spec.ts'],
    },
  ],

  /* Dev server is expected to already be running */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3100',
  //   reuseExistingServer: true,
  // },
})
