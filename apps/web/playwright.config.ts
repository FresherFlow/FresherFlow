import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.SMOKE_PORT || 3100);
const baseURL = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/smoke',
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    timeout: 240_000,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
