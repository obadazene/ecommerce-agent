import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ScraperPort } from "../../application/ports/scraper.port";
import { Product } from "../../domain/entities/product.entity";

type AliExpressSearchResponse = {
  blocked?: boolean;
  blockedReason?: string | null;
  source?: string | null;
  products?: Array<{
    name?: string;
    price?: number | null;
    currency?: string | null;
    url?: string;
    platform?: string | null;
    image_url?: string | null;
    seller_name?: string | null;
    seller_rating?: number | null;
    sales_count?: number | null;
    launch_date?: string | null;
  }>;
  items?: Array<{
    title?: string;
    url?: string;
    price?: number | null;
    imageUrl?: string | null;
    launchDate?: string | null;
    sellerRating?: number | null;
    salesCount?: number | null;
  }>;
};

type MarketplaceLookupResponse = {
  url?: string;
  metadata?: {
    title?: string | null;
    description?: string | null;
  };
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

  private buildMarketplaceSearchUrl(
    platform: string,
    productName: string,
  ): string {
    const encodedName = encodeURIComponent(productName);

    switch (platform) {
      case "amazon":
        return `https://www.amazon.com/s?k=${encodedName}`;
      case "shopify":
        return `https://www.bing.com/search?q=${encodeURIComponent(`site:myshopify.com ${productName}`)}`;
      case "woocommerce":
        return `https://www.bing.com/search?q=${encodeURIComponent(`inurl:product ${productName}`)}`;
      case "ebay":
        return `https://www.ebay.com/sch/i.html?_nkw=${encodedName}`;
      case "temu":
        return `https://www.bing.com/search?q=${encodeURIComponent(`site:temu.com ${productName}`)}`;
      default:
        throw new Error(`Unsupported marketplace: ${platform}`);
    }
  }

  private async lookupMarketplace(
    platform: string,
    productName: string,
  ): Promise<{ exists: boolean; price: number | null; url: string | null }> {
    const searchUrl = this.buildMarketplaceSearchUrl(platform, productName);
    const response = await fetch(`${this.scraperUrl}/lookup/${platform}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: searchUrl }),
    });

    if (!response.ok) {
      throw new Error(`Scraper returned status ${response.status}`);
    }

    const payload = (await response.json()) as MarketplaceLookupResponse;
    const title = payload.metadata?.title?.trim();
    const description = payload.metadata?.description?.trim();

    return {
      exists: Boolean(title || description),
      price: null,
      url: payload.url ?? searchUrl,
    };
  }

  async searchAliExpress(
    keyword: string,
    maxPrice: number,
    filters?: {
      minSellerRating?: number;
      minSales?: number;
      platforms?: string[];
    },
    options?: {
      useBrightData?: boolean;
    },
  ): Promise<Product[]> {
    const safeMaxPrice =
      typeof maxPrice === "number" && !isNaN(maxPrice) ? maxPrice : 20;
    const allowedPlatforms =
      filters?.platforms?.map((platform) => platform.trim().toLowerCase()) ??
      [];

    this.logger.debug(
      `Searching AliExpress for keyword: ${keyword}, maxPrice: ${safeMaxPrice}`,
    );

    try {
      const response = await fetch(`${this.scraperUrl}/search/aliexpress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: keyword,
          useBrightData: options?.useBrightData,
        }),
      });

      const keywordQuery = encodeURIComponent(keyword);
      const fallbackUrl = `https://www.aliexpress.com/wholesale?SearchText=${keywordQuery}`;

      if (!response.ok) {
        throw new Error(`Scraper returned status ${response.status}`);
      }

      const payload = (await response.json()) as AliExpressSearchResponse;
      if (payload.blocked) {
        this.logger.warn(
          `AliExpress search appears blocked by anti-bot for keyword '${keyword}' (${payload.blockedReason ?? "unknown"}).`,
        );
      }

      const rawProducts =
        payload.products?.map((product, index) => ({
          title: product.name,
          url: product.url,
          price: product.price,
          imageUrl: product.image_url,
          launchDate: product.launch_date,
          sellerRating: product.seller_rating,
          salesCount: product.sales_count,
          currency: product.currency,
          sellerName: product.seller_name,
          platform: product.platform,
          source: payload.source ?? null,
          sortIndex: index,
        })) ?? [];

      const fallbackItems = (payload.items ?? []).map((item, index) => ({
        title: item.title,
        url: item.url,
        price: item.price,
        imageUrl: item.imageUrl,
        launchDate: item.launchDate,
        sellerRating: item.sellerRating,
        salesCount: item.salesCount,
        currency: undefined,
        sellerName: undefined,
        platform: undefined,
        source: payload.source ?? null,
        sortIndex: index,
      }));

      const items = rawProducts.length > 0 ? rawProducts : fallbackItems;

      const products = items.slice(0, 12).map((item, index) => {
        const itemSource = (item.source || "").trim().toLowerCase();
        const itemUrl = itemSource === "demo" ? "" : item.url || "";
        const parsedLaunchDate =
          typeof item.launchDate === "string" &&
          item.launchDate.trim().length > 0
            ? new Date(item.launchDate)
            : null;
        const launchDate =
          parsedLaunchDate && !Number.isNaN(parsedLaunchDate.getTime())
            ? parsedLaunchDate
            : null;
        const itemPrice =
          typeof item.price === "number" && !Number.isNaN(item.price)
            ? item.price
            : 0;
        const sellerRating =
          typeof item.sellerRating === "number" &&
          !Number.isNaN(item.sellerRating)
            ? item.sellerRating
            : null;
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
          itemPrice <= safeMaxPrice || itemPrice === 0
            ? itemPrice
            : safeMaxPrice,
          itemUrl,
          item.platform || "AliExpress",
          item.source || null,
          item.currency || "USD",
          item.imageUrl || null,
          item.sellerName || null,
          sellerRating,
          launchDate,
          null,
          index === 0,
        );
      });

      const filteredProducts = products.filter((product, index) => {
        const rawItem = items[index];
        const matchesPlatform =
          allowedPlatforms.length === 0 ||
          allowedPlatforms.includes(product.platform.trim().toLowerCase());
        const matchesRating =
          filters?.minSellerRating == null ||
          (product.sellerRating !== null &&
            product.sellerRating >= filters.minSellerRating);
        const salesCount =
          typeof rawItem.salesCount === "number" &&
          !Number.isNaN(rawItem.salesCount)
            ? rawItem.salesCount
            : null;
        const matchesSales =
          filters?.minSales == null ||
          salesCount === null ||
          salesCount >= filters.minSales;

        return matchesPlatform && matchesRating && matchesSales;
      });

      this.logger.log(
        `Found ${filteredProducts.length} AliExpress items for keyword: ${keyword} (source=${payload.source ?? "unknown"})`,
      );
      return filteredProducts;
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
    this.logger.debug(`Looking up product on Amazon: ${productName}`);

    try {
      const result = await this.lookupMarketplace("amazon", productName);
      this.logger.log(`Amazon lookup result for ${productName}:`, result);
      return result;
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
    this.logger.debug(`Looking up product on Shopify: ${productName}`);

    try {
      const result = await this.lookupMarketplace("shopify", productName);
      this.logger.log(`Shopify lookup result for ${productName}:`, result);
      return result;
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
    this.logger.debug(`Looking up product on WooCommerce: ${productName}`);

    try {
      const result = await this.lookupMarketplace("woocommerce", productName);
      this.logger.log(`WooCommerce lookup result for ${productName}:`, result);
      return result;
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
    this.logger.debug(`Looking up product on eBay: ${productName}`);

    try {
      const result = await this.lookupMarketplace("ebay", productName);
      this.logger.log(`eBay lookup result for ${productName}:`, result);
      return result;
    } catch (error) {
      this.logger.error(
        `Error looking up on eBay: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { exists: false, price: null, url: null };
    }
  }

  async lookupOnTemu(
    productName: string,
  ): Promise<{ exists: boolean; price: number | null; url: string | null }> {
    this.logger.debug(`Looking up product on Temu: ${productName}`);

    try {
      const result = await this.lookupMarketplace("temu", productName);
      this.logger.log(`Temu lookup result for ${productName}:`, result);
      return result;
    } catch (error) {
      this.logger.error(
        `Error looking up on Temu: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { exists: false, price: null, url: null };
    }
  }
}
