import { defineConfig, devices } from '@playwright/test';

const requestedEngine = String(process.env.E2E_ENGINE || 'auto').trim().toLowerCase();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:33164',
    trace: 'on-first-retry',
  },
  projects:
    requestedEngine === 'obscura'
      ? [
        {
          name: 'obscura-fast',
          testMatch: /docs\/.*\.spec\.js$/,
          use: {
            ...devices['Desktop Chrome'],
            e2eEngine: 'obscura',
            obscuraPort: 43164,
          },
        },
      ]
      : [
        {
          name: 'obscura-fast',
          testMatch: /docs\/.*\.spec\.js$/,
          use: {
            ...devices['Desktop Chrome'],
            e2eEngine: requestedEngine === 'chromium' ? 'chromium' : 'auto',
            obscuraPort: 43164,
          },
        },
        {
          name: 'chromium-visual',
          testMatch: /components\/.*\.spec\.js$/,
          use: {
            ...devices['Desktop Chrome'],
            e2eEngine: 'chromium',
          },
        },
      ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:33164',
    reuseExistingServer: !process.env.CI,
    timeout: 10 * 1000,
  },
});
