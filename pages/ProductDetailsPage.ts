import { Locator, Page } from '@playwright/test';

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
        await this.page.goto(`/products/${encodeURIComponent(handle)}`);
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
        await this.optionButton(title, value).click();
        // Wait for the UI state before selecting the next option.
        await this.optionButton(title, value).and(this.selectedOption(title))
            .waitFor({ state: 'visible' });
    }

    async selectVariant(options: Record<string, string>, variantId: string) {
        for (const [title, value] of Object.entries(options)) {
            await this.selectOption(title, value);
        }

        await this.page.waitForURL((url) => url.searchParams.get('v_id') === variantId);
    }
}
