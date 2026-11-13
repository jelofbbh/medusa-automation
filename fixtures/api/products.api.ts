
import { APIRequestContext, expect } from '@playwright/test';

// Define the product data structure
export interface StoreProductOptionValue {
    id: string;
    value: string;
    option_id: string;
}

export interface StoreProductOption {
    id: string;
    title: string;
    values: StoreProductOptionValue[];
}

export interface StoreProduct {
    id: string;
    title: string;
    created_at: string;
    options: StoreProductOption[];
}

export interface StoreProductImage {
    id: string;
    url: string;
}

export interface StoreVariantCalculatedPrice {
    calculated_amount: number;
    original_amount: number;
    currency_code: string;
    is_calculated_price_tax_inclusive: boolean;
}

export interface StoreProductVariant {
    id: string;
    title: string;
    options: StoreProductOptionValue[];
    manage_inventory: boolean;
    allow_backorder: boolean;
    inventory_quantity?: number;
    calculated_price: StoreVariantCalculatedPrice | null;
}

export interface StoreProductDetails extends StoreProduct {
    handle: string;
    description: string | null;
    images: StoreProductImage[];
    variants: StoreProductVariant[];
}

interface StoreProductDetailsResponse {
    product: StoreProductDetails;
}

interface StoreProductsResponse {
    products: StoreProduct[];
    count: number;
    offset: number;
    limit: number;
}

export class ProductsAPI {
    readonly request: APIRequestContext;
    readonly apiUrl: string;
    readonly publishableKey: string;

    constructor(request: APIRequestContext) {
        this.request = request;
        this.apiUrl = process.env.API_URL!;
        this.publishableKey = process.env.PUBLISHABLE_KEY!;
    }

    async getProductById(productId: string): Promise<StoreProductDetails> {
        expect(this.apiUrl, 'API_URL is not configured').toBeTruthy();
        expect(this.publishableKey, 'PUBLISHABLE_KEY is not configured').toBeTruthy();
        expect(productId.trim(), 'Product ID is required').not.toBe('');

        const response = await this.request.get(
            `${this.apiUrl}/store/products/${encodeURIComponent(productId)}`,
            {
                params: {
                    fields: '*variants.calculated_price,*variants.options,+variants.inventory_quantity',
                },
                headers: {
                    'x-publishable-api-key': this.publishableKey,
                },
            }
        );

        expect(response.ok(), `Failed to get product "${productId}": HTTP ${response.status()}`)
            .toBeTruthy();

        const responseBody: StoreProductDetailsResponse = await response.json();
        expect(responseBody.product, 'Missing product in Store API response').toBeDefined();
        expect(responseBody.product.id, 'Store API returned an unexpected product').toBe(productId);

        return responseBody.product;
    }

    async getProducts(): Promise<StoreProduct[]> {
        // 1. Verify environment variables
        expect(this.apiUrl, 'API_URL is not configured').toBeTruthy();
        expect(this.publishableKey, 'PUBLISHABLE_KEY is not configured').toBeTruthy();

        const products: StoreProduct[] = [];
        let offset = 0;
        let count: number;

        // 2. Fetch every page so filtering expectations include all products
        do {
            const response = await this.request.get(
                `${this.apiUrl}/store/products`,
                {
                    params: {
                        order: '-created_at',
                        limit: 100,
                        offset,
                    },
                    headers: {
                        'x-publishable-api-key': this.publishableKey,
                    },
                }
            );

            // 3. Verify API response status and pagination data
            expect(response.ok(), `Failed to get products at offset ${offset}`).toBeTruthy();

            const responseBody: StoreProductsResponse = await response.json();
            expect(Array.isArray(responseBody.products), 'Missing products array').toBe(true);
            expect(Number.isInteger(responseBody.count), 'Invalid product count').toBe(true);
            expect(responseBody.count, 'Product count cannot be negative').toBeGreaterThanOrEqual(0);
            expect(responseBody.offset, 'Unexpected product page offset').toBe(offset);

            count = responseBody.count;
            if (offset < count) {
                expect(responseBody.products.length, `Empty product page at offset ${offset}`)
                    .toBeGreaterThan(0);
            }

            products.push(...responseBody.products);
            offset += responseBody.products.length;
        } while (offset < count);

        // 4. Return the complete product list
        return products;
    }
}
