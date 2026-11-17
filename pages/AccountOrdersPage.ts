import { Locator, Page } from '@playwright/test';

export class AccountOrdersPage {
    readonly recentOrders: Locator;
    readonly orderDetails: Locator;
    readonly orderNumber: Locator;
    readonly orderStatus: Locator;
    readonly paymentStatus: Locator;

    constructor(readonly page: Page) {
        this.recentOrders = page.getByTestId('orders-wrapper');
        this.orderDetails = page.getByTestId('order-details-container');
        this.orderNumber = this.orderDetails.getByTestId('order-id');
        this.orderStatus = this.orderDetails.getByTestId('order-status');
        // Locate by the visible label: the storefront payment span has a misspelled test ID.
        this.paymentStatus = this.orderDetails.getByText(/^Payment status:/).locator('span');
    }

    recentOrder(orderId: string): Locator {
        return this.recentOrders.getByTestId('order-wrapper')
            .and(this.page.locator(`[data-value="${orderId}"]`));
    }

    async openAccount() {
        const countryCode = new URL(this.page.url()).pathname.split('/')[1];
        await this.page.goto(`/${countryCode}/account`, { waitUntil: 'domcontentloaded' });
        await this.recentOrders.waitFor({ state: 'visible' });
    }

    async openRecentOrder(orderId: string) {
        await this.recentOrder(orderId).getByTestId('open-order-button').click();
        await this.page.waitForURL((url) => url.pathname.endsWith(`/account/orders/details/${orderId}`),
            { waitUntil: 'domcontentloaded' });
        await this.orderDetails.waitFor({ state: 'visible' });
    }
}
