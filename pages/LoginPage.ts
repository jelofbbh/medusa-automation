import { Page, Locator } from "@playwright/test";

export class LoginPage{
    protected readonly page: Page;
    readonly email: Locator;
    readonly password: Locator;
    readonly signInBtn: Locator;
    readonly logoutBtn: Locator;
    constructor(page: Page){
        this.page = page;
        this.email = page.getByTestId('email-input');
        this.password = page.getByTestId('password-input');
        this.signInBtn = page.getByTestId('sign-in-button');
        this.logoutBtn = page.getByTestId('account-nav').getByTestId('logout-button');
    }
    get signInTitle(): Locator {
        return this.page.getByRole('heading', { name: 'Welcome back' });
    }
    get welcomeMessage(): Locator {
        return this.page.getByTestId('welcome-message');
    }
    get customerEmail(): Locator {
        return this.page.getByTestId('customer-email');
    }
    get loginErrorMessage(): Locator {
        return this.page.getByTestId('login-error-message');
    }

    async enterLogginInfo(email: string, password: string){
        await this.email.fill(email);
        await this.password.fill(password)
    }
    async clickSignInBtn(){
        await this.signInBtn.click()
    }
    async clickLogoutBtn(){
        await this.logoutBtn.click()
    }

}