import { defineConfig, devices } from '@playwright/test';

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://film:film@localhost:5432/film';

// Starts the built API and the built web app, then checks the page end to end.
// Run `pnpm build` first.
export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Optional: point at a preinstalled browser instead of `playwright install`.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
          : {},
      },
    },
  ],
  webServer: [
    {
      command: 'node ../api/dist/server.js',
      url: 'http://localhost:4000/ready',
      reuseExistingServer: !process.env.CI,
      env: { APP_ENV: 'test', DATABASE_URL: databaseUrl, PORT: '4000', LOG_LEVEL: 'warn' },
    },
    {
      command: 'pnpm start',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      env: { API_URL: 'http://localhost:4000' },
    },
  ],
});
