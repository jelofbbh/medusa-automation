import { test, expect } from '@playwright/test';
import { LoginPage } from '../../../pages/LoginPage';
import users from '../../../test-data/account.json';

interface InvalidLoginCase {
    title: string;
    email: string;
    password: string;
    expectedError: string;
}

const invalidLoginCases: InvalidLoginCase[] = [
    {
        title: 'Verify signing in with an unexisted account',
        email: users.nonExistedAccount.nonExistedEmail,
        password: users.nonExistedAccount.password,
        expectedError: 'Error: Invalid email or password',
    },
    {
        title: 'Verify signing in with wrong password',
        email: users.existingAccount.existingEmail,
        password: 'WrongPass!123',
        expectedError: 'Error: Invalid email or password',
    },
];

test.describe('Test login function', () => {

    test.use({ storageState: { cookies: [], origins: [] } });

    test('Verify signing in with a valid account', async ({ page }) => {
        const logginPage = new LoginPage(page);
        await page.goto('/dk/account');
        await logginPage.enterLogginInfo(
            users.existingAccount.existingEmail,
            users.existingAccount.password
        );
        await logginPage.clickSignInBtn();

        await expect(logginPage.welcomeMessage).toBeVisible();
        await expect(logginPage.customerEmail).toContainText(users.existingAccount.existingEmail);
    });

    for (const testCase of invalidLoginCases) {
        test(testCase.title, async ({ page }) => {
            const logginPage = new LoginPage(page);
            await page.goto('/dk/account');
            await logginPage.enterLogginInfo(testCase.email, testCase.password);
            await logginPage.clickSignInBtn();

            await expect(logginPage.loginErrorMessage).toContainText(testCase.expectedError);
        });
    }
});