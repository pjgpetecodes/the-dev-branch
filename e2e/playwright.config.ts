import { defineConfig, devices } from '@playwright/test';

const appUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5137';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: appUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'dotnet run --project "C:\\repos\\the-dev-branch\\TheDevBranch\\TheDevBranch.csproj" --urls http://127.0.0.1:5137',
    url: appUrl,
    timeout: 120_000,
    reuseExistingServer: true
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
