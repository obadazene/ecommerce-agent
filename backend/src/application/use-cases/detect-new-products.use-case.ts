import { Inject, Injectable } from "@nestjs/common";
import { Product } from "../../domain/entities/product.entity";
import { Result } from "../../shared/result";
import { ProductRepositoryPort } from "../ports/product-repository.port";

@Injectable()
export class DetectNewProductsUseCase {
  constructor(
    @Inject("ProductRepositoryPort")
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async execute(): Promise<Result<Product[]>> {
    try {
      const newProducts = await this.productRepository.findNewProducts();
      return Result.success(newProducts);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.failure(`Detect new products failed: ${message}`);
    }
  }
}
