export interface SocialMediaPort {
  searchTikTok(
    productName: string,
  ): Promise<{
    exists: boolean;
    firstPost: Date | null;
    url: string | null;
    engagement: number;
  }>;
  searchInstagram(
    productName: string,
  ): Promise<{
    exists: boolean;
    firstPost: Date | null;
    url: string | null;
    engagement: number;
  }>;
  searchTwitter(
    productName: string,
  ): Promise<{
    exists: boolean;
    firstPost: Date | null;
    url: string | null;
    engagement: number;
  }>;
  searchFacebook(
    productName: string,
  ): Promise<{
    exists: boolean;
    firstPost: Date | null;
    url: string | null;
    engagement: number;
  }>;
}
