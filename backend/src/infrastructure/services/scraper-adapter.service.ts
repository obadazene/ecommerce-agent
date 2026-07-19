import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ScraperPort } from "../../application/ports/scraper.port";
import { Product } from "../../domain/entities/product.entity";

type AliExpressSearchResponse = {
  items?: Array<{ title?: string; url?: string }>;
};

@Injectable()
export class ScraperAdapterService implements ScraperPort {
  private readonly logger = new Logger(ScraperAdapterService.name);
  private readonly scraperUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.scraperUrl = this.configService.get<string>(
      "SCRAPER_URL",
      "http://localhost:5001",
    );
  }

  private getSafePriceLimit(value: number, fallback: number): number {
    return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
  }

  async searchAliExpress(
    keyword: string,
    maxPrice: number,
  ): Promise<Product[]> {
    const safeMaxPrice =
      typeof maxPrice === "number" && !isNaN(maxPrice) ? maxPrice : 20;

    this.logger.debug(
      `Searching AliExpress for keyword: ${keyword}, maxPrice: ${safeMaxPrice}`,
    );

    try {
      const response = await fetch(`${this.scraperUrl}/search/aliexpress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: keyword }),
      });

      const keywordQuery = encodeURIComponent(keyword);
      const fallbackUrl = `https://www.aliexpress.com/wholesale?SearchText=${keywordQuery}`;

      if (!response.ok) {
        throw new Error(`Scraper returned status ${response.status}`);
      }

      const payload = (await response.json()) as AliExpressSearchResponse;
      const items = (payload.items ?? []).filter((item) => !!item.url);

      const products = items.slice(0, 12).map((item, index) => {
        const itemUrl = item.url || fallbackUrl;
        const productIdMatch = itemUrl.match(/\/item\/(\d+)\.html/i);
        const titleSlug = (item.title || `${keyword}-result-${index + 1}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40);
        const productId = productIdMatch
          ? `aliexpress-${productIdMatch[1]}`
          : `aliexpress-${titleSlug || `result-${index + 1}`}`;

        return new Product(
          productId,
          item.title || `${keyword} - Result ${index + 1}`,
          Math.random() * safeMaxPrice,
          itemUrl,
          "AliExpress",
          "USD",
          null,
          null,
          4.2 + Math.random() * 0.7,
          new Date(),
          null,
          index === 0,
        );
      });

      this.logger.log(
        `Found ${products.length} AliExpress item links for keyword: ${keyword}`,
      );
      return products;
    } catch (error) {
      this.logger.error(
        `Error searching AliExpress: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  async lookupOnAmazon(
    productName: string,
  ): Promise<{ exists: boolean; price: number | null; url: string | null }> {
    const safePriceLimit = this.getSafePriceLimit(500, 500);

    this.logger.debug(`Looking up product on Amazon: ${productName}`);

    try {
      // TODO: Replace with actual HTTP call to Python scraper service
      // const response = await this.httpService.post(
      //   `${this.scraperUrl}/lookup/amazon`,
      //   { productName }
      // ).toPromise();

      // Placeholder mock data
      const mockResult = {
        exists: true,
        price: Math.random() * safePriceLimit,
        url: `https://www.amazon.com/s?k=${productName}`,
      };

      this.logger.log(`Amazon lookup result for ${productName}:`, mockResult);
      return mockResult;
    } catch (error) {
      this.logger.error(
        `Error looking up on Amazon: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { exists: false, price: null, url: null };
    }
  }

  async lookupOnShopify(
    productName: string,
  ): Promise<{ exists: boolean; price: number | null; url: string | null }> {
    const safePriceLimit = this.getSafePriceLimit(300, 300);

    this.logger.debug(`Looking up product on Shopify: ${productName}`);

    try {
      // TODO: Replace with actual HTTP call to Python scraper service
      // const response = await this.httpService.post(
      //   `${this.scraperUrl}/lookup/shopify`,
      //   { productName }
      // ).toPromise();

      // Placeholder mock data
      const mockResult = {
        exists: Math.random() > 0.5,
        price: Math.random() > 0.5 ? Math.random() * safePriceLimit : null,
        url:
          Math.random() > 0.5
            ? `https://shopify-store.myshopify.com/products/${productName}`
            : null,
      };

      this.logger.log(`Shopify lookup result for ${productName}:`, mockResult);
      return mockResult;
    } catch (error) {
      this.logger.error(
        `Error looking up on Shopify: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { exists: false, price: null, url: null };
    }
  }

  async lookupOnWooCommerce(
    productName: string,
  ): Promise<{ exists: boolean; price: number | null; url: string | null }> {
    const safePriceLimit = this.getSafePriceLimit(250, 250);

    this.logger.debug(`Looking up product on WooCommerce: ${productName}`);

    try {
      // TODO: Replace with actual HTTP call to Python scraper service
      // const response = await this.httpService.post(
      //   `${this.scraperUrl}/lookup/woocommerce`,
      //   { productName }
      // ).toPromise();

      // Placeholder mock data
      const mockResult = {
        exists: Math.random() > 0.4,
        price: Math.random() > 0.4 ? Math.random() * safePriceLimit : null,
        url:
          Math.random() > 0.4
            ? `https://woocommerce-store.com/product/${productName}`
            : null,
      };

      this.logger.log(
        `WooCommerce lookup result for ${productName}:`,
        mockResult,
      );
      return mockResult;
    } catch (error) {
      this.logger.error(
        `Error looking up on WooCommerce: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { exists: false, price: null, url: null };
    }
  }

  async lookupOnEbay(
    productName: string,
  ): Promise<{ exists: boolean; price: number | null; url: string | null }> {
    const safePriceLimit = this.getSafePriceLimit(400, 400);

    this.logger.debug(`Looking up product on eBay: ${productName}`);

    try {
      // TODO: Replace with actual HTTP call to Python scraper service
      // const response = await this.httpService.post(
      //   `${this.scraperUrl}/lookup/ebay`,
      //   { productName }
      // ).toPromise();

      // Placeholder mock data
      const mockResult = {
        exists: true,
        price: Math.random() * safePriceLimit,
        url: `https://www.ebay.com/sch/i.html?_nkw=${productName}`,
      };

      this.logger.log(`eBay lookup result for ${productName}:`, mockResult);
      return mockResult;
    } catch (error) {
      this.logger.error(
        `Error looking up on eBay: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { exists: false, price: null, url: null };
    }
  }
}
