import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SocialMediaPort } from "../../application/ports/social-media.port";

type SocialSearchResponse = {
  exists?: boolean;
  firstPost?: string | null;
  url?: string | null;
  engagement?: number;
};

@Injectable()
export class SocialMediaAdapterService implements SocialMediaPort {
  private readonly logger = new Logger(SocialMediaAdapterService.name);
  private readonly socialUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.socialUrl = this.configService.get<string>(
      "SOCIAL_URL",
      "http://localhost:5002",
    );
  }

  private async searchPlatform(
    platform: string,
    productName: string,
  ): Promise<{
    exists: boolean;
    firstPost: Date | null;
    url: string | null;
    engagement: number;
  }> {
    const response = await fetch(`${this.socialUrl}/search/${platform}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: productName }),
    });

    if (!response.ok) {
      throw new Error(`Social service returned status ${response.status}`);
    }

    const payload = (await response.json()) as SocialSearchResponse;
    return {
      exists: payload.exists ?? false,
      firstPost: payload.firstPost ? new Date(payload.firstPost) : null,
      url: payload.url ?? null,
      engagement: payload.engagement ?? 0,
    };
  }

  async searchTikTok(productName: string): Promise<{
    exists: boolean;
    firstPost: Date | null;
    url: string | null;
    engagement: number;
  }> {
    this.logger.debug(`Searching TikTok for product: ${productName}`);

    try {
      const result = await this.searchPlatform("tiktok", productName);
      this.logger.log(`TikTok search result for ${productName}:`, result);
      return result;
    } catch (error) {
      this.logger.error(
        `Error searching TikTok: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { exists: false, firstPost: null, url: null, engagement: 0 };
    }
  }

  async searchInstagram(productName: string): Promise<{
    exists: boolean;
    firstPost: Date | null;
    url: string | null;
    engagement: number;
  }> {
    this.logger.debug(`Searching Instagram for product: ${productName}`);

    try {
      const result = await this.searchPlatform("instagram", productName);
      this.logger.log(`Instagram search result for ${productName}:`, result);
      return result;
    } catch (error) {
      this.logger.error(
        `Error searching Instagram: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { exists: false, firstPost: null, url: null, engagement: 0 };
    }
  }

  async searchTwitter(productName: string): Promise<{
    exists: boolean;
    firstPost: Date | null;
    url: string | null;
    engagement: number;
  }> {
    this.logger.debug(`Searching Twitter for product: ${productName}`);

    try {
      const result = await this.searchPlatform("twitter", productName);
      this.logger.log(`Twitter search result for ${productName}:`, result);
      return result;
    } catch (error) {
      this.logger.error(
        `Error searching Twitter: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { exists: false, firstPost: null, url: null, engagement: 0 };
    }
  }

  async searchFacebook(productName: string): Promise<{
    exists: boolean;
    firstPost: Date | null;
    url: string | null;
    engagement: number;
  }> {
    this.logger.debug(`Searching Facebook for product: ${productName}`);

    try {
      const result = await this.searchPlatform("facebook", productName);
      this.logger.log(`Facebook search result for ${productName}:`, result);
      return result;
    } catch (error) {
      this.logger.error(
        `Error searching Facebook: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { exists: false, firstPost: null, url: null, engagement: 0 };
    }
  }

  async searchYouTube(productName: string): Promise<{
    exists: boolean;
    firstPost: Date | null;
    url: string | null;
    engagement: number;
  }> {
    this.logger.debug(`Searching YouTube for product: ${productName}`);

    try {
      const result = await this.searchPlatform("youtube", productName);
      this.logger.log(`YouTube search result for ${productName}:`, result);
      return result;
    } catch (error) {
      this.logger.error(
        `Error searching YouTube: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { exists: false, firstPost: null, url: null, engagement: 0 };
    }
  }

  async searchPinterest(productName: string): Promise<{
    exists: boolean;
    firstPost: Date | null;
    url: string | null;
    engagement: number;
  }> {
    this.logger.debug(`Searching Pinterest for product: ${productName}`);

    try {
      const result = await this.searchPlatform("pinterest", productName);
      this.logger.log(`Pinterest search result for ${productName}:`, result);
      return result;
    } catch (error) {
      this.logger.error(
        `Error searching Pinterest: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { exists: false, firstPost: null, url: null, engagement: 0 };
    }
  }
}
