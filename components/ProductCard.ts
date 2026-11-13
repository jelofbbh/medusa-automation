import { Locator, Page } from "@playwright/test";

export class ProductCard {
    readonly page: Page;
    readonly productCard: Locator;
    readonly productThumbnail: Locator;
    readonly productName: Locator;
    readonly productPrice: Locator;

    constructor(page:Page, productName: string){
        this.page = page;
       // Locate a specific product card
       this.productCard = page.getByTestId('product-wrapper')
                            .filter({has: page.getByTestId('product-title')
                            .filter({hasText: productName})})

        this.productThumbnail = this.productCard.getByAltText('Thumbnail', { exact: true });
        this.productName = this.productCard.getByTestId('product-title');
        this.productPrice = this.productCard.getByTestId('price');
    }

    async getProductName(){
        return await this.productName.textContent();

    }
    async getProductPrice(){
        return await this.productPrice.textContent();

    }
    async clickToProduct(){
        await this.productName.click();
    }

}