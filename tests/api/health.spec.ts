import {test, expect} from '@playwright/test'

test('backend health', {tag: ['smoke', 'regression']}, async({request}) => {
    const res = await request.get('/health');
    expect(res.status).toBe(200);
})