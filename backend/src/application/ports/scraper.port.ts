import { Product } from "../../domain/entities/product.entity";

export interface ScraperPort {
  searchAliExpress(keyword: string, maxPrice: number): Promise<Product[]>;
  lookupOnAmazon(
    productName: string,
  ): Promise<{ exists: boolean; price: number | null; url: string | null }>;
  lookupOnShopify(
    productName: string,
  ): Promise<{ exists: boolean; price: number | null; url: string | null }>;
  lookupOnWooCommerce(
    productName: string,
  ): Promise<{ exists: boolean; price: number | null; url: string | null }>;
  lookupOnEbay(
    productName: string,
  ): Promise<{ exists: boolean; price: number | null; url: string | null }>;
}
