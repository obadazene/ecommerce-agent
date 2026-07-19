import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import { SearchProductDto } from "../../../application/dto/search-product.dto";
import { ProductRepositoryPort } from "../../../application/ports/product-repository.port";
import { CheckCrossPlatformUseCase } from "../../../application/use-cases/check-cross-platform.use-case";
import { CheckSocialMediaUseCase } from "../../../application/use-cases/check-social-media.use-case";
import { DetectNewProductsUseCase } from "../../../application/use-cases/detect-new-products.use-case";
import { ScoreProductUseCase } from "../../../application/use-cases/score-product.use-case";
import { SearchProductUseCase } from "../../../application/use-cases/search-product.use-case";
import { SendDailyReportUseCase } from "../../../application/use-cases/send-daily-report.use-case";
import { Product } from "../../../domain/entities/product.entity";
import { ScheduledSearchService } from "../../../domain/services/scheduled-search.service";
import { Result } from "../../../shared/result";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("products")
export class ProductController {
  constructor(
    private readonly searchProductUseCase: SearchProductUseCase,
    private readonly checkCrossPlatformUseCase: CheckCrossPlatformUseCase,
    private readonly checkSocialMediaUseCase: CheckSocialMediaUseCase,
    private readonly scoreProductUseCase: ScoreProductUseCase,
    private readonly sendDailyReportUseCase: SendDailyReportUseCase,
    private readonly detectNewProductsUseCase: DetectNewProductsUseCase,
    private readonly scheduledSearchService: ScheduledSearchService,
    @Inject("ProductRepositoryPort")
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  private isRateLimitError(error: any): boolean {
    const message = error?.message || error?.getResponse?.().message || "";
    return (
      message.includes("BLOCKING") ||
      message.includes("rate limit") ||
      message.includes("quota")
    );
  }

  private throwRateLimitError(error: any): never {
    const message = error?.message || "API rate limit reached";
    throw new ServiceUnavailableException(
      `🚨 ${message}. Please try again later or upgrade your API plan.`,
    );
  }

  @Post("search")
  async search(@Body() criteria: SearchProductDto): Promise<Result<Product[]>> {
    const result = await this.executeFullWorkflow(criteria);
    if (result.isFailure()) {
      throw new BadRequestException(result.getError());
    }
    return result;
  }

  @Post("manual-search")
  async manualSearch(
    @Body() criteria: SearchProductDto,
  ): Promise<Result<Product[]>> {
    const result = await this.executeFullWorkflow(criteria);
    if (result.isFailure()) {
      throw new BadRequestException(result.getError());
    }
    return result;
  }

  @Get()
  async findAll(): Promise<Result<Product[]>> {
    throw new BadRequestException("Not implemented");
  }

  @Get("new")
  async findNew(): Promise<Result<Product[]>> {
    const result = await this.detectNewProductsUseCase.execute();
    if (result.isFailure()) {
      throw new BadRequestException(result.getError());
    }

    const newProducts = result.getValue();

    // Send daily report email with only the newly detected products
    const emailResult =
      await this.sendDailyReportUseCase.executeWithProducts(newProducts);
    if (emailResult.isFailure()) {
      throw new BadRequestException(emailResult.getError());
    }

    return result;
  }

  @Post("auto-search")
  async autoSearch(): Promise<Result<Product[]>> {
    // Autonomous daily search:
    // 1. Search AliExpress (no keyword needed - finds trending products)
    // 2. Score products against winning criteria
    // 3. Check social media for high-scoring products
    // 4. Send email with winners

    try {
      const genericCriteria =
        this.scheduledSearchService.getGenericSearchCriteria();
      const thresholds = this.scheduledSearchService.getScoringThresholds();

      // Step 1: Search with generic criteria (broad discovery)
      const searchDto = new SearchProductDto();
      searchDto.keyword = "trending"; // Generic search for trending products
      searchDto.maxPrice = genericCriteria.maxPrice;

      const searchResult = await this.searchProductUseCase.execute(searchDto);
      if (searchResult.isFailure()) {
        throw new BadRequestException(searchResult.getError());
      }

      const allProducts = searchResult.getValue();
      const winningProducts: Product[] = [];

      // Step 2 & 3: Score and check social media for each product
      for (const product of allProducts) {
        try {
          // Score product
          const scoreResult = await this.scoreProductUseCase.execute(product);
          if (scoreResult.isFailure()) {
            // Check if it's a rate limit error
            if (this.isRateLimitError(scoreResult.getError())) {
              this.throwRateLimitError(scoreResult.getError());
            }
            continue;
          }

          const score = scoreResult.getValue().overallScore;

          // Only process products that meet winning criteria
          if (score >= thresholds.minOverallScore) {
            // Check social media presence
            const socialResult =
              await this.checkSocialMediaUseCase.execute(product);
            if (socialResult.isFailure()) continue;

            // Check cross-platform availability
            const crossResult =
              await this.checkCrossPlatformUseCase.execute(product);
            if (crossResult.isFailure()) continue;

            const winningProduct = this.withCriteriaScore(product, score);
            await this.productRepository.save(winningProduct);
            winningProducts.push(winningProduct);
          }
        } catch (error) {
          if (this.isRateLimitError(error)) {
            this.throwRateLimitError(error);
          }
          continue;
        }
      }

      // Step 4: Send email report with winning products only (not ALL products in DB)
      const emailResult =
        await this.sendDailyReportUseCase.executeWithProducts(winningProducts);
      if (emailResult.isFailure()) {
        throw new BadRequestException(emailResult.getError());
      }

      return Result.success(winningProducts);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @Get("auto-search/criteria")
  async getAutoSearchCriteria(): Promise<Result<any>> {
    // Returns the criteria used for autonomous daily searches
    return Result.success({
      searchCriteria: this.scheduledSearchService.getGenericSearchCriteria(),
      scoringThresholds: this.scheduledSearchService.getScoringThresholds(),
    });
  }

  private async executeFullWorkflow(
    criteria: SearchProductDto,
  ): Promise<Result<Product[]>> {
    const searchResult = await this.searchProductUseCase.execute(criteria);
    if (searchResult.isFailure()) {
      return Result.failure(searchResult.getError());
    }

    const products = searchResult.getValue();
    const scoredProducts: Product[] = [];

    for (const product of products) {
      const crossResult = await this.checkCrossPlatformUseCase.execute(product);
      if (crossResult.isFailure()) {
        return Result.failure(crossResult.getError());
      }

      const socialResult = await this.checkSocialMediaUseCase.execute(product);
      if (socialResult.isFailure()) {
        return Result.failure(socialResult.getError());
      }

      const scoreResult = await this.scoreProductUseCase.execute(product);
      if (scoreResult.isFailure()) {
        return Result.failure(scoreResult.getError());
      }

      const scoredProduct = this.withCriteriaScore(
        product,
        scoreResult.getValue().overallScore,
      );
      await this.productRepository.save(scoredProduct);
      scoredProducts.push(scoredProduct);
    }

    const emailResult =
      await this.sendDailyReportUseCase.executeWithProducts(scoredProducts);
    if (emailResult.isFailure()) {
      return Result.failure(emailResult.getError());
    }

    return Result.success(scoredProducts);
  }

  private withCriteriaScore(product: Product, criteriaScore: number): Product {
    return new Product(
      product.id,
      product.name,
      product.price,
      product.url,
      product.platform,
      product.currency,
      product.imageUrl,
      product.sellerName,
      product.sellerRating,
      product.launchDate,
      criteriaScore,
      product.isNew,
      product.createdAt,
    );
  }
}
