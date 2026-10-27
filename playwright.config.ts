import { defineConfig } from '@playwright/test'

const PORT = 4783

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}/breathe/`,
    viewport: { width: 390, height: 844 },
    colorScheme: 'light',
    acceptDownloads: true,
  },
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/breathe/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
