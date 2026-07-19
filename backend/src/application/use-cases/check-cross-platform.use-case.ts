import { Inject, Injectable } from "@nestjs/common";
import { Product } from "../../domain/entities/product.entity";
import { Result } from "../../shared/result";
import { ScraperPort } from "../ports/scraper.port";

@Injectable()
export class CheckCrossPlatformUseCase {
  constructor(
    @Inject("ScraperPort")
    private readonly scraperPort: ScraperPort,
  ) {}

  async execute(product: Product): Promise<Result<Product>> {
    try {
      await this.scraperPort.lookupOnAmazon(product.name);
      await this.scraperPort.lookupOnShopify(product.name);
      await this.scraperPort.lookupOnWooCommerce(product.name);
      await this.scraperPort.lookupOnEbay(product.name);

      return Result.success(product);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.failure(`Cross-platform check failed: ${message}`);
    }
  }
}
