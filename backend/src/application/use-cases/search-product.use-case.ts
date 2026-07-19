import { Inject, Injectable } from "@nestjs/common";
import { Product } from "../../domain/entities/product.entity";
import { Result } from "../../shared/result";
import { SearchProductDto } from "../dto/search-product.dto";
import { ProductRepositoryPort } from "../ports/product-repository.port";
import { ScraperPort } from "../ports/scraper.port";

@Injectable()
export class SearchProductUseCase {
  constructor(
    @Inject("ScraperPort")
    private readonly scraperPort: ScraperPort,
    @Inject("ProductRepositoryPort")
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async execute(criteria: SearchProductDto): Promise<Result<Product[]>> {
    try {
      const products = await this.scraperPort.searchAliExpress(
        criteria.keyword,
        criteria.maxPrice,
      );

      for (const product of products) {
        await this.productRepository.save(product);
      }

      return Result.success(products);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.failure(`Search failed: ${message}`);
    }
  }
}
