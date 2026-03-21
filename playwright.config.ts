import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: 'html',
  use: {
    baseURL: 'https://umutayb.github.io/vue-test-app/',
    headless: true,
  },
});