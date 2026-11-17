import { expect, Locator, Page } from '@playwright/test';

export class ProductDetailsPage {
    readonly page: Page;
    readonly productContainer: Locator;
    readonly productName: Locator;
    readonly productDescription: Locator;
    readonly productGallery: Locator;
    readonly productImages: Locator;
    readonly productPrice: Locator;
    readonly addToCartButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.productContainer = page.getByTestId('product-container');
        this.productName = this.productContainer.getByTestId('product-title');
        this.productDescription = this.productContainer.getByTestId('product-description');
        this.productGallery = this.productContainer.locator(':scope > div').filter({
            has: page.getByRole('img', { name: /^Product image \d+$/ }),
        });
        this.productImages = this.productGallery.getByRole('img', { name: /^Product image \d+$/ });
        this.productPrice = this.productContainer.getByTestId('product-price');
        this.addToCartButton = this.productContainer.getByTestId('add-product-button');
    }

    async open(handle: string) {
        await this.page.goto(`/products/${encodeURIComponent(handle)}`, { waitUntil: 'domcontentloaded' });
        await this.productContainer.waitFor({ state: 'visible' });
    }

    optionGroup(title: string): Locator {
        return this.productContainer.getByText(`Select ${title}`, { exact: true })
            .locator('..').getByTestId('product-options');
    }

    optionButton(title: string, value: string): Locator {
        return this.optionGroup(title).getByRole('button', { name: value, exact: true });
    }

    selectedOption(title: string): Locator {
        // The current storefront exposes selection through this class, not aria-pressed.
        return this.optionGroup(title).locator('button.border-ui-border-interactive');
    }

    async selectOption(title: string, value: string) {
        // Selecting a value is idempotent. Retry if an early click precedes React hydration.
        await expect(async () => {
            await this.optionButton(title, value).click();
            await expect(this.optionButton(title, value).and(this.selectedOption(title)))
                .toBeVisible({ timeout: 1500 });
        }).toPass({ timeout: 10_000 });
    }

    async selectVariant(options: Record<string, string>, variantId: string) {
        for (const [title, value] of Object.entries(options)) {
            await this.selectOption(title, value);
        }

        await this.page.waitForURL((url) => url.searchParams.get('v_id') === variantId,
            { waitUntil: 'domcontentloaded' });
    }

    async addToCart() {
        const productUrl = this.page.url();

        // Adding to cart runs through a Next.js server action. Wait before navigating away.
        await Promise.all([
            this.page.waitForResponse((response) => {
                return response.url() === productUrl
                    && response.request().method() === 'POST'
                    && !!response.request().headers()['next-action'];
            }),
            this.addToCartButton.click(),
        ]);
        await this.addToCartButton.and(this.page.locator('button:not([disabled])'))
            .waitFor({ state: 'visible' });
    }
}
