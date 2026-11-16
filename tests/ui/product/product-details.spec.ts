import { test, expect } from '@playwright/test';
import { ProductsAPI } from '../../../fixtures/api/products.api';
import { ProductDetailsPage } from '../../../pages/ProductDetailsPage';
import { CartAPI } from '../../../fixtures/api/cart.api';
import { CartPage } from '../../../pages/CartPage';

test.describe('Product details', () => {
    test('UI-PDP-01 - Verify product information is displayed correctly', async ({ page, request }) => {
        const productsAPI = new ProductsAPI(request);
        const product = await productsAPI.getProductById('prod_01M34Q4C6VF791TP49AC0G7PKS');
        const productDetailsPage = new ProductDetailsPage(page);

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

        // Resolve known option combinations against API data
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
    test.describe('Add to Cart with an isolated cart', () => {
        // Start without shared authentication/cart cookies so quantity cannot accumulate.
        test.use({ storageState: { cookies: [], origins: [] } });

        test('UI-PDP-05 - Add to Cart is disabled when required variant options are not selected',
            async ({ page, request, context }) => {
                const product = await new ProductsAPI(request)
                    .getProductById('prod_01M6RMERM974JDDS0B09VW2B0J');
                const productDetailsPage = new ProductDetailsPage(page);
                expect(product.options.map((option) => option.title).sort())
                    .toEqual(['Color', 'Size']);
                expect(product.variants.length, 'Product must require manual variant selection')
                    .toBeGreaterThan(1);

                const scenarios = [
                    { name: 'No options selected', selection: null },
                    { name: 'Only Color selected', selection: { title: 'Color', value: 'Black' } },
                    { name: 'Only Size selected', selection: { title: 'Size', value: 'M' } },
                ];

                for (const scenario of scenarios) {
                    await test.step(scenario.name, async () => {
                        // A fresh document resets local option state without sharing a cart.
                        await productDetailsPage.open(product.handle);
                        for (const option of product.options) {
                            await expect(productDetailsPage.optionGroup(option.title)).toBeVisible();
                            await expect(productDetailsPage.selectedOption(option.title)).toHaveCount(0);
                        }
                        // Enabled option buttons distinguish the interactive UI from its disabled fallback.
                        await expect(productDetailsPage.optionButton('Color', 'Black')).toBeEnabled();
                        await expect(productDetailsPage.optionButton('Size', 'M')).toBeEnabled();

                        if (scenario.selection) {
                            const { title, value } = scenario.selection;
                            await productDetailsPage.selectOption(title, value);
                        }

                        for (const option of product.options) {
                            if (option.title === scenario.selection?.title) {
                                await expect(productDetailsPage.selectedOption(option.title))
                                    .toHaveText(scenario.selection.value);
                            } else {
                                await expect(productDetailsPage.selectedOption(option.title)).toHaveCount(0);
                            }
                        }

                        await expect(productDetailsPage.addToCartButton).toBeVisible();
                        await expect(productDetailsPage.addToCartButton).toBeDisabled();
                        await expect(productDetailsPage.addToCartButton).toHaveText('Select variant');
                        await expect(page).toHaveURL((url) => !url.searchParams.has('v_id'));
                        const cookies = await context.cookies(page.url());
                        expect(cookies.some((cookie) => cookie.name === '_medusa_cart_id'),
                            'Incomplete options must not create a cart').toBe(false);
                    });
                }
            });

        test('UI-PDP-06 - Verify Add to Cart is disabled for out-of-stock variants',
            async ({ page, request, context }) => {
                const product = await new ProductsAPI(request)
                    .getProductById('prod_01M6RMERM974JDDS0B09VW2B0J');
                const productDetailsPage = new ProductDetailsPage(page);
                expect(product.options.map((option) => option.title).sort())
                    .toEqual(['Color', 'Size']);

                for (const color of ['Brown', 'Blue']) {
                    await test.step(`Out-of-stock ${color}/S`, async () => {
                        const selection: Record<string, string> = { Color: color, Size: 'S' };
                        const variant = product.variants.find((item) => {
                            return item.options.length === product.options.length
                                && product.options.every((option) => {
                                    return item.options.some((value) => {
                                        return value.option_id === option.id
                                            && value.value === selection[option.title];
                                    });
                                });
                        });
                        expect(variant, `Missing test variant ${color}/S`).toBeDefined();
                        // Zero inventory only prevents purchase when inventory is managed and backorders are off.
                        expect(variant!.manage_inventory, `${color}/S must manage inventory`).toBe(true);
                        expect(variant!.allow_backorder, `${color}/S must disallow backorders`).toBe(false);
                        expect(typeof variant!.inventory_quantity, 'Inventory quantity must be returned by API')
                            .toBe('number');
                        expect(variant!.inventory_quantity!, `${color}/S must be out of stock`)
                            .toBeLessThanOrEqual(0);

                        await productDetailsPage.open(product.handle);
                        await productDetailsPage.selectVariant(selection, variant!.id);
                        await expect(productDetailsPage.selectedOption('Color')).toHaveText(color);
                        await expect(productDetailsPage.selectedOption('Size')).toHaveText('S');
                        await expect(page).toHaveURL((url) => url.searchParams.get('v_id') === variant!.id);
                        await expect(productDetailsPage.addToCartButton).toBeVisible();
                        await expect(productDetailsPage.addToCartButton).toHaveText('Out of stock');
                        await expect(productDetailsPage.addToCartButton).toBeDisabled();

                        const cookies = await context.cookies(page.url());
                        expect(cookies.some((cookie) => cookie.name === '_medusa_cart_id'),
                            'Selecting an out-of-stock variant must not create a cart').toBe(false);
                    });
                }
            });

        test('UI-PDP-04 - Add to Cart with a valid product variant', async ({ page, request, context }) => {
            const product = await new ProductsAPI(request)
                .getProductById('prod_01M34Q4C6V3RYC0VBCS0THXTZJ');
            const sizeOption = product.options.find((option) => option.title === 'Size');
            expect(sizeOption, 'Shorts must have a Size option').toBeDefined();
            const variant = product.variants.find((item) => {
                return item.options.length === 1 && item.options.some((value) => {
                    return value.option_id === sizeOption!.id && value.value === 'M';
                });
            });
            expect(variant, 'Shorts must have a size M variant').toBeDefined();
            const isAvailable = !variant!.manage_inventory || variant!.allow_backorder
                || (variant!.inventory_quantity ?? 0) > 0;
            expect(isAvailable, 'Shorts/M must be available').toBe(true);
            expect(variant!.calculated_price, 'Variant must have a calculated price').toBeTruthy();
            const price = variant!.calculated_price!;
            expect(Number.isFinite(price.calculated_amount)).toBe(true);
            expect(price.calculated_amount).toBeGreaterThan(0);

            const productDetailsPage = new ProductDetailsPage(page);
            const cartPage = new CartPage(page);
            await productDetailsPage.open(product.handle);
            await productDetailsPage.selectVariant({ Size: 'M' }, variant!.id);
            await expect(productDetailsPage.selectedOption('Size')).toHaveText('M');
            await expect(productDetailsPage.addToCartButton).toBeEnabled();
            await productDetailsPage.addToCart();
            await cartPage.open();

            // Confirm persistence and exact product/variant IDs through the cart created by UI.
            const cookies = await context.cookies(page.url());
            const cartCookie = cookies.find((cookie) => cookie.name === '_medusa_cart_id');
            expect(cartCookie, 'Adding a product must create a cart cookie').toBeDefined();
            const cart = await new CartAPI(context.request).getCartById(cartCookie!.value);
            expect(cart.items, 'A single click must add exactly one item to the new cart').toHaveLength(1);
            const item = cart.items[0];
            expect(item.product_id).toBe(product.id);
            expect(item.variant_id).toBe(variant!.id);
            expect(item.quantity).toBe(1);
            expect(cart.currency_code).toBe(price.currency_code);
            expect(item.unit_price).toBeCloseTo(price.calculated_amount, 2);
            expect(item.is_tax_inclusive).toBe(price.is_calculated_price_tax_inclusive);
            expect(item.total).toBeCloseTo(item.subtotal + item.tax_total, 2);
            const expectedBaseTotal = item.unit_price * item.quantity;
            const expectedTotal = item.is_tax_inclusive
                ? expectedBaseTotal : expectedBaseTotal + item.tax_total;
            expect(item.total).toBeCloseTo(expectedTotal, 2);

            await expect(cartPage.cartItems).toHaveCount(1);
            await expect(cartPage.getItem(product.title, variant!.title)).toBeVisible();
            await expect(cartPage.itemName(product.title, variant!.title)).toHaveText(product.title);
            await expect(cartPage.itemVariant(product.title, variant!.title))
                .toHaveText(`Variant: ${variant!.title}`);
            await expect(cartPage.itemQuantity(product.title, variant!.title)).toHaveValue('1');

            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency', currency: cart.currency_code,
            });
            // Cart unit price includes tax: the storefront renders item.total / quantity.
            await expect(cartPage.itemUnitPrice(product.title, variant!.title))
                .toHaveText(formatter.format(item.total / item.quantity));
            await expect(cartPage.itemTotalPrice(product.title, variant!.title))
                .toHaveText(formatter.format(item.total));
        });
    });
});
