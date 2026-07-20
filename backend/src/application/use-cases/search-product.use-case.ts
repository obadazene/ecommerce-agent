import { Inject, Injectable } from "@nestjs/common";
import { Product } from "../../domain/entities/product.entity";
import { Result } from "../../shared/result";
import { SearchProductDto } from "../dto/search-product.dto";
import { ScraperPort } from "../ports/scraper.port";

@Injectable()
export class SearchProductUseCase {
  constructor(
    @Inject("ScraperPort")
    private readonly scraperPort: ScraperPort,
  ) {}

  async execute(
    criteria: SearchProductDto,
    options?: { useBrightData?: boolean },
  ): Promise<Result<Product[]>> {
    try {
      const products = await this.scraperPort.searchAliExpress(
        criteria.keyword,
        criteria.maxPrice,
        {
          minSellerRating: criteria.minRating,
          minSales: criteria.minSales,
          platforms: criteria.platforms,
        },
        options,
      );

      return Result.success(products);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.failure(`Search failed: ${message}`);
    }
  }
}
