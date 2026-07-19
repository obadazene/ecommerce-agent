import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Product } from "../../domain/entities/product.entity";
import { WinningProductCriteria } from "../../domain/value-objects/winning-product-criteria.vo";
import { Result } from "../../shared/result";

@Injectable()
export class ScoreProductUseCase {
  private readonly logger = new Logger(ScoreProductUseCase.name);
  private readonly detectorUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.detectorUrl = this.configService.get<string>(
      "DETECTOR_URL",
      "http://localhost:5003",
    );
  }

  async execute(product: Product): Promise<Result<WinningProductCriteria>> {
    try {
      this.logger.debug(`Scoring product: ${product.name}`);

      // Call real detector API with Gemini + Mistral analysis
      const analysisResult = await this.callDetectorAPI(product);

      if (!analysisResult) {
        this.logger.warn(`Detector API failed for product ${product.id}`);
        return Result.failure("Detector API unavailable");
      }

      // Extract scores from detector response
      const criteriaScores = analysisResult.criteria_scores || {};
      const finalScore = analysisResult.final_score || 0;

      this.logger.debug(`Product ${product.id} scored: ${finalScore}`);

      // Create winning product criteria with real scores using factory method
      const criteria = WinningProductCriteria.create({
        wowFactor: Math.round(criteriaScores.wow || 0),
        solvesProblem: Math.round(criteriaScores.solves_problem || 0),
        makesBetterEasier: Math.round(criteriaScores.makes_better_easier || 0),
        highPerceivedValue: Math.round(
          criteriaScores.high_perceived_value || 0,
        ),
        massMarketAppeal: Math.round(criteriaScores.mass_market_appeal || 0),
        specificNiche: Math.round(criteriaScores.specific_niche || 0),
        lightweightShipping: Math.round(
          criteriaScores.lightweight_shipping || 0,
        ),
      });
      return Result.success(criteria);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Scoring failed: ${message}`);
      return Result.failure(`Scoring failed: ${message}`);
    }
  }

  private async callDetectorAPI(product: Product): Promise<any> {
    try {
      const payload = {
        id: product.id,
        name: product.name,
        price: product.price,
        platform: product.platform,
        description: product.name,
      };

      const response = await fetch(`${this.detectorUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Check for rate limit errors (429)
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData.detail ||
          "🚨 BLOCKING: API rate limit reached. Please upgrade or wait for quota reset.";
        this.logger.error(`🚨 API RATE LIMIT (429): ${message}`);
        throw new Error(message);
      }

      if (!response.ok) {
        this.logger.warn(
          `Detector API returned ${response.status}: ${response.statusText}`,
        );
        return null;
      }

      const analysis = await response.json();
      return analysis;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Propagate rate limit errors
      if (message.includes("BLOCKING") || message.includes("rate limit")) {
        this.logger.error(`🚨 API RATE LIMIT BLOCKED: ${message}`);
        throw error;
      }

      this.logger.error(`Detector API call failed: ${message}`);
      return null;
    }
  }
}
