import { Page, Locator } from "@playwright/test";

export class LoginPage{
    protected readonly page: Page;
    readonly email: Locator;
    readonly password: Locator;
    readonly signInBtn: Locator;
    constructor(page){
        this.page = page;
        this.email = page.getByTestId('email-input');
        this.password = page.getByTestId('password-input');
        this.signInBtn = page.getByTestId('sign-in-button');
    }

    async enterLogginInfo(email: string, password: string){
        await this.email.fill(email);
        await this.password.fill(password)
    }
    async clickSignInBtn(){
        await this.signInBtn.click()
    }
}