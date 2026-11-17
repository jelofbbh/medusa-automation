import { randomInt } from 'node:crypto';
import { test, expect, BrowserContext } from '@playwright/test';
import { ProductsAPI, StoreProductDetails, StoreProductVariant } from '../../../fixtures/api/products.api';
import { CartAPI, StoreCart } from '../../../fixtures/api/cart.api';
import { ProductDetailsPage } from '../../../pages/ProductDetailsPage';
import { CartPage } from '../../../pages/CartPage';
import { CheckoutPage } from '../../../pages/CheckoutPage';
import { OrderConfirmationPage } from '../../../pages/OrderConfirmationPage';
import { createShippingAddress, ShippingAddress } from '../../../test-data/shipping-address';
import { AUTH } from '../../../fixtures/auth-paths';
import { AdminOrdersAPI } from '../../../fixtures/api/admin-orders.api';
import { AdminOrderPage } from '../../../pages/AdminOrderPage';
import { AccountOrdersPage } from '../../../pages/AccountOrdersPage';

const productIds = ['prod_01M34Q4C6V3RYC0VBCS0THXTZJ', 'prod_01M34Q4C6VF791TP49AC0G7PKS'];

for (const loggedIn of [false, true]) {
    test.describe(loggedIn ? 'Logged-in checkout' : 'Guest checkout', () => {
        // The storefront-to-Admin lifecycle can include cold Next.js compilation.
        test.setTimeout(150_000);
        if (!loggedIn) test.use({ storageState: { cookies: [], origins: [] } });

        let checkout: CheckoutPage;
        let address: ShippingAddress;
        let cartAPI: CartAPI;
        let cartId: string;
        let customerId: string | null;
        let selectedProducts: { product: StoreProductDetails; variant: StoreProductVariant }[];

        test.beforeEach(async ({ page, context, request }, testInfo) => {
            // Keep customer authentication but never reuse a cart from stored state.
            await context.clearCookies({ name: '_medusa_cart_id' });
            address = createShippingAddress();
            customerId = null;
            if (loggedIn) {
                const token = (await context.cookies()).find((cookie) => cookie.name === '_medusa_jwt');
                expect(token, 'Logged-in checkout requires customer setup authentication').toBeDefined();
                const response = await request.get(`${process.env.API_URL}/store/customers/me`, {
                    headers: {
                        'x-publishable-api-key': process.env.PUBLISHABLE_KEY!,
                        Authorization: `Bearer ${token!.value}`,
                    },
                });
                expect(response.ok(), 'Stored customer session must be valid').toBe(true);
                const { customer } = await response.json();
                customerId = customer.id;
                address.email = customer.email;
            }

            const productsAPI = new ProductsAPI(request);
            const productPage = new ProductDetailsPage(page);
            selectedProducts = [];
            for (const id of productIds) {
                const product = await productsAPI.getProductById(id);
                const availableVariants = product.variants.filter((variant) => {
                    const available = !variant.manage_inventory || variant.allow_backorder
                        || (variant.inventory_quantity ?? 0) > 0;
                    return available && variant.calculated_price
                        && variant.calculated_price.calculated_amount > 0
                        && variant.options.length === product.options.length;
                });
                expect(availableVariants.length, `${product.title} needs an available priced variant`)
                    .toBeGreaterThan(0);
                const variant = availableVariants[randomInt(availableVariants.length)];
                const options: Record<string, string> = {};
                for (const option of product.options) {
                    const value = variant.options.find((value) => value.option_id === option.id);
                    expect(value, `Variant must include ${option.title}`).toBeDefined();
                    options[option.title] = value!.value;
                }
                await productPage.open(product.handle);
                await productPage.selectVariant(options, variant.id);
                await expect(productPage.addToCartButton).toBeEnabled();
                await productPage.addToCart();
                selectedProducts.push({ product, variant });
            }
            await testInfo.attach('selected-variants', {
                body: JSON.stringify(selectedProducts.map(({ product, variant }) => ({
                    product: product.title, variant: variant.title, variantId: variant.id,
                })), null, 2), contentType: 'application/json',
            });

            const cartPage = new CartPage(page);
            await cartPage.open();
            await expect(cartPage.cartItems).toHaveCount(2);
            const cookie = (await context.cookies(page.url())).find((cookie) => cookie.name === '_medusa_cart_id');
            expect(cookie, 'Adding products must create a cart').toBeDefined();
            cartId = cookie!.value;
            cartAPI = new CartAPI(context.request);
            checkout = new CheckoutPage(page);
            await checkout.openFromCart();
        });

        async function prepareCheckout(): Promise<StoreCart> {
            if (loggedIn) await expect(checkout.email).toHaveValue(address.email);
            await checkout.fillShippingAddress(address);
            await expect(checkout.shippingSummary).toContainText(`${address.first_name} ${address.last_name}`);
            await expect(checkout.shippingSummary).toContainText(address.address_1);
            await expect(checkout.contactSummary).toContainText(address.email);
            await checkout.chooseDelivery();
            await checkout.chooseManualPayment();
            await expect(checkout.placeOrderButton).toBeEnabled();
            return cartAPI.getCartById(cartId);
        }

        const informationId = loggedIn ? 'UI-CHECKOUT-03' : 'UI-CHECKOUT-01';
        async function verifyCheckoutInformation(cart: StoreCart, context: BrowserContext) {
            expect(cart.email).toBe(address.email);
            if (loggedIn) {
                expect(cart.customer_id).toBe(customerId);
            } else {
                // Medusa can create a guest customer record when an email is submitted.
                expect((await context.cookies()).some((cookie) => cookie.name === '_medusa_jwt')).toBe(false);
            }
            for (const field of ['first_name', 'last_name', 'address_1', 'postal_code', 'city', 'country_code', 'phone'] as const) {
                expect(cart.shipping_address?.[field], `Shipping ${field}`).toBe(address[field]);
                expect(cart.billing_address?.[field], `Billing ${field}`).toBe(address[field]);
            }
            expect(cart.shipping_methods).toHaveLength(1);
            expect(cart.payment_collection?.payment_sessions.some((session) => {
                return session.provider_id === 'pp_system_default' && session.status === 'pending';
            })).toBe(true);
            expect(cart.items).toHaveLength(2);
            await expect(checkout.items).toHaveCount(2);
            const format = new Intl.NumberFormat('en-US', { style: 'currency', currency: cart.currency_code });
            for (const { product, variant } of selectedProducts) {
                const item = cart.items.find((item) => item.product_id === product.id && item.variant_id === variant.id);
                expect(item, 'Cart must contain the selected product and variant').toBeDefined();
                expect(item!.quantity).toBe(1);
                expect(item!.unit_price).toBeCloseTo(variant.calculated_price!.calculated_amount, 2);
                await expect(checkout.itemName(product.title)).toHaveText(product.title);
                await expect(checkout.itemVariant(product.title)).toHaveText(`Variant: ${variant.title}`);
                await expect(checkout.itemPrice(product.title)).toHaveText(format.format(item!.total));
            }
            await expect(checkout.billingSummary).toContainText('Billing and delivery address are the same.');
            await expect(checkout.subtotal).toHaveText(format.format(cart.item_subtotal));
            await expect(checkout.total).toHaveText(format.format(cart.total));
            expect(cart.total).toBeCloseTo(
                cart.item_subtotal + cart.shipping_subtotal + cart.tax_total - cart.discount_subtotal, 2);
        }

        if (loggedIn) {
            test('UI-CHECKOUT-05 - Verify applying a valid promotion code at checkout', async () => {
                const code = 'Test_percentage';
                const before = await prepareCheckout();
                expect(before.customer_id, 'Cart must belong to the authenticated setup customer').toBe(customerId);
                expect(before.items).toHaveLength(2);
                expect(before.discount_subtotal, 'Test requires an undiscounted cart before applying the code').toBe(0);
                const format = new Intl.NumberFormat('en-US', { style: 'currency', currency: before.currency_code });
                await expect(checkout.total).toHaveText(format.format(before.total));

                await checkout.applyPromotion(code);
                await expect.poll(async () => {
                    const cart = await cartAPI.getCartById(cartId);
                    return cart.promotions.some((promotion) => promotion.code === code)
                        && cart.discount_subtotal > 0;
                }, { message: `${code} must be applied to the checkout cart` }).toBe(true);

                const cart = await cartAPI.getCartById(cartId);
                // The order promotion applies 8% to merchandise before tax, excluding shipping.
                const fractionDigits = format.resolvedOptions().maximumFractionDigits!;
                const precision = 10 ** fractionDigits;
                const expectedDiscount = Math.round(before.item_subtotal * 0.08 * precision) / precision;
                expect(cart.discount_subtotal, 'Order discount must equal 8% of the item subtotal')
                    .toBeCloseTo(expectedDiscount, fractionDigits);
                expect(cart.customer_id).toBe(customerId);
                expect(cart.email).toBe(before.email);
                expect(cart.currency_code).toBe(before.currency_code);
                expect(cart.item_subtotal).toBeCloseTo(before.item_subtotal, fractionDigits);
                expect(cart.shipping_subtotal).toBeCloseTo(before.shipping_subtotal, fractionDigits);
                expect(cart.total).toBeLessThan(before.total);
                expect(cart.total).toBeCloseTo(
                    cart.item_subtotal + cart.shipping_subtotal + cart.tax_total - expectedDiscount,
                    fractionDigits);
                expect(before.total - cart.total).toBeCloseTo(
                    expectedDiscount + before.tax_total - cart.tax_total, fractionDigits);

                expect(cart.items).toHaveLength(2);
                for (const { product, variant } of selectedProducts) {
                    const item = cart.items.find((item) => item.product_id === product.id && item.variant_id === variant.id);
                    const original = before.items.find((item) => item.variant_id === variant.id);
                    expect(item, 'Promotion must retain the selected product/variant').toBeDefined();
                    expect(item!.quantity).toBe(1);
                    expect(item!.unit_price).toBe(original!.unit_price);
                    await expect(checkout.itemVariant(product.title)).toHaveText(`Variant: ${variant.title}`);
                    await expect(checkout.itemPrice(product.title)).toHaveText(format.format(item!.total));
                }
                await expect(checkout.promotionCodes).toContainText([code]);
                await expect(checkout.discount).toHaveAttribute('data-value', String(cart.discount_subtotal));
                await expect(checkout.discount).toContainText(format.format(expectedDiscount));
                await expect(checkout.subtotal).toHaveText(format.format(cart.item_subtotal));
                await expect(checkout.total).toHaveAttribute('data-value', String(cart.total));
                await expect(checkout.total).toHaveText(format.format(cart.total));
            });
        }

        const confirmationId = loggedIn ? 'UI-CHECKOUT-04' : 'UI-CHECKOUT-02';
        test(`${informationId} -> ${confirmationId} -> UI-CHECKOUT-06 -> UI-CHECKOUT-07 -> UI-CHECKOUT-08`,
            async ({ page, context, browser }) => {
                let cart: StoreCart;
                let orderId: string;
                let orderNumber: string;

                await test.step(`${informationId} - Verify checkout information`, async () => {
                    cart = await prepareCheckout();
                    await verifyCheckoutInformation(cart, context);
                });

                await test.step(`${confirmationId} - Verify order confirmation`, async () => {
                    if (loggedIn) {
                        expect(cart!.customer_id).toBe(customerId);
                    } else {
                        expect((await context.cookies()).some((cookie) => cookie.name === '_medusa_jwt')).toBe(false);
                    }
                    await checkout.placeOrder();
                    const confirmation = new OrderConfirmationPage(page);
                    await expect(confirmation.container).toBeVisible();
                    await expect(confirmation.heading).toContainText('Your order was placed successfully.');
                    await expect(confirmation.orderNumber).toHaveText(/\d+/);
                    await expect(confirmation.email).toContainText(address.email);
                    await expect(confirmation.shippingAddress).toContainText(address.address_1);
                    await expect(confirmation.shippingAddress).toContainText(`${address.first_name} ${address.last_name}`);
                    await expect(confirmation.contact).toContainText(address.phone);
                    await expect(confirmation.shippingMethod).toContainText(cart.shipping_methods[0].name);
                    await expect(confirmation.paymentMethod).toContainText('Manual Payment');
                    await expect(confirmation.items).toHaveCount(2);
                    const format = new Intl.NumberFormat('en-US', { style: 'currency', currency: cart!.currency_code });
                    for (const { product, variant } of selectedProducts) {
                        const item = cart.items.find((item) => item.variant_id === variant.id)!;
                        await expect(confirmation.itemName(product.title)).toHaveText(product.title);
                        await expect(confirmation.itemVariant(product.title)).toHaveText(`Variant: ${variant.title}`);
                        await expect(confirmation.itemQuantity(product.title)).toHaveText('1');
                        await expect(confirmation.itemPrice(product.title)).toHaveText(format.format(item.total));
                    }
                    await expect(confirmation.subtotal).toHaveText(format.format(cart.item_subtotal));
                    await expect(confirmation.total).toHaveText(format.format(cart.total));
                    // A reload verifies confirmation persists beyond the initial redirect.
                    orderNumber = await confirmation.orderNumber.innerText();
                    const match = new URL(page.url()).pathname.match(/\/order\/([^/]+)\/confirmed/);
                    expect(match, 'Confirmation URL must contain the created order ID').not.toBeNull();
                    orderId = match![1];
                    test.info().annotations.push({ type: 'created-order', description: orderId });
                    await page.reload({ waitUntil: 'domcontentloaded' });
                    await expect(confirmation.orderNumber).toHaveText(orderNumber);
                    await expect(confirmation.total).toHaveText(format.format(cart.total));
                });

                // Each chain opens Admin independently and uses only the order it just created.
                const adminContext = await browser.newContext({ storageState: AUTH.admin });
                try {
                    const adminPage = new AdminOrderPage(await adminContext.newPage());
                    const adminAPI = new AdminOrdersAPI(adminContext.request);
                    await test.step('UI-CHECKOUT-06 - Verify the placed order in Admin', async () => {
                        await adminPage.open(orderId!);
                        const order = await adminAPI.getOrder(orderId!);
                        expect(String(order.display_id)).toBe(orderNumber!.trim());
                        expect(order.email).toBe(address.email);
                        if (loggedIn) expect(order.customer_id).toBe(customerId);
                        expect(order.currency_code).toBe(cart.currency_code);
                        expect(order.total).toBeCloseTo(cart.total, 2);
                        expect(order.item_subtotal).toBeCloseTo(cart.item_subtotal, 2);
                        expect(order.payment_status).toBe('authorized');
                        expect(order.fulfillment_status).toBe('not_fulfilled');
                        expect(order.items).toHaveLength(2);
                        for (const { product, variant } of selectedProducts) {
                            const item = order.items.find((item) => item.product_id === product.id && item.variant_id === variant.id);
                            expect(item, 'Admin must contain the exact product and variant purchased').toBeDefined();
                            expect(item!.quantity).toBe(1);
                            expect(item!.unit_price).toBeCloseTo(variant.calculated_price!.calculated_amount, 2);
                            await expect(adminPage.text(product.title)).toBeVisible();
                        }
                        for (const field of ['first_name', 'last_name', 'address_1', 'postal_code', 'city', 'country_code', 'phone'] as const) {
                            expect(order.shipping_address?.[field]).toBe(address[field]);
                            expect(order.billing_address?.[field]).toBe(address[field]);
                        }
                        await expect(adminPage.heading).toHaveText(`#${orderNumber!.trim()}`);
                        await expect(adminPage.text(address.email)).toBeVisible();
                        await expect(adminPage.totalRow).toContainText(new Intl.NumberFormat('en-US', {
                            style: 'currency', currency: order.currency_code,
                        }).format(order.total));
                        await expect(adminPage.captureButton).toBeEnabled();
                    });

                    await test.step('UI-CHECKOUT-07 - Capture payment and verify payment status', async () => {
                        await adminPage.capturePayment();
                        await expect.poll(async () => (await adminAPI.getOrder(orderId!)).payment_status)
                            .toBe('captured');
                        const order = await adminAPI.getOrder(orderId!);
                        const capturedTotal = order.payment_collections.reduce((sum, collection) => sum + collection.captured_amount, 0);
                        expect(capturedTotal).toBeCloseTo(cart.total, 2);
                        const payments = order.payment_collections.flatMap((collection) => collection.payments);
                        expect(payments).toHaveLength(1);
                        expect(payments[0].captured_at).toBeTruthy();
                        expect(payments[0].captures.reduce((sum, capture) => sum + capture.amount, 0)).toBeCloseTo(cart.total, 2);
                        await expect(adminPage.capturedStatus).toBeVisible();
                        if (loggedIn) {
                            await test.step('Verify Captured status via Account -> Recent orders', async () => {
                                const accountOrders = new AccountOrdersPage(page);
                                await accountOrders.openAccount();
                                await expect(accountOrders.recentOrder(orderId!)).toBeVisible();
                                await accountOrders.openRecentOrder(orderId!);
                                await expect(accountOrders.orderNumber).toHaveText(orderNumber!);
                                // Keep the failure, but continue to collect the fulfillment UI result too.
                                await expect.soft(accountOrders.paymentStatus).toHaveText('Captured');
                                await expect(accountOrders.orderStatus).toHaveText('Not fulfilled');
                            });
                        }
                    });

                    await test.step('UI-CHECKOUT-08 - Fulfill the order and verify fulfillment status', async () => {
                        await adminPage.fulfillOrder(cart.shipping_methods[0].name);
                        await expect.poll(async () => (await adminAPI.getOrder(orderId!)).fulfillment_status)
                            .toBe('fulfilled');
                        const order = await adminAPI.getOrder(orderId!);
                        expect(order.payment_status).toBe('captured');
                        expect(order.fulfillments.filter((fulfillment) => !fulfillment.canceled_at)).toHaveLength(1);
                        for (const item of order.items) {
                            expect(item.detail.fulfilled_quantity).toBe(item.quantity);
                        }
                        await expect(adminPage.fulfilledStatus).toBeVisible();
                        await expect(adminPage.fulfillmentHeading).toBeVisible();
                        if (loggedIn) {
                            await test.step('Verify Fulfilled and Captured via Account -> Recent orders', async () => {
                                const accountOrders = new AccountOrdersPage(page);
                                await accountOrders.openAccount();
                                await expect(accountOrders.recentOrder(orderId!)).toBeVisible();
                                await accountOrders.openRecentOrder(orderId!);
                                await expect(accountOrders.orderNumber).toHaveText(orderNumber!);
                                await expect.soft(accountOrders.orderStatus).toHaveText('Fulfilled');
                                await expect.soft(accountOrders.paymentStatus).toHaveText('Captured');
                            });
                        }
                    });
                } finally {
                    await adminContext.close();
                }
            });
    });
}
