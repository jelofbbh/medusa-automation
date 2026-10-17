import {test, expect} from '@playwright/test'
import { RegisterPage } from "../../../pages/RegisterPage";
import { generatePhone, generateRandomEmail } from "../../../test-data/factories";
import users from '../../../test-data/account.json';

test.describe('Test register function', () => {

    test.use({ storageState: { cookies: [], origins: [] } });

    test('Verify creating new account with a valid user', async({page}) => {
    
        const registerPage = new RegisterPage(page);
        await page.goto('dk/account');
        await registerPage.clickBtnJoinUs();
        const dynamicEmail = generateRandomEmail();
        const dynamicPhone = generatePhone();
        await registerPage.registerInfo({
            firstName: users.newRegisterAccount.firstName,
            lastName: users.newRegisterAccount.lastName,
            email: dynamicEmail,
            password: users.newRegisterAccount.password,
            phone: dynamicPhone})
        await registerPage.clickRegisterBtn();

        await expect(page.getByTestId('welcome-message')).toBeVisible();
        await expect(page.getByTestId('customer-email')).toContainText(dynamicEmail);
        })

    test('Verify creating new account with an existed user', async({page}) => {
        const registerPage = new RegisterPage(page);
        await page.goto('dk/account');
        await registerPage.clickBtnJoinUs();
        await registerPage.registerInfo({
            firstName: users.newRegisterAccount.firstName,
            lastName: users.newRegisterAccount.lastName,
            email: users.existedEmail.existedEmail,
            password: users.newRegisterAccount.password,
        })
        await registerPage.clickRegisterBtn();

        await expect(page.getByTestId('register-error')).toBeVisible();
        await expect(page.getByTestId('register-error')).toContainText('Error: Invalid email or password');
    })
    
})