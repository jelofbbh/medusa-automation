import { Locator, Page } from '@playwright/test';
import type { ShippingAddress } from '../test-data/shipping-address';

export class CheckoutPage {
    readonly page: Page;
    readonly items: Locator;
    readonly subtotal: Locator;
    readonly total: Locator;
    readonly shippingSummary: Locator;
    readonly billingSummary: Locator;
    readonly contactSummary: Locator;
    readonly email: Locator;
    readonly deliveryOptions: Locator;
    readonly manualPayment: Locator;
    readonly placeOrderButton: Locator;
    readonly discount: Locator;
    readonly promotionCodes: Locator;
    readonly promotionToggle: Locator;
    readonly promotionInput: Locator;
    readonly promotionApplyButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.items = page.getByTestId('items-table').getByTestId('product-row');
        this.subtotal = page.getByTestId('cart-subtotal');
        this.total = page.getByTestId('cart-total');
        this.shippingSummary = page.getByTestId('shipping-address-summary');
        this.billingSummary = page.getByTestId('billing-address-summary');
        this.contactSummary = page.getByTestId('shipping-contact-summary');
        this.email = page.getByTestId('shipping-email-input');
        this.deliveryOptions = page.getByTestId('delivery-option-radio');
        this.manualPayment = page.getByRole('radio').filter({ hasText: 'Manual Payment' });
        this.placeOrderButton = page.getByTestId('submit-order-button');
        this.discount = page.getByTestId('cart-discount');
        this.promotionCodes = page.getByTestId('discount-code');
        this.promotionToggle = page.getByTestId('add-discount-button');
        this.promotionInput = page.getByTestId('discount-input');
        this.promotionApplyButton = page.getByTestId('discount-apply-button');
    }

    async openFromCart() {
        await this.page.getByTestId('checkout-button').click();
        await this.page.waitForURL((url) => url.pathname.endsWith('/checkout'), { waitUntil: 'domcontentloaded' });
    }

    async fillShippingAddress(address: ShippingAddress) {
        const fields = {
            'shipping-first-name-input': address.first_name,
            'shipping-last-name-input': address.last_name,
            'shipping-address-input': address.address_1,
            'shipping-company-input': address.company,
            'shipping-postal-code-input': address.postal_code,
            'shipping-city-input': address.city,
            'shipping-province-input': address.province,
            'shipping-phone-input': address.phone,
            'shipping-email-input': address.email,
        };
        for (const [testId, value] of Object.entries(fields)) {
            await this.page.getByTestId(testId).fill(value);
        }
        await this.page.getByTestId('shipping-country-select').selectOption(address.country_code);
        const sameBilling = this.page.getByTestId('billing-address-checkbox');
        await sameBilling.check();
        await this.page.getByTestId('submit-address-button').click();
        await this.page.waitForURL((url) => url.searchParams.get('step') === 'delivery', { waitUntil: 'domcontentloaded' });
    }

    async chooseDelivery() {
        await this.deliveryOptions.first().click();
        await this.page.getByTestId('submit-delivery-option-button').click();
        await this.page.waitForURL((url) => url.searchParams.get('step') === 'payment', { waitUntil: 'domcontentloaded' });
    }

    async chooseManualPayment() {
        await this.manualPayment.click();
        await this.page.getByTestId('submit-payment-button').click();
        await this.page.waitForURL((url) => url.searchParams.get('step') === 'review', { waitUntil: 'domcontentloaded' });
    }

    item(productName: string): Locator {
        return this.items.filter({ has: this.page.getByText(productName, { exact: true }) });
    }

    itemName(productName: string): Locator { return this.item(productName).getByTestId('product-title'); }
    itemVariant(productName: string): Locator { return this.item(productName).getByTestId('product-variant'); }
    itemPrice(productName: string): Locator { return this.item(productName).getByTestId('product-price'); }

    async placeOrder() {
        await this.placeOrderButton.click();
        await this.page.waitForURL(/\/order\/[^/]+\/confirmed/, { waitUntil: 'domcontentloaded' });
    }

    async applyPromotion(code: string) {
        if (!await this.promotionInput.isVisible()) {
            await this.promotionToggle.click();
        }
        await this.promotionInput.fill(code);
        await this.promotionApplyButton.click();
    }
}
