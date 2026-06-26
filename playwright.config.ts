import { defineConfig } from '@playwright/test';

// Harness E2E. Usa il google-chrome di sistema (channel:'chrome') → niente download browser.
// Presuppone backend su :8080 e frontend su :4200 già avviati (quarkus:dev + ng serve).
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4200',
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure',
  },
});
