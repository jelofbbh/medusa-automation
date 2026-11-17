import { Locator, Page } from '@playwright/test';

export class OrderConfirmationPage {
    readonly container: Locator;
    readonly heading: Locator;
    readonly orderNumber: Locator;
    readonly email: Locator;
    readonly shippingAddress: Locator;
    readonly contact: Locator;
    readonly shippingMethod: Locator;
    readonly paymentMethod: Locator;
    readonly subtotal: Locator;
    readonly total: Locator;
    readonly items: Locator;

    constructor(readonly page: Page) {
        this.container = page.getByTestId('order-complete-container');
        this.heading = this.container.getByRole('heading', { level: 1 });
        this.orderNumber = this.container.getByTestId('order-id');
        this.email = this.container.getByTestId('order-email');
        this.shippingAddress = this.container.getByTestId('shipping-address-summary');
        this.contact = this.container.getByTestId('shipping-contact-summary');
        this.shippingMethod = this.container.getByTestId('shipping-method-summary');
        this.paymentMethod = this.container.getByTestId('payment-method');
        this.subtotal = this.container.getByTestId('cart-subtotal');
        this.total = this.container.getByTestId('cart-total');
        this.items = this.container.getByTestId('product-row');
    }

    item(productName: string): Locator {
        return this.items.filter({ has: this.page.getByText(productName, { exact: true }) });
    }

    itemName(productName: string): Locator { return this.item(productName).getByTestId('product-name'); }
    itemVariant(productName: string): Locator { return this.item(productName).getByTestId('product-variant'); }
    itemQuantity(productName: string): Locator { return this.item(productName).getByTestId('product-quantity'); }
    itemPrice(productName: string): Locator { return this.item(productName).getByTestId('product-price'); }
}
