import { APIRequestContext, expect } from '@playwright/test';
import type { StoreCartItem, StoreCart } from './cart.api';

export interface AdminOrder {
    id: string;
    display_id: number;
    email: string;
    customer_id: string;
    currency_code: string;
    total: number;
    item_subtotal: number;
    payment_status: string;
    fulfillment_status: string;
    shipping_address: StoreCart['shipping_address'];
    billing_address: StoreCart['billing_address'];
    items: (StoreCartItem & { detail: { fulfilled_quantity: number } })[];
    payment_collections: {
        captured_amount: number;
        payments: { id: string; captured_at: string | null; captures: { amount: number }[] }[];
    }[];
    fulfillments: {
        id: string;
        canceled_at: string | null;
        items: { line_item_id: string; quantity: number }[];
    }[];
}

export class AdminOrdersAPI {
    constructor(readonly request: APIRequestContext) {}

    async getOrder(orderId: string): Promise<AdminOrder> {
        const response = await this.request.get(`${process.env.API_URL}/admin/orders/${encodeURIComponent(orderId)}`, {
            params: {
                fields: '*items,*shipping_address,*billing_address,*payment_collections.payments.captures,*fulfillments.items,+email,+customer_id,+currency_code',
            },
        });
        expect(response.ok(), `Failed to retrieve Admin order ${orderId}: HTTP ${response.status()}`).toBe(true);
        const { order } = await response.json();
        expect(order?.id).toBe(orderId);
        return order;
    }
}
