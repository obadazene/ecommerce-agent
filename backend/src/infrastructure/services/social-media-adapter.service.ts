import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SocialMediaPort } from "../../application/ports/social-media.port";

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

  async searchTikTok(productName: string): Promise<{
    exists: boolean;
    firstPost: Date | null;
    url: string | null;
    engagement: number;
  }> {
    this.logger.debug(`Searching TikTok for product: ${productName}`);

    try {
      // TODO: Replace with actual HTTP call to Python social service
      // const response = await this.httpService.post(
      //   `${this.socialUrl}/search/tiktok`,
      //   { productName }
      // ).toPromise();

      const mockResult = {
        exists: true,
        firstPost: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
        url: `https://www.tiktok.com/search?q=${encodeURIComponent(productName)}`,
        engagement: 72,
      };

      this.logger.log(`TikTok search result for ${productName}:`, mockResult);
      return mockResult;
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
      // TODO: Replace with actual HTTP call to Python social service
      // const response = await this.httpService.post(
      //   `${this.socialUrl}/search/instagram`,
      //   { productName }
      // ).toPromise();

      const mockResult = {
        exists: Math.random() > 0.2,
        firstPost: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
        url: `https://www.instagram.com/explore/tags/${encodeURIComponent(productName.replace(/\s+/g, ""))}/`,
        engagement: 64,
      };

      this.logger.log(
        `Instagram search result for ${productName}:`,
        mockResult,
      );
      return mockResult;
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
      // TODO: Replace with actual HTTP call to Python social service
      // const response = await this.httpService.post(
      //   `${this.socialUrl}/search/twitter`,
      //   { productName }
      // ).toPromise();

      const mockResult = {
        exists: Math.random() > 0.3,
        firstPost: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21),
        url: `https://twitter.com/search?q=${encodeURIComponent(productName)}`,
        engagement: 58,
      };

      this.logger.log(`Twitter search result for ${productName}:`, mockResult);
      return mockResult;
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
      // TODO: Replace with actual HTTP call to Python social service
      // const response = await this.httpService.post(
      //   `${this.socialUrl}/search/facebook`,
      //   { productName }
      // ).toPromise();

      const mockResult = {
        exists: Math.random() > 0.4,
        firstPost: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45),
        url: `https://www.facebook.com/search/top?q=${encodeURIComponent(productName)}`,
        engagement: 49,
      };

      this.logger.log(`Facebook search result for ${productName}:`, mockResult);
      return mockResult;
    } catch (error) {
      this.logger.error(
        `Error searching Facebook: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { exists: false, firstPost: null, url: null, engagement: 0 };
    }
  }
}
