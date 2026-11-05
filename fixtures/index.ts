import { test as base, expect } from '@playwright/test';
import { CustomerApi } from './api/customer.api';
import type { CustomerData } from './api/customer.api';
import accountData from '../test-data/account.json';
import {
  generateRandomEmail,
  generatePhone,
} from '../test-data/factories';

type CustomFixtures = {
  customerApi: CustomerApi;
  customerData: CustomerData;
};

export const test = base.extend<CustomFixtures>({
  // Fixture 1: Generate customer data
  customerData: async ({}, use) => {
    const customerData: CustomerData = {
      email: generateRandomEmail(),
      password: accountData.newRegisterAccount.password,
      first_name: accountData.newRegisterAccount.firstName,
      last_name: accountData.newRegisterAccount.lastName,
      phone: generatePhone(),
    };

    await use(customerData);
  },

  // Fixture 2: Create CustomerApi instance
  customerApi: async ({ request }, use) => {
    const baseUrl = process.env.API_URL;
    const publishableApiKey = process.env.PUBLISHABLE_KEY;

    if (!baseUrl || !publishableApiKey) {
      throw new Error(
        'Missing API_URL or PUBLISHABLE_KEY in environment variables'
      );
    }

    const customerApi = new CustomerApi(
      request,
      baseUrl,
      publishableApiKey
    );

    await use(customerApi);
  },
});

export { expect };