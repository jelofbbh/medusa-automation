import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../../pages/RegisterPage';
import { generatePhone, generateRandomEmail } from '../../../test-data/factories';
import users from '../../../test-data/account.json';

test.describe('Test register function', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    const { firstName, lastName, password } = users.newRegisterAccount;
    let registerPage: RegisterPage;

    test.beforeEach(async ({ page }) => {
        registerPage = new RegisterPage(page);
        await page.goto('dk/account');
        await registerPage.clickBtnJoinUs();
    });

    // UI-ACCOUNT-01
    test('Verify creating new account with a valid user', async () => {
        const email = generateRandomEmail();

        await registerPage.registerInfo({
            firstName, lastName, email, password,
            phone: generatePhone(),
        });
        await registerPage.clickRegisterBtn();

        await expect(registerPage.welcomeMessage).toBeVisible();
        await expect(registerPage.customerEmail).toContainText(email);
    });

    // UI-ACCOUNT-02
    test('Verify creating new account with an existing user', async () => {
        await registerPage.registerInfo({
            firstName, lastName, password,
            email: users.existingAccount.existingEmail,
        });
        await registerPage.clickRegisterBtn();

        await expect(registerPage.registerError).toContainText('Error: Invalid email or password');
    });
});