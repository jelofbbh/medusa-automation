import { Locator, Page } from '@playwright/test';

export class CartPage {
    readonly page: Page;
    readonly cartLink: Locator;
    readonly cartItems: Locator;
    readonly subtotal: Locator;
    readonly total: Locator;
    readonly discount: Locator;
    readonly promotionCodes: Locator;
    readonly promotionToggle: Locator;
    readonly promotionInput: Locator;
    readonly promotionApplyButton: Locator;
    readonly cartDropdown: Locator;

    constructor(page: Page) {
        this.page = page;
        this.cartLink = page.getByTestId('nav-cart-link');
        const container = page.getByTestId('cart-container');
        this.cartItems = container.getByTestId('product-row');
        this.subtotal = container.getByTestId('cart-subtotal');
        this.total = container.getByTestId('cart-total');
        this.discount = container.getByTestId('cart-discount');
        this.promotionCodes = container.getByTestId('discount-code');
        this.promotionToggle = container.getByTestId('add-discount-button');
        this.promotionInput = container.getByTestId('discount-input');
        this.promotionApplyButton = container.getByTestId('discount-apply-button');
        this.cartDropdown = page.getByTestId('nav-cart-dropdown');
    }

    async open() {
        // Follow the storefront link to preserve the current country path.
        await this.cartLink.click();
        await this.page.waitForURL((url) => url.pathname.endsWith('/cart'));
        // The navigation link opens a hover dropdown; leave it before interacting with the cart.
        await this.page.mouse.move(0, 0);
        await this.cartDropdown.waitFor({ state: 'hidden' });
    }

    getItem(productName: string, variantTitle: string): Locator {
        return this.cartItems.filter({
            has: this.page.getByText(productName, { exact: true }),
        }).filter({
            has: this.page.getByText(`Variant: ${variantTitle}`, { exact: true }),
        });
    }

    itemName(productName: string, variantTitle: string): Locator {
        return this.getItem(productName, variantTitle).getByTestId('product-title');
    }

    itemVariant(productName: string, variantTitle: string): Locator {
        return this.getItem(productName, variantTitle).getByTestId('product-variant');
    }

    itemQuantity(productName: string, variantTitle: string): Locator {
        return this.getItem(productName, variantTitle).getByTestId('product-select-button');
    }

    itemUnitPrice(productName: string, variantTitle: string): Locator {
        return this.getItem(productName, variantTitle).getByTestId('product-unit-price');
    }

    itemTotalPrice(productName: string, variantTitle: string): Locator {
        return this.getItem(productName, variantTitle).getByTestId('product-price');
    }

    async updateQuantity(productName: string, variantTitle: string, quantity: number) {
        await this.itemQuantity(productName, variantTitle).selectOption(String(quantity));
    }

    async applyPromotion(code: string) {
        if (!await this.promotionInput.isVisible()) {
            await this.promotionToggle.click();
        }
        await this.promotionInput.fill(code);
        await this.promotionApplyButton.click();
    }
}
