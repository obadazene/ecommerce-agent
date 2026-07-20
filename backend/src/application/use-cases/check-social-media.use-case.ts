import { Inject, Injectable } from "@nestjs/common";
import { Product } from "../../domain/entities/product.entity";
import { Result } from "../../shared/result";
import { SocialMediaPort } from "../ports/social-media.port";

@Injectable()
export class CheckSocialMediaUseCase {
  constructor(
    @Inject("SocialMediaPort")
    private readonly socialMediaPort: SocialMediaPort,
  ) {}

  async execute(product: Product): Promise<Result<Product>> {
    try {
      const results = await Promise.all([
        this.socialMediaPort.searchTikTok(product.name),
        this.socialMediaPort.searchInstagram(product.name),
        this.socialMediaPort.searchTwitter(product.name),
        this.socialMediaPort.searchFacebook(product.name),
      ]);

      if (!results.some((result) => result.exists)) {
        return Result.failure(
          `Social media check failed: No social media presence found for ${product.name}`,
        );
      }

      return Result.success(product);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.failure(`Social media check failed: ${message}`);
    }
  }
}
