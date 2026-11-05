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
    readonly lastName: Locator;
    readonly email: Locator;
    readonly phone: Locator;
    readonly password: Locator;
    readonly registerBtn: Locator;

    constructor(page: Page) {
        this.page = page;
        this.joinUsBtn = page.getByTestId("register-button");
        this.firstName = page.getByTestId("first-name-input");
        this.lastName = page.getByTestId("last-name-input");
        this.email = page.getByTestId("email-input");
        this.phone = page.getByTestId("phone-input");
        this.password = page.getByTestId("password-input");
        this.registerBtn = page.getByTestId("register-button");
    }

    get welcomeMessage(): Locator {
        return this.page.getByTestId("welcome-message");
    }

    get customerEmail(): Locator {
        return this.page.getByTestId("customer-email");
    }

    get registerError(): Locator {
        return this.page.getByTestId("register-error");
    }

    async clickBtnJoinUs() {
        await this.joinUsBtn.click();
    }

    async enterFirstName(firstName: string) {
        await this.firstName.fill(firstName);
    }

    async enterLastName(lastName: string) {
        await this.lastName.fill(lastName);
    }

    async enterEmail(email: string) {
        await this.email.fill(email);
    }

    async enterPhone(phone: string) {
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
            await this.enterPhone(phone);
        }
        await this.enterPassword(password);
    }
}