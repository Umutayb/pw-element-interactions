import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: 'html',
  testIgnore: process.env.RUN_COVERAGE ? [] : ['**/api-coverage.spec.ts'],
  use: {
    baseURL: 'http://127.0.0.1:8080/',
    headless: true,
  },
});