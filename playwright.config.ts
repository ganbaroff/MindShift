import { defineConfig, devices } from '@playwright/test'

// When PLAYWRIGHT_BASE_URL is set (CI against production), skip the dev server.
// Locally, default to the Vite dev server.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const isProduction = !!process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  timeout: 30_000,

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'], browserName: 'chromium' },
    },
  ],

  // Only start the dev server when testing locally (not against production)
  ...(isProduction ? {} : {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  }),
})
