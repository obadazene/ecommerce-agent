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
      await this.socialMediaPort.searchTikTok(product.name);
      await this.socialMediaPort.searchInstagram(product.name);
      await this.socialMediaPort.searchTwitter(product.name);
      await this.socialMediaPort.searchFacebook(product.name);

      return Result.success(product);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.failure(`Social media check failed: ${message}`);
    }
  }
}
