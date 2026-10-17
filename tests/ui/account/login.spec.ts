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
        email: users.existedAccount.existedEmail,
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
            users.existedAccount.existedEmail,
            users.existedAccount.password
        );
        await logginPage.clickSignInBtn();

        await expect(page.getByTestId('welcome-message')).toBeVisible();
        await expect(page.getByTestId('customer-email')).toContainText(users.existedAccount.existedEmail);
    });

    for (const testCase of invalidLoginCases) {
        test(testCase.title, async ({ page }) => {
            const logginPage = new LoginPage(page);
            await page.goto('/dk/account');
            await logginPage.enterLogginInfo(testCase.email, testCase.password);
            await logginPage.clickSignInBtn();

            await expect(page.getByTestId('login-error-message')).toContainText(testCase.expectedError);
        });
    }
});