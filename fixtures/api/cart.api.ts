import { APIRequestContext, expect } from '@playwright/test';
import type { ShippingAddress } from '../../test-data/shipping-address';

export interface StoreCartItem {
    id: string;
    product_id: string;
    variant_id: string;
    product_title: string;
    variant_title: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    tax_total: number;
    total: number;
    is_tax_inclusive: boolean;
}

export interface StoreCart {
    id: string;
    currency_code: string;
    items: StoreCartItem[];
    item_subtotal: number;
    shipping_subtotal: number;
    discount_subtotal: number;
    tax_total: number;
    total: number;
    promotions: { id: string; code: string }[];
    email: string;
    customer_id: string | null;
    shipping_address: Omit<ShippingAddress, 'email'> | null;
    billing_address: Omit<ShippingAddress, 'email'> | null;
    shipping_methods: { name: string; shipping_option_id: string; amount: number }[];
    payment_collection: {
        payment_sessions: { provider_id: string; status: string }[];
    } | null;
}

interface StoreCartResponse {
    cart: StoreCart;
}

export class CartAPI {
    readonly request: APIRequestContext;
    readonly apiUrl: string;
    readonly publishableKey: string;

    constructor(request: APIRequestContext) {
        this.request = request;
        this.apiUrl = process.env.API_URL!;
        this.publishableKey = process.env.PUBLISHABLE_KEY!;
    }

    async getCartById(cartId: string): Promise<StoreCart> {
        expect(this.apiUrl, 'API_URL is not configured').toBeTruthy();
        expect(this.publishableKey, 'PUBLISHABLE_KEY is not configured').toBeTruthy();
        expect(cartId.trim(), 'Cart ID is required').not.toBe('');

        const response = await this.request.get(
            `${this.apiUrl}/store/carts/${encodeURIComponent(cartId)}`,
            {
                params: {
                    fields: '*items,+items.total,+items.subtotal,+items.tax_total,*promotions,*shipping_address,*billing_address,*shipping_methods,*payment_collection.payment_sessions',
                },
                headers: {
                    'x-publishable-api-key': this.publishableKey,
                },
            }
        );

        expect(response.ok(), `Failed to get cart "${cartId}": HTTP ${response.status()}`)
            .toBeTruthy();

        const responseBody: StoreCartResponse = await response.json();
        expect(responseBody.cart, 'Missing cart in Store API response').toBeDefined();
        expect(responseBody.cart.id, 'Store API returned an unexpected cart').toBe(cartId);
        expect(Array.isArray(responseBody.cart.items), 'Missing cart items array').toBe(true);

        return responseBody.cart;
    }
}
