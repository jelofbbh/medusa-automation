import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { AUTH } from './fixtures/auth-paths';

const TEST_ENV = process.env.TEST_ENV ?? 'local';
dotenv.config({ path: path.resolve(__dirname, `.env.${TEST_ENV}`) });

for (const key of ['STOREFRONT_URL', 'ADMIN_URL', 'API_URL']) {
  if (!process.env[key]) {
    throw new Error(`Missing env ${key}. Check .env.${TEST_ENV}`);
  }
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testDir: './tests/setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'ui',
      testDir: './tests/ui',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.STOREFRONT_URL,
        storageState: AUTH.customer,
      },
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: process.env.API_URL,
        extraHTTPHeaders: {
          'x-publishable-api-key': process.env.PUBLISHABLE_KEY ?? '',
        },
      },
    },
  ],
});