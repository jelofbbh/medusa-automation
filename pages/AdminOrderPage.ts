import { Locator, Page } from '@playwright/test';

export class AdminOrderPage {
    readonly main: Locator;
    readonly heading: Locator;
    readonly captureButton: Locator;
    readonly capturedStatus: Locator;
    readonly fulfilledStatus: Locator;
    readonly fulfillmentHeading: Locator;
    readonly totalRow: Locator;

    constructor(readonly page: Page) {
        this.main = page.getByRole('main');
        this.heading = this.main.getByRole('heading', { level: 1 });
        this.captureButton = this.main.getByRole('button', { name: 'Capture payment', exact: true });
        this.capturedStatus = this.main.getByText('Captured', { exact: true }).first();
        this.fulfilledStatus = this.main.getByText('Fulfilled', { exact: true }).first();
        this.fulfillmentHeading = this.main.getByRole('heading', { name: /Fulfillment #/i });
        this.totalRow = this.main.getByText('Total After Discount', { exact: true }).locator('..');
    }

    async open(orderId: string) {
        await this.page.goto(`${process.env.API_URL}/app/orders/${encodeURIComponent(orderId)}`,
            { waitUntil: 'domcontentloaded' });
        await this.heading.waitFor({ state: 'visible' });
    }

    text(value: string): Locator { return this.main.getByText(value, { exact: true }).first(); }

    async capturePayment() {
        await this.captureButton.click();
        await this.page.getByRole('alertdialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    }

    async fulfillOrder(shippingMethodName: string) {
        const header = this.main.getByRole('heading', { name: 'Unfulfilled Items', exact: true }).locator('..');
        await header.getByRole('button').click();
        await this.page.getByRole('menuitem', { name: 'Fulfill items', exact: true }).click();
        // Explicit selection commits the shipping option after the location effect initializes.
        await this.page.getByRole('combobox', { name: 'Shipping method', exact: true }).click();
        await this.page.getByRole('option', { name: shippingMethodName, exact: true }).click();
        await this.page.getByRole('button', { name: 'Create Fulfillment', exact: true }).click();
        await this.page.getByRole('dialog').waitFor({ state: 'hidden' });
    }
}
