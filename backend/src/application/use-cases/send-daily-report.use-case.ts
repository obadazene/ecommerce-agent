import { Inject, Injectable } from "@nestjs/common";
import { Product } from "../../domain/entities/product.entity";
import { Result } from "../../shared/result";
import { DailyReportDto } from "../dto/daily-report.dto";
import { EmailPort } from "../ports/email.port";
import { ProductRepositoryPort } from "../ports/product-repository.port";

@Injectable()
export class SendDailyReportUseCase {
  constructor(
    @Inject("EmailPort")
    private readonly emailPort: EmailPort,
    @Inject("ProductRepositoryPort")
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async executeWithProducts(products: Product[]): Promise<Result<void>> {
    try {
      const totalProducts = products.length;
      const matchingProducts = products.filter(
        (product) =>
          product.criteriaScore !== null && product.criteriaScore >= 5,
      ).length;
      const newProducts = products.filter((product) => product.isNew).length;
      const averageScore =
        products.length === 0
          ? 0
          : products.reduce(
              (sum, product) => sum + (product.criteriaScore ?? 0),
              0,
            ) / products.length;

      const report = new DailyReportDto(
        new Date(),
        totalProducts,
        matchingProducts,
        newProducts,
        Math.round(averageScore * 100) / 100,
        products,
      );

      await this.emailPort.sendReport(report);
      return Result.success<void>(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.failure(`Failed to send daily report: ${message}`);
    }
  }

  async execute(): Promise<Result<void>> {
    try {
      const products = await this.productRepository.findAll();
      return this.executeWithProducts(products);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.failure(`Failed to send daily report: ${message}`);
    }
  }
}
