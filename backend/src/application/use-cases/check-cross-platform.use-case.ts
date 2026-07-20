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
      const results = await Promise.all([
        this.scraperPort.lookupOnAmazon(product.name),
        this.scraperPort.lookupOnShopify(product.name),
        this.scraperPort.lookupOnWooCommerce(product.name),
        this.scraperPort.lookupOnEbay(product.name),
        this.scraperPort.lookupOnTemu(product.name),
      ]);

      if (!results.some((result) => result.exists)) {
        return Result.failure(
          `Cross-platform check failed: No marketplace presence found for ${product.name}`,
        );
      }

      return Result.success(product);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.failure(`Cross-platform check failed: ${message}`);
    }
  }
}
