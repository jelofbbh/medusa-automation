
import { test, expect } from '@playwright/test';
import { ProductListingPage } from '../../../pages/ProductListingPage';
import { ProductsAPI, StoreProduct } from '../../../fixtures/api/products.api';

type ProductFilters = Partial<Record<'Color' | 'Size', string[]>>;

function getExpectedProductNames(products: StoreProduct[], filters: ProductFilters): string[] {
    return products.filter((product) => {
        // OR within a group, AND between groups at product level; ignore inventory.
        return Object.entries(filters).every(([title, selectedValues]) => {
            return product.options.some((option) => {
                return option.title === title && option.values.some((value) => {
                    return selectedValues.includes(value.value);
                });
            });
        });
    }).map((product) => product.title.trim()).sort();
}

function parseProductPrices(priceTexts: string[]): number[] {
    return priceTexts.map((priceText) => {
        const cleanedPrice = priceText.replace(/[^0-9.,]/g, '');
        expect(cleanedPrice, `Missing price in "${priceText}"`).not.toBe('');

        const price = Number(cleanedPrice.replace(/,/g, ''));
        expect(Number.isFinite(price), `Invalid price: "${priceText}"`).toBe(true);

        return price;
    });
}

test.describe('Test products', () => {
    let productListingPage: ProductListingPage;

    test.beforeEach(async ({ page }) => {
        productListingPage = new ProductListingPage(page);
        await page.goto('/store');
    });

    // UI-PRODUCT-01
    test('UI-PRODUCT-01 - Verify product sorting with latest arrivals condition', async ({ request }) => {

        // Get product data from API
        const productsAPI = new ProductsAPI(request);
        const products = await productsAPI.getProducts();

        // Verify Latest Arrivals is selected
        const latestArrivalsOption = productListingPage.sortOption('Latest Arrivals');
        await expect(latestArrivalsOption).toHaveAttribute('data-active', 'true');

        // Get product names from UI
        const productNames = await productListingPage.getAllProductNames();

        // Remove extra spaces from product names
        const actualProductNames = productNames.map((name) => {
            return name.trim();
        });

        // Verify there are enough products to check sorting
        expect(
            actualProductNames.length,
            'At least two products are required to verify sorting'
        ).toBeGreaterThan(1);

        // Get created_at for each product displayed on UI
        const productTimestamps: number[] = [];

        for (const productName of actualProductNames) {

            // Find the matching product in API response
            const product = products.find((item) => {
                return item.title === productName;
            });

            // Verify the product exists in API response
            expect(
                product,
                `Product "${productName}" was not found in API response`
            ).toBeDefined();

            // Convert created_at string into timestamp
            const createdAt = product!.created_at;
            const timestamp = Date.parse(createdAt);

            // Verify the timestamp is valid
            const isInvalidTimestamp = Number.isNaN(timestamp);

            expect(
                isInvalidTimestamp,
                `Invalid created_at for product "${productName}"`
            ).toBe(false);

            // Add timestamp to the array
            productTimestamps.push(timestamp);
        }

        // STEP 5: Verify products are sorted newest first
        for (let i = 0; i < productTimestamps.length - 1; i++) {

            const currentTimestamp = productTimestamps[i];
            const nextTimestamp = productTimestamps[i + 1];

            const currentProductName = actualProductNames[i];
            const nextProductName = actualProductNames[i + 1];

            expect(
                currentTimestamp,
                `Incorrect sorting between "${currentProductName}" and "${nextProductName}"`
            ).toBeGreaterThanOrEqual(nextTimestamp);
        }
    });

    // UI-PRODUCT-02
    test('UI-PRODUCT-02 - Verify products are sorted by Price: Low to High', async({}) => {
        await productListingPage.sortBy('Price: Low -> High');
        await expect(productListingPage.sortOption('Price: Low -> High'))
            .toHaveAttribute('data-active','true');

        // Get product price from UI
        const priceTexts = await productListingPage.getAllProductPrices();

        // Convert prices to numbers
        const productPrices = parseProductPrices(priceTexts);

        // 5. Verify price ascending
        expect(productPrices.length).toBeGreaterThan(1);

        for (let i = 0; i < productPrices.length - 1; i++) {
            const currentPrice = productPrices[i];
            const nextPrice = productPrices[i + 1];

            expect(currentPrice).toBeLessThanOrEqual(nextPrice);
        }


    })

    // UI-PRODUCT-03
    test('UI-PRODUCT-03 - Verify products are sorted by Price: High to Low', async () => {
        await productListingPage.sortBy('Price: High -> Low');
        await expect(productListingPage.sortOption('Price: High -> Low'))
            .toHaveAttribute('data-active', 'true');

        // Get product prices from UI and convert them to numbers
        const priceTexts = await productListingPage.getAllProductPrices();
        const productPrices = parseProductPrices(priceTexts);

        // Verify prices are sorted highest first; equal prices are allowed
        expect(productPrices.length).toBeGreaterThan(1);

        for (let i = 0; i < productPrices.length - 1; i++) {
            const currentPrice = productPrices[i];
            const nextPrice = productPrices[i + 1];

            expect(currentPrice).toBeGreaterThanOrEqual(nextPrice);
        }
    });

    const filteringCases: { id: string; name: string; filters: ProductFilters }[] = [
        {
            id: 'UI-PRODUCT-04',
            name: 'Verify product filtering by a single Color option',
            filters: { Color: ['Red'] },
        },
        {
            id: 'UI-PRODUCT-05',
            name: 'Verify product filtering by multiple Color options',
            filters: { Color: ['Red', 'Blue'] },
        },
        {
            id: 'UI-PRODUCT-06',
            name: 'Verify product filtering by a single Size option',
            filters: { Size: ['L'] },
        },
        {
            id: 'UI-PRODUCT-07',
            name: 'Verify product filtering by multiple Size options',
            filters: { Size: ['S', 'L'] },
        },
        {
            id: 'UI-PRODUCT-08',
            name: 'Verify product filtering by a combination of Color and Size options',
            filters: { Color: ['Red', 'Blue'], Size: ['L'] },
        },
    ];

    for (const { id, name, filters } of filteringCases) {
        test(`${id} - ${name}`, async ({ request, page }) => {
            const products = await new ProductsAPI(request).getProducts();

            // Fail clearly when the catalog no longer contains the test options.
            for (const [title, values] of Object.entries(filters)) {
                for (const value of values) {
                    expect(products.some((product) => product.options.some((option) => {
                        return option.title === title && option.values.some((item) => item.value === value);
                    })), `API catalog must contain ${title} "${value}"`).toBe(true);
                }
            }

            const expectedNames = getExpectedProductNames(products, filters);
            expect(expectedNames.length, 'Test data must include matching products').toBeGreaterThan(0);

            for (const [title, values] of Object.entries(filters)) {
                await productListingPage.filterByOptions(title, values);
            }

            // Verify all selections remain active after combining groups.
            for (const [title, values] of Object.entries(filters)) {
                for (const value of values) {
                    await expect(productListingPage.filterOption(title, value))
                        .toHaveAttribute('aria-pressed', 'true');
                }
            }

            // Compare complete sets, including duplicates, without asserting sort order.
            await expect.poll(async () => {
                const names: string[] = [];
                const pagination = page.getByTestId('product-pagination');
                if (await pagination.isVisible()) {
                    const firstPage = pagination.getByRole('button', { name: '1', exact: true });
                    if (await firstPage.isEnabled()) {
                        await firstPage.click();
                        await expect(firstPage).toBeDisabled();
                    }
                }

                let currentPage = 1;
                while (true) {
                    await expect(page.getByTestId('products-list')).toBeVisible();
                    names.push(...await productListingPage.getAllProductNames());
                    const nextPage = pagination.getByRole('button', {
                        name: String(currentPage + 1), exact: true,
                    });
                    if (!await nextPage.isVisible()) {
                        break;
                    }
                    await nextPage.click();
                    await expect(nextPage).toBeDisabled();
                    currentPage++;
                }

                return names.map((name) => name.trim()).sort();
            }, { message: `${id}: UI products must match API filters ${JSON.stringify(filters)}` })
                .toEqual(expectedNames);
        });
    }
});
