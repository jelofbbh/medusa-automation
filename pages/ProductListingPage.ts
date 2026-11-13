import { expect, Locator, Page } from "@playwright/test";
import { ProductCard } from "../components/ProductCard";

export class ProductListingPage {
    readonly page: Page;
    readonly productCards: Locator;
    readonly productNames: Locator;
    readonly sortOptions: Locator;

    constructor(page: Page) {
        this.page = page;

        this.productCards = page.getByTestId('product-wrapper');
        this.productNames = this.productCards.getByTestId('product-title');
        this.sortOptions = page.getByTestId('radio-label');
    }

    getProductCard(productName: string): ProductCard {
        return new ProductCard(this.page, productName);
    }

    // Sorting methods
    sortOption(name: string): Locator {
        return this.sortOptions.filter({
            hasText: name
        });
    }

    async sortBy(name: string) {
        await this.sortOption(name).click();
    }

    // Filter methods
    filterSection(title: string): Locator {
        return this.page.getByRole('region', {
            name: new RegExp(`^${title}`)
        });
    }

    filterOption(title: string, name: string): Locator {
        return this.filterSection(title).getByRole('button', {
            name,
            exact: true
        });
    }

    async filterBy(title: string, name: string) {
        const option = this.filterOption(title, name);
        await expect(option).toHaveAttribute('aria-pressed', /^(true|false)$/);
        const wasSelected = await option.getAttribute('aria-pressed') === 'true';

        await option.click();
        await expect(option).toHaveAttribute('aria-pressed', String(!wasSelected));
    }

    async filterByOptions(title: string, names: string[]) {
        for (const name of names) {
            const option = this.filterOption(title, name);
            await expect(option).toHaveAttribute('aria-pressed', /^(true|false)$/);

            if (await option.getAttribute('aria-pressed') === 'false') {
                await this.filterBy(title, name);
            }
        }
    }

    // Get all product names
    async getAllProductNames(): Promise<string[]> {
        const productNames = await this.productNames.allTextContents();
        return productNames;
    }

    // get all product price
    async getAllProductPrices(): Promise<string[]> {
        const priceTexts = await this.productCards.getByTestId('price')
            .allTextContents();
        return priceTexts;

    }

}
