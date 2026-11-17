import { randomUUID } from 'node:crypto';

export function createShippingAddress() {
    return {
        first_name: 'Automation',
        last_name: 'Checkout',
        address_1: '10 Test Street',
        company: 'Automation Test',
        postal_code: '2100',
        city: 'Copenhagen',
        country_code: 'dk',
        province: 'Copenhagen',
        phone: '+4512345678',
        email: `checkout-${randomUUID()}@example.com`,
    };
}

export type ShippingAddress = ReturnType<typeof createShippingAddress>;
