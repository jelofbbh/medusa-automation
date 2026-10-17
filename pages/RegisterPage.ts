import { Page, Locator } from "@playwright/test";

export interface RegisterData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string; 
}

export class RegisterPage {
    protected readonly page: Page;
    readonly joinUsBtn: Locator;
    readonly firstName: Locator;
    readonly lastname: Locator;
    readonly email: Locator;
    readonly phone: Locator;
    readonly password: Locator;
    readonly registerBtn: Locator;

    constructor(page: Page) {
        this.page = page;
        this.joinUsBtn = page.getByTestId("register-button");
        this.firstName = page.getByTestId("first-name-input");
        this.lastname = page.getByTestId("last-name-input");
        this.email = page.getByTestId("email-input");
        this.phone = page.getByTestId("phone-input");
        this.password = page.getByTestId("password-input");
        this.registerBtn = page.getByTestId("register-button");
    }

    async clickBtnJoinUs() {
        await this.joinUsBtn.click();
    }

    async enterFirstName(firstName: string) {
        await this.firstName.fill(firstName);
    }

    async enterLastName(lastName: string) {
        await this.lastname.fill(lastName);
    }

    async enterEmail(email: string) {
        await this.email.fill(email);
    }

    async phoneNumber(phone: string) {
        await this.phone.fill(phone);
    }

    async enterPassword(password: string) {
        await this.password.fill(password);
    }

    async clickRegisterBtn() {
        await this.registerBtn.click();
    }

    async registerInfo({ firstName, lastName, email, password, phone }: RegisterData) {
        await this.enterFirstName(firstName);
        await this.enterLastName(lastName);
        await this.enterEmail(email);
        if (phone !== undefined) {
            await this.phoneNumber(phone);
        }
        await this.enterPassword(password);
    }
}