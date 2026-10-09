import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against the emulators (09_TESTING_AND_QA.md §3). Run with `pnpm test:e2e` from the root,
 * which starts the emulators, seeds them and then runs these specs.
 * PLAYWRIGHT_CHROMIUM_PATH lets environments with a pre-installed Chromium skip the download.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7'],
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],
  webServer: {
    command: 'pnpm --filter @tinhome/web dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    env: { VITE_USE_EMULATORS: 'true' },
    timeout: 60_000,
  },
});
