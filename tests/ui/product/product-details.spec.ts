import { test, expect } from '@playwright/test';
import { ProductsAPI } from '../../../fixtures/api/products.api';
import { ProductDetailsPage } from '../../../pages/ProductDetailsPage';

test.describe('Product details', () => {
    test('UI-PDP-01 - Verify product information is displayed correctly', async ({ page, request }) => {
        const productsAPI = new ProductsAPI(request);
        const product = await productsAPI.getProductById('prod_01M34Q4C6VF791TP49AC0G7PKS');
        const productDetailsPage = new ProductDetailsPage(page);

        // This case needs a description and gallery images to verify real content.
        expect(product.description, 'Test product must have a description').toBeTruthy();
        expect(product.images.length, 'Test product must have gallery images').toBeGreaterThan(0);

        await productDetailsPage.open(product.handle);
        await expect(productDetailsPage.productName).toBeVisible();
        await expect(productDetailsPage.productName).toHaveText(product.title);
        await expect(productDetailsPage.productDescription).toBeVisible();
        await expect(productDetailsPage.productDescription).toHaveText(product.description!);

        await expect(productDetailsPage.productGallery).toHaveCount(1);
        await expect(productDetailsPage.productImages).toHaveCount(product.images.length);

        for (let index = 0; index < product.images.length; index++) {
            const image = productDetailsPage.productImages.nth(index);
            await image.scrollIntoViewIfNeeded();
            await expect(image).toBeVisible();
            await expect.poll(async () => {
                return image.evaluate((element: HTMLImageElement) => {
                    return element.complete && element.naturalWidth > 0;
                });
            }, { message: `Gallery image ${index + 1} must load successfully` }).toBe(true);
        }

        // Next.js may wrap the original image URL in /_next/image?url=... .
        const displayedImageUrls = await productDetailsPage.productImages.evaluateAll((images) => {
            return images.map((element) => {
                const image = element as HTMLImageElement;
                const displayedUrl = new URL(image.currentSrc || image.src);
                const originalUrl = displayedUrl.pathname === '/_next/image'
                    ? displayedUrl.searchParams.get('url')
                    : null;

                return new URL(originalUrl || displayedUrl.href, document.baseURI).href;
            });
        });
        const expectedImageUrls = product.images.map((image) => new URL(image.url).href);
        expect(displayedImageUrls.sort(), 'Gallery images must match API images')
            .toEqual(expectedImageUrls.sort());

        // Before a variant is selected, the storefront displays the cheapest variant price.
        const prices = product.variants.map((variant) => variant.calculated_price)
            .filter((price) => price !== null);
        expect(prices.length, 'Test product must have calculated prices').toBeGreaterThan(0);
        const cheapestPrice = prices.reduce((cheapest, price) => {
            return price.calculated_amount < cheapest.calculated_amount ? price : cheapest;
        });
        expect(Number.isFinite(cheapestPrice.calculated_amount)).toBe(true);
        expect(cheapestPrice.calculated_amount).toBeGreaterThan(0);

        const expectedPriceText = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: cheapestPrice.currency_code,
        }).format(cheapestPrice.calculated_amount);

        await expect(productDetailsPage.productPrice).toBeVisible();
        await expect(productDetailsPage.productPrice)
            .toHaveAttribute('data-value', String(cheapestPrice.calculated_amount));
        await expect(productDetailsPage.productPrice).toHaveText(expectedPriceText);
    });

    test('UI-PDP-02 - Verify product variant can be changed', async ({ page, request }) => {
        const product = await new ProductsAPI(request)
            .getProductById('prod_01M6RMERM974JDDS0B09VW2B0J');
        const productDetailsPage = new ProductDetailsPage(page);
        const colorOption = product.options.find((option) => option.title === 'Color');
        const sizeOption = product.options.find((option) => option.title === 'Size');
        expect(colorOption, 'Test product must have a Color option').toBeDefined();
        expect(sizeOption, 'Test product must have a Size option').toBeDefined();

        const variants = ['Black', 'Blue'].map((color) => {
            const variant = product.variants.find((item) => {
                return item.options.length === product.options.length
                    && item.options.some((value) => {
                        return value.option_id === colorOption!.id && value.value === color;
                    })
                    && item.options.some((value) => {
                        return value.option_id === sizeOption!.id && value.value === 'M';
                    });
            });
            expect(variant, `Test product must have a ${color}/M variant`).toBeDefined();
            return variant!;
        });

        for (const variant of variants) {
            const isAvailable = !variant.manage_inventory || variant.allow_backorder
                || (variant.inventory_quantity ?? 0) > 0;
            expect(isAvailable, `Variant "${variant.title}" must be available`).toBe(true);
        }

        await productDetailsPage.open(product.handle);

        for (const option of product.options) {
            await expect(productDetailsPage.optionGroup(option.title)).toBeVisible();
            for (const value of option.values) {
                await expect(productDetailsPage.optionButton(option.title, value.value)).toBeVisible();
            }
        }

        for (const variant of variants) {
            const options: Record<string, string> = {};
            for (const option of product.options) {
                const value = variant.options.find((item) => item.option_id === option.id);
                expect(value, `Variant "${variant.title}" must have ${option.title}`).toBeDefined();
                options[option.title] = value!.value;
            }

            await productDetailsPage.selectVariant(options, variant.id);

            // Read the actual active combination and match it to an existing API variant.
            const selectedValues: Record<string, string> = {};
            for (const option of product.options) {
                const selectedOption = productDetailsPage.selectedOption(option.title);
                await expect(selectedOption).toHaveCount(1);
                await expect(selectedOption).toHaveText(options[option.title]);
                selectedValues[option.id] = (await selectedOption.innerText()).trim();
            }

            const matchingVariant = product.variants.find((item) => {
                return item.options.length === product.options.length
                    && item.options.every((value) => selectedValues[value.option_id] === value.value);
            });
            expect(matchingVariant?.id, 'Active options must match the intended API variant')
                .toBe(variant.id);
            await expect(page).toHaveURL((url) => url.searchParams.get('v_id') === variant.id);
            await expect(productDetailsPage.addToCartButton).toBeEnabled();
        }

        await expect(productDetailsPage.optionButton('Color', 'Black')
            .and(productDetailsPage.selectedOption('Color'))).toHaveCount(0);
        await expect(productDetailsPage.selectedOption('Color')).toHaveText('Blue');
    });

    test('UI-PDP-03 - Verify product price updates when changing variants', async ({ page, request }) => {
        const product = await new ProductsAPI(request)
            .getProductById('prod_01M6RMERM974JDDS0B09VW2B0J');
        const productDetailsPage = new ProductDetailsPage(page);
        const selections = [
            { Color: 'Black', Size: 'M' },
            { Color: 'Blue', Size: 'M' },
        ];

        // Resolve known option combinations against API data; never hardcode prices.
        const variants = selections.map((selection) => {
            const variant = product.variants.find((item) => {
                return item.options.length === product.options.length
                    && Object.entries(selection).every(([title, value]) => {
                        const option = product.options.find((item) => item.title === title);
                        return option && item.options.some((item) => {
                            return item.option_id === option.id && item.value === value;
                        });
                    });
            });
            expect(variant, `Missing test variant ${JSON.stringify(selection)}`).toBeDefined();
            return variant!;
        });

        for (const variant of variants) {
            const isAvailable = !variant.manage_inventory || variant.allow_backorder
                || (variant.inventory_quantity ?? 0) > 0;
            expect(isAvailable, `Variant "${variant.title}" must be available`).toBe(true);
            expect(variant.calculated_price, `Missing calculated price for "${variant.title}"`)
                .toBeTruthy();
            expect(Number.isFinite(variant.calculated_price!.calculated_amount)).toBe(true);
            expect(variant.calculated_price!.calculated_amount).toBeGreaterThan(0);
        }

        expect(variants[0].calculated_price!.currency_code)
            .toBe(variants[1].calculated_price!.currency_code);
        expect(variants[0].calculated_price!.calculated_amount,
            'Test variants must have different prices')
            .not.toBe(variants[1].calculated_price!.calculated_amount);

        await productDetailsPage.open(product.handle);

        // A -> B -> A verifies both the update and restoration of the original price.
        for (const index of [0, 1, 0]) {
            const variant = variants[index];
            const price = variant.calculated_price!;

            await test.step(`Select ${variant.title} and verify its API price`, async () => {
                await productDetailsPage.selectVariant(selections[index], variant.id);
                await expect(page).toHaveURL((url) => url.searchParams.get('v_id') === variant.id);
                for (const [title, value] of Object.entries(selections[index])) {
                    await expect(productDetailsPage.selectedOption(title)).toHaveText(value);
                }
                await expect(productDetailsPage.addToCartButton).toBeEnabled();

                const expectedPriceText = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: price.currency_code,
                }).format(price.calculated_amount);

                await expect(productDetailsPage.productPrice).toBeVisible();
                await expect(productDetailsPage.productPrice)
                    .toHaveAttribute('data-value', String(price.calculated_amount));
                await expect(productDetailsPage.productPrice).toHaveText(expectedPriceText);
            });
        }
    });
});
