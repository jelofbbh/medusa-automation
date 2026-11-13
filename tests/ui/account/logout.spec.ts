import {test, expect} from '@playwright/test'
import { LoginPage } from '../../../pages/LoginPage'

test.describe('Log out function', () => {
    let loginPage : LoginPage
    test.beforeEach(async ({page}) => {
        loginPage = new LoginPage(page);
        await page.goto('/dk/account')
    })

    test('Verify signing out', async ({}) => {
        await loginPage.clickLogoutBtn();
        await expect(loginPage.signInTitle).toContainText('Welcome back');
    })
})
