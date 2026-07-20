import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Logger,
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
  private readonly logger = new Logger(ProductController.name);

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

  private getAutoSearchKeywords(): string[] {
    const currentYear = new Date().getFullYear();

    return [
      "trending",
      "viral",
      "new arrivals",
      "best seller",
      "hot sale",
      `new ${currentYear}`,
      "top rated",
      "must have",
      "popular",
      "fast shipping",
    ];
  }

  private buildKeywordListFromCriteria(criteria: SearchProductDto): string[] {
    const rawKeyword = (criteria.keyword ?? "").trim();

    if (!rawKeyword || rawKeyword.toLowerCase() === "trending") {
      return this.getAutoSearchKeywords();
    }

    const splitKeywords = rawKeyword
      .split(",")
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0);

    return splitKeywords.length > 0 ? splitKeywords : [rawKeyword];
  }

  private normalizePlatforms(platforms?: string[]): string[] {
    if (!platforms || platforms.length === 0) {
      return ["AliExpress"];
    }

    return platforms.map((platform) => platform.trim()).filter(Boolean);
  }

  private buildSearchCriteria(
    base: SearchProductDto,
    keyword: string,
  ): SearchProductDto {
    const criteria = new SearchProductDto();
    criteria.keyword = keyword;
    criteria.maxPrice = base.maxPrice;
    criteria.checkSocialMedia = base.checkSocialMedia;
    criteria.platforms = this.normalizePlatforms(base.platforms);
    criteria.minRating = base.minRating;
    criteria.minSales = base.minSales;
    return criteria;
  }

  private async discoverProducts(
    criteria: SearchProductDto,
  ): Promise<Product[]> {
    const keywords = this.buildKeywordListFromCriteria(criteria);
    this.logger.log(
      `Workflow search using keyword set: ${keywords.join(", ")}`,
    );

    const productsByKey = new Map<string, Product>();

    for (const keyword of keywords) {
      const keywordCriteria = this.buildSearchCriteria(criteria, keyword);

      this.logger.debug(`Running scraper search for keyword: ${keyword}`);
      const searchResult =
        await this.searchProductUseCase.execute(keywordCriteria);
      if (searchResult.isFailure()) {
        this.logger.warn(
          `Search failed for keyword '${keyword}': ${searchResult.getError()}`,
        );
        continue;
      }

      const foundProducts = searchResult.getValue();
      this.logger.log(
        `Keyword '${keyword}' returned ${foundProducts.length} products`,
      );

      for (const product of foundProducts) {
        const dedupeKey =
          product.url?.trim().toLowerCase() || product.id.trim().toLowerCase();
        if (!productsByKey.has(dedupeKey)) {
          productsByKey.set(dedupeKey, product);
        }
      }
    }

    return Array.from(productsByKey.values());
  }

  private async processQualifiedProducts(
    products: Product[],
    minOverallScore: number,
    checkSocialMedia: boolean,
  ): Promise<Result<{ winners: Product[]; analyzed: Product[] }>> {
    const winners: Product[] = [];
    const analyzed: Product[] = [];

    for (const product of products) {
      try {
        const scoreResult = await this.scoreProductUseCase.execute(product);
        if (scoreResult.isFailure()) {
          if (this.isRateLimitError(scoreResult.getError())) {
            this.throwRateLimitError(scoreResult.getError());
          }
          continue;
        }

        const score = scoreResult.getValue().overallScore;
        const scoredProduct = this.withCriteriaScore(product, score);
        analyzed.push(scoredProduct);

        if (score < minOverallScore) {
          continue;
        }

        let socialSignal = "skipped";
        let marketplaceSignal = "unknown";

        if (checkSocialMedia) {
          const socialResult =
            await this.checkSocialMediaUseCase.execute(scoredProduct);
          if (socialResult.isFailure()) {
            socialSignal = "none";
            this.logger.debug(
              `Social signal for '${scoredProduct.name}': none (${socialResult.getError()})`,
            );
          } else {
            socialSignal = "found";
          }
        }

        const crossResult =
          await this.checkCrossPlatformUseCase.execute(scoredProduct);
        if (crossResult.isFailure()) {
          marketplaceSignal = "none";
          this.logger.debug(
            `Marketplace signal for '${scoredProduct.name}': none (${crossResult.getError()})`,
          );
        } else {
          marketplaceSignal = "found";
        }

        this.logger.log(
          `Decision signals for '${scoredProduct.name}': social=${socialSignal}, marketplace=${marketplaceSignal}`,
        );

        await this.productRepository.save(scoredProduct);
        winners.push(scoredProduct);
      } catch (error) {
        if (this.isRateLimitError(error)) {
          this.throwRateLimitError(error);
        }
      }
    }

    return Result.success({ winners, analyzed });
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
    return Result.success(await this.productRepository.findAll());
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

      const keywords = this.getAutoSearchKeywords();
      this.logger.log(`Auto-search using keyword set: ${keywords.join(", ")}`);
      const yearKeyword = keywords.find((keyword) =>
        keyword.startsWith("new "),
      );
      if (yearKeyword) {
        this.logger.log(`Auto-search dynamic year keyword: ${yearKeyword}`);
      }

      const searchDto = new SearchProductDto();
      searchDto.keyword = keywords.join(", ");
      searchDto.maxPrice = genericCriteria.maxPrice;
      searchDto.platforms = ["AliExpress"];
      searchDto.minRating = genericCriteria.minRating;
      searchDto.minSales = genericCriteria.minSales;
      searchDto.checkSocialMedia = true;

      const allProducts = await this.discoverProducts(searchDto);
      if (allProducts.length === 0) {
        return this.sendFallbackReportFromCache(
          thresholds.minOverallScore,
          true,
        );
      }

      const processedResult = await this.processQualifiedProducts(
        allProducts,
        thresholds.minOverallScore,
        true,
      );
      if (processedResult.isFailure()) {
        return Result.failure(processedResult.getError());
      }

      const { winners: winningProducts, analyzed: analyzedProducts } =
        processedResult.getValue();

      // Step 4: Send email report with winning products only (not ALL products in DB)
      const emailResult = await this.sendDailyReportUseCase.executeWithProducts(
        winningProducts,
        analyzedProducts,
        thresholds.minOverallScore,
        "live-data",
      );
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
    const normalizedCriteria = new SearchProductDto();
    normalizedCriteria.keyword = criteria.keyword;
    normalizedCriteria.maxPrice = criteria.maxPrice;
    normalizedCriteria.platforms = this.normalizePlatforms(criteria.platforms);
    normalizedCriteria.checkSocialMedia = criteria.checkSocialMedia;
    normalizedCriteria.minRating = criteria.minRating;
    normalizedCriteria.minSales = criteria.minSales;

    const products = await this.discoverProducts(normalizedCriteria);
    if (products.length === 0) {
      return this.sendFallbackReportFromCache(5, false);
    }

    const processedResult = await this.processQualifiedProducts(
      products,
      5,
      normalizedCriteria.checkSocialMedia !== false,
    );
    if (processedResult.isFailure()) {
      return Result.failure(processedResult.getError());
    }

    const { winners: scoredProducts, analyzed: analyzedProducts } =
      processedResult.getValue();

    const emailResult = await this.sendDailyReportUseCase.executeWithProducts(
      scoredProducts,
      analyzedProducts,
      5,
      "live-data",
    );
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

  private async sendFallbackReportFromCache(
    minMatchingScore: number,
    winnersOnly: boolean,
  ): Promise<Result<Product[]>> {
    const cachedProducts = await this.productRepository.findAll();
    if (cachedProducts.length === 0) {
      this.logger.warn(
        "No live products found and cache is empty. Sending blocked-source empty report.",
      );
      const emptyEmailResult =
        await this.sendDailyReportUseCase.executeWithProducts(
          [],
          [],
          minMatchingScore,
          "blocked-source",
        );
      if (emptyEmailResult.isFailure()) {
        return Result.failure(emptyEmailResult.getError());
      }
      return Result.success([]);
    }

    const cachedWinners = cachedProducts.filter(
      (product) =>
        product.criteriaScore !== null &&
        product.criteriaScore >= minMatchingScore,
    );

    this.logger.warn(
      `Live discovery returned 0 products. Reusing ${cachedProducts.length} cached products for report fallback.`,
    );

    const fallbackEmailResult =
      await this.sendDailyReportUseCase.executeWithProducts(
        cachedWinners,
        cachedProducts,
        minMatchingScore,
        "fallback-cache",
      );
    if (fallbackEmailResult.isFailure()) {
      return Result.failure(fallbackEmailResult.getError());
    }

    return Result.success(winnersOnly ? cachedWinners : cachedProducts);
  }
}
