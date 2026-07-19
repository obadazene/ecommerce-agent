import { Module } from "@nestjs/common";
import { CheckCrossPlatformUseCase } from "../application/use-cases/check-cross-platform.use-case";
import { CheckSocialMediaUseCase } from "../application/use-cases/check-social-media.use-case";
import { CheckTechUpdatesUseCase } from "../application/use-cases/check-tech-updates.use-case";
import { DetectNewProductsUseCase } from "../application/use-cases/detect-new-products.use-case";
import { ScoreProductUseCase } from "../application/use-cases/score-product.use-case";
import { SearchProductUseCase } from "../application/use-cases/search-product.use-case";
import { SendDailyReportUseCase } from "../application/use-cases/send-daily-report.use-case";
import { ScheduledSearchService } from "../domain/services/scheduled-search.service";
import { ScoringService } from "../domain/services/scoring.service";
import { ProductController } from "../infrastructure/http/controllers/product.controller";
import { PrismaService } from "../infrastructure/persistence/prisma.service";
import { ProductRepositoryImpl } from "../infrastructure/persistence/repositories/product-repository.impl";
import { EmailService } from "../infrastructure/services/email.service";
import { ScraperAdapterService } from "../infrastructure/services/scraper-adapter.service";
import { SocialMediaAdapterService } from "../infrastructure/services/social-media-adapter.service";

@Module({
  controllers: [ProductController],
  providers: [
    SearchProductUseCase,
    CheckCrossPlatformUseCase,
    CheckSocialMediaUseCase,
    ScoreProductUseCase,
    SendDailyReportUseCase,
    DetectNewProductsUseCase,
    CheckTechUpdatesUseCase,
    ScheduledSearchService,
    ScoringService,
    PrismaService,
    {
      provide: "ProductRepositoryPort",
      useClass: ProductRepositoryImpl,
    },
    {
      provide: "ScraperPort",
      useClass: ScraperAdapterService,
    },
    {
      provide: "SocialMediaPort",
      useClass: SocialMediaAdapterService,
    },
    {
      provide: "EmailPort",
      useClass: EmailService,
    },
  ],
  exports: [
    SearchProductUseCase,
    SendDailyReportUseCase,
    DetectNewProductsUseCase,
    CheckTechUpdatesUseCase,
  ],
})
export class ProductModule {}
