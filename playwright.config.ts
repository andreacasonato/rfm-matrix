import { defineConfig, devices } from '@playwright/test';

const port = 4173;

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${port}/` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Serves the production build, so run `pnpm build` first (`pnpm test:e2e` does).
  webServer: {
    command: `pnpm --filter @rfm-matrix/app exec vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: !process.env.CI,
  },
});
