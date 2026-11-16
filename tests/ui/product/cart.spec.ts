import { test, expect } from '@playwright/test';
import { ProductsAPI, StoreProductDetails, StoreProductVariant } from '../../../fixtures/api/products.api';
import { CartAPI, StoreCart } from '../../../fixtures/api/cart.api';
import { ProductDetailsPage } from '../../../pages/ProductDetailsPage';
import { CartPage } from '../../../pages/CartPage';

async function expectCartTotals(cartPage: CartPage, cart: StoreCart) {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency', currency: cart.currency_code,
    });
    await expect(cartPage.subtotal).toHaveAttribute('data-value', String(cart.item_subtotal));
    await expect(cartPage.subtotal).toHaveText(formatter.format(cart.item_subtotal));
    await expect(cartPage.total).toHaveAttribute('data-value', String(cart.total));
    await expect(cartPage.total).toHaveText(formatter.format(cart.total));
    expect(cart.total).toBeCloseTo(
        cart.item_subtotal + cart.shipping_subtotal + cart.tax_total - cart.discount_subtotal, 2
    );
}

test.describe('Cart page', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    let product: StoreProductDetails;
    let variant: StoreProductVariant;
    let cartPage: CartPage;
    let cartAPI: CartAPI;
    let cartId: string;

    test.beforeEach(async ({ page, request, context }) => {
        product = await new ProductsAPI(request).getProductById('prod_01M6RMERM974JDDS0B09VW2B0J');
        const selection: Record<string, string> = { Color: 'Black', Size: 'M' };
        expect(product.options.map((option) => option.title).sort()).toEqual(['Color', 'Size']);
        const matchingVariant = product.variants.find((item) => {
            return item.options.length === product.options.length && product.options.every((option) => {
                return item.options.some((value) => {
                    return value.option_id === option.id && value.value === selection[option.title];
                });
            });
        });
        expect(matchingVariant, 'Parka must have a Black/M variant').toBeDefined();
        variant = matchingVariant!;
        expect(!variant.manage_inventory || variant.allow_backorder || (variant.inventory_quantity ?? 0) >= 3,
            'Black/M must allow quantity 3').toBe(true);
        expect(variant.calculated_price, 'Variant must have an API price').toBeTruthy();

        const productPage = new ProductDetailsPage(page);
        cartPage = new CartPage(page);
        cartAPI = new CartAPI(context.request);
        await productPage.open(product.handle);
        await productPage.selectVariant(selection, variant.id);
        await productPage.addToCart();
        await cartPage.open();
        await expect(cartPage.cartItems).toHaveCount(1);
        const cookie = (await context.cookies(page.url())).find((item) => item.name === '_medusa_cart_id');
        expect(cookie, 'UI must create an isolated cart').toBeDefined();
        cartId = cookie!.value;
    });

    test('UI-CART-01 - Verify product information in cart page', async () => {
        const cart = await cartAPI.getCartById(cartId);
        expect(cart.items).toHaveLength(1);
        const item = cart.items[0];
        expect(item.product_id).toBe(product.id);
        expect(item.variant_id).toBe(variant.id);
        expect(item.quantity).toBe(1);
        expect(item.unit_price).toBeCloseTo(variant.calculated_price!.calculated_amount, 2);
        expect(cart.currency_code).toBe(variant.calculated_price!.currency_code);
        await expect(cartPage.itemName(product.title, variant.title)).toHaveText(product.title);
        await expect(cartPage.itemVariant(product.title, variant.title)).toHaveText(`Variant: ${variant.title}`);
        await expect(cartPage.itemQuantity(product.title, variant.title)).toHaveValue('1');
        const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: cart.currency_code });
        await expect(cartPage.itemUnitPrice(product.title, variant.title))
            .toHaveText(formatter.format(item.total / item.quantity));
        await expect(cartPage.itemTotalPrice(product.title, variant.title))
            .toHaveText(formatter.format(item.total));
        await expectCartTotals(cartPage, cart);
    });

    test('UI-CART-02 - Verify updating product quantity', async () => {
        const initialCart = await cartAPI.getCartById(cartId);
        expect(initialCart.items).toHaveLength(1);
        expect(initialCart.items[0].quantity).toBe(1);
        await expectCartTotals(cartPage, initialCart);

        // Exercise both increasing and decreasing the quantity.
        for (const quantity of [3, 2]) {
            await test.step(`Update quantity to ${quantity}`, async () => {
                await cartPage.updateQuantity(product.title, variant.title, quantity);
                await expect.poll(async () => {
                    const cart = await cartAPI.getCartById(cartId);
                    return cart.items[0]?.quantity;
                }).toBe(quantity);
                const cart = await cartAPI.getCartById(cartId);
                expect(cart.items).toHaveLength(1);
                const item = cart.items[0];
                expect(item.product_id).toBe(product.id);
                expect(item.variant_id).toBe(variant.id);
                expect(item.unit_price).toBe(initialCart.items[0].unit_price);
                expect(cart.discount_subtotal, 'Quantity check expects no automatic discounts').toBe(0);
                expect(cart.item_subtotal).toBeCloseTo(initialCart.item_subtotal * quantity, 2);
                expect(cart.total).toBeCloseTo(initialCart.total * quantity, 2);
                await expect(cartPage.itemQuantity(product.title, variant.title)).toHaveValue(String(quantity));
                const formatter = new Intl.NumberFormat('en-US', {
                    style: 'currency', currency: cart.currency_code,
                });
                await expect(cartPage.itemTotalPrice(product.title, variant.title))
                    .toHaveText(formatter.format(item.total));
                await expectCartTotals(cartPage, cart);
            });
        }

        await test.step('Apply TEST promotion and verify the discounted total', async () => {
            const beforePromotion = await cartAPI.getCartById(cartId);
            await cartPage.applyPromotion('TEST');
            await expect.poll(async () => {
                const cart = await cartAPI.getCartById(cartId);
                return cart.promotions.some((promotion) => promotion.code === 'TEST')
                    && cart.discount_subtotal > 0;
            }, { message: 'TEST must be applied and reduce the EUR cart total' }).toBe(true);

            const cart = await cartAPI.getCartById(cartId);
            expect(cart.items).toHaveLength(1);
            expect(cart.items[0].quantity).toBe(2);
            expect(cart.items[0].variant_id).toBe(variant.id);
            expect(cart.item_subtotal).toBeCloseTo(beforePromotion.item_subtotal, 2);
            expect(cart.discount_subtotal).toBeGreaterThan(0);
            expect(cart.total).toBeLessThan(beforePromotion.total);
            expect(beforePromotion.total - cart.total).toBeCloseTo(
                cart.discount_subtotal - beforePromotion.discount_subtotal
                    + beforePromotion.tax_total - cart.tax_total, 2
            );
            await expect(cartPage.promotionCodes).toContainText(['TEST']);
            await expect(cartPage.discount).toHaveAttribute('data-value', String(cart.discount_subtotal));
            await expect(cartPage.itemQuantity(product.title, variant.title)).toHaveValue('2');
            const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: cart.currency_code });
            await expect(cartPage.itemTotalPrice(product.title, variant.title))
                .toHaveText(formatter.format(cart.items[0].total));
            await expectCartTotals(cartPage, cart);
        });
    });
});
