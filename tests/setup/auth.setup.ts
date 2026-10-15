import { test as setup, expect } from '@playwright/test';
import { AUTH } from '../../fixtures/auth-paths';

const {
  API_URL, PUBLISHABLE_KEY, STOREFRONT_URL, ADMIN_URL,
  ADMIN_EMAIL, ADMIN_PASSWORD, CUSTOMER_EMAIL, CUSTOMER_PASSWORD,
} = process.env;

const apiHeaders = { 'x-publishable-api-key': PUBLISHABLE_KEY ?? '' };

setup('ensure customer exists', async ({ request }) => {
  expect(PUBLISHABLE_KEY, 'PUBLISHABLE_KEY chưa điền trong .env.local').toBeTruthy();

  const login = await request.post(`${API_URL}/auth/customer/emailpass`, {
    headers: apiHeaders,
    data: { email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD },
  });
  if (login.ok()) return
});

setup('authenticate admin', async ({ page }) => {
  await page.goto(`${ADMIN_URL}login`);
  await page.getByRole('textbox', { name: 'Email' }).fill(ADMIN_EMAIL!);
  await page.getByPlaceholder('Password').fill(ADMIN_PASSWORD!);
  await page.getByRole('button', { name: "Continue with email" }).click();
  await page.waitForURL((url) => !url.pathname.includes('orders'));
  await page.context().storageState({ path: AUTH.admin });
});

setup('authenticate customer', async ({ page }) => {
  await page.goto(`${STOREFRONT_URL}/dk/account`);
  await page.getByTestId('email-input').fill(CUSTOMER_EMAIL!);
  await page.getByTestId('password-input').fill(CUSTOMER_PASSWORD!);
  await page.getByTestId('sign-in-button').click();
  await expect(page.getByTestId('welcome-message')).toBeVisible();
  await page.context().storageState({ path: AUTH.customer });
});