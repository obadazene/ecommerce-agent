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

  private resolveReportQuality(
    requestedQuality:
      | "live-data"
      | "fallback-cache"
      | "blocked-source"
      | "demo-fallback"
      | "mixed-source",
    analyzedProducts: Product[],
  ): DailyReportDto["dataQuality"] {
    if (
      requestedQuality === "fallback-cache" ||
      requestedQuality === "blocked-source"
    ) {
      return requestedQuality;
    }

    if (analyzedProducts.length === 0) {
      return requestedQuality;
    }

    const sources = analyzedProducts
      .map((product) => product.source?.trim().toLowerCase() ?? "")
      .filter((source) => source.length > 0);

    if (sources.length === 0) {
      return requestedQuality;
    }

    if (sources.every((source) => source === "demo")) {
      return "demo-fallback";
    }

    if (sources.some((source) => source === "demo")) {
      return "mixed-source";
    }

    return requestedQuality;
  }

  async executeWithProducts(
    products: Product[],
    analyzedProducts: Product[] = products,
    minMatchingScore: number = 5,
    dataQuality:
      | "live-data"
      | "fallback-cache"
      | "blocked-source"
      | "demo-fallback"
      | "mixed-source" = "live-data",
  ): Promise<Result<void>> {
    try {
      const totalProducts = analyzedProducts.length;
      const matchingProducts = analyzedProducts.filter(
        (product) =>
          product.criteriaScore !== null &&
          product.criteriaScore >= minMatchingScore,
      ).length;
      const newProducts = analyzedProducts.filter(
        (product) => product.isNew,
      ).length;
      const averageScore =
        analyzedProducts.length === 0
          ? 0
          : analyzedProducts.reduce(
              (sum, product) => sum + (product.criteriaScore ?? 0),
              0,
            ) / analyzedProducts.length;

      const nonWinningProducts = analyzedProducts.filter(
        (product) =>
          product.criteriaScore === null ||
          product.criteriaScore < minMatchingScore,
      );

      const resolvedQuality = this.resolveReportQuality(
        dataQuality,
        analyzedProducts,
      );

      const report = new DailyReportDto(
        new Date(),
        resolvedQuality,
        totalProducts,
        matchingProducts,
        newProducts,
        Math.round(averageScore * 100) / 100,
        products,
        nonWinningProducts,
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
