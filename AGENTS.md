
# Medusa Automation — Codex Instructions

## Project
- Playwright + TypeScript automation for a Medusa eCommerce application.
- Existing framework uses Page Object Model (POM), reusable components, and custom fixtures.
- Preserve the existing project structure and coding conventions.

## Current Progress
- Account module has been implemented.
- Product Listing module is in progress.
- Current focus: sorting, filtering, and product variant testing.

## Working Rules
- Do not rewrite existing code unless requested.
- Do not create new files without permission.
- Prefer Playwright built-in locators and assertions.
- Avoid hard-coded waits.
- Reuse existing POM methods and fixtures.
- Explain the root cause before fixing test failures.
- Keep changes small and focused.

## Learning Preferences
- Explain concepts.
- Guide implementation step by step.
- Let me attempt the code before providing complete solutions.
- Review my code and explain mistakes.
- Do not implement an entire feature unless explicitly requested.

# Instruction for Verifying products filter
Ok giờ hãy tự code cho các case sau:
1. UI-PRODUCT-04 - Verify product filtering by a single Color option
2. UI-PRODUCT-05 - Verify product filtering by multiple Color options
3. UI-PRODUCT-06 - Verify product filtering by a single Size option
4. UI-PRODUCT-07 - Verify product filtering by multiple Size options
5. UI-PRODUCT-08 - Verify product filtering by a combination of Color and Size options
Yêu cầu:
- Để biết khi chọn các filter thì FE có hiển thị đúng hay không cần so sánh với API get product list. Đây là curl để call và get thông tin: curl --location 'http://localhost:9000/store/products' \
--header 'x-publishable-api-key: pk_12d0e6d0b7d981ad8a2488e70c119106a41cee9efba09b9049a038b413f27375'
Mỗi id sản phẩm sẽ trả ra "title": "Color" -> Dựa vào những fields này để so sánh với FE
- Logic hiện tại trên FE là nếu color out of stock thì không ảnh hưởng đến filtering
- Filter Color và Size nếu combine với nhau thì phải có cùng một variant khớp cả Color và Size, tức mối quan hệ AND

# Instruction for Verifying products detail page
## Task: Implement 3 Product Details Page Automation Test Cases

Implement 3 UI automation test cases for the Medusa eCommerce project using **Playwright + TypeScript + Page Object Model (POM)**.

### 1. Test Cases & Expected Results

**UI-PDP-01 — Verify product information is displayed correctly**

1. Product name and description match the API response.
2. Product images are displayed and loaded successfully.
3. Displayed product images correspond to the images returned by the API.
4. A valid product price is displayed in the correct currency.

**UI-PDP-02 — Verify product variant can be changed**

1. Available product variant options are displayed.
2. The selected option is updated when another option is chosen.
3. The previously selected option is no longer active.
4. The selected options correspond to a valid product variant.

**UI-PDP-03 — Verify product price updates when changing variants**

1. The initial product price matches the selected variant's calculated price from the API.
2. The selected variant is updated when another valid variant is chosen.
3. The displayed price updates to match the newly selected variant's calculated price.
4. The original variant price is displayed when switching back.

### 2. API Integration

Use the existing `ProductsAPI` class in `fixtures/api/products.api.ts`. Extend it with a method to retrieve product details by ID.

API endpoint:

`GET /store/products/{product_id}`

Required header:

`x-publishable-api-key: PUBLISHABLE_KEY`

Request additional fields where supported:

`fields=*variants.calculated_price,*variants.options`


Requirements:
- Retrieve product title, description, images, options, variants and calculated prices.
- Reuse the existing API configuration and environment variables.
- Do not hardcode API keys or expected product prices.
- Confirm the actual API response structure before implementing assertions.
- Handle currency and tax display consistently with the storefront.

### 3. Test Data Strategy

Use a stable product with multiple valid variants, including at least two variants with different prices.

- Do not select a random product without validating its suitability.
- Retrieve expected product information and variant prices dynamically from the API.
- Prefer a dedicated test product with predictable data.
- Ensure the selected variants are available according to the storefront's business rules.
- If no suitable product exists, report the missing test data instead of inventing expected values.

### 4. Page Object Model

Create or update:

- `pages/ProductDetailsPage.ts`
- `tests/ui/product/product-details.spec.ts`
- `fixtures/api/products.api.ts`

Requirements:
- Reuse existing methods, components, fixtures and utilities wherever possible.
- Keep locators and UI actions inside the Page Object.
- Keep test assertions and business validation in the spec file.
- Avoid duplicated locators and unnecessary helper functions.
- Use meaningful method names.
- Keep code readable and beginner-friendly; avoid overly complex or condensed logic.

### 5. Image Validation

For UI-PDP-01:

- Verify product images are visible.
- Verify images have loaded successfully using `complete` and `naturalWidth > 0`.
- Compare displayed image URLs with API image URLs, accounting for image transformations where necessary.
- Scope image locators to the product gallery.

Do not use visual screenshot comparison.

### 6. Variant & Price Validation

For UI-PDP-02:

- Select a different valid variant option.
- Verify the newly selected option becomes active.
- Verify the previous option is no longer active.
- Confirm the selected option combination corresponds to an existing variant.

For UI-PDP-03:

- Retrieve expected prices from the API: use this product: prod_01M6RMERM974JDDS0B09VW2B0J vì t đang set price black = white , khác brown blue
- Select variant A and verify its price.
- Select variant B with a different price and verify the updated price.
- Switch back to variant A and verify its original price.
- Avoid hardcoded price values.

### 7. Test Stability

- Ensure tests are independent and can run in parallel.
- Do not use `waitForTimeout()` or arbitrary fixed delays.
- Use Playwright auto-waiting and appropriate assertions.
- Avoid flaky tests caused by asynchronous UI updates or hydration.
- Do not modify shared product data during test execution.
- Preserve the existing project structure and coding conventions.

### 8. Implementation Process

1. Inspect the existing project structure, POM classes, API helpers and storefront DOM.
2. Inspect the actual Product Detail API response, including calculated prices.
3. Identify suitable test data.
4. Implement the required POM methods and API helpers.
5. Implement the 3 test cases.
6. Run the tests and fix any failures.
7. Summarize the files changed, test results and any remaining limitations.

**Important:** Keep the implementation focused on these 3 test cases. Do not refactor unrelated code or add unnecessary abstractions.