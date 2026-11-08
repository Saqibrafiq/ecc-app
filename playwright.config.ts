import { defineConfig, devices } from '@playwright/test'

const DEFAULT_PORT = 3000
const PORT = Number(process.env.E2E_PORT ?? DEFAULT_PORT)
const BASE_URL = `http://localhost:${PORT}`
const isCi = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : undefined,
  reporter: isCi ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    // The app lives on members' phones: iPhone and Android first.
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `${isCi ? 'pnpm start' : 'pnpm dev'} --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
})
