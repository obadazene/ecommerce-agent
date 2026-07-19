/**
 * SocialMediaPlatformType Enum - Represents supported social media platforms
 */
export enum SocialMediaPlatformType {
  TIKTOK = "TikTok",
  INSTAGRAM = "Instagram",
  TWITTER = "Twitter",
  FACEBOOK = "Facebook",
  YOUTUBE = "YouTube",
  PINTEREST = "Pinterest",
  OTHER = "Other",
}

/**
 * SocialMediaPlatform Value Object - Represents a social media platform
 * This is an immutable value object that encapsulates a social media platform type.
 * Pure TypeScript - No framework dependencies.
 */
export class SocialMediaPlatform {
  private constructor(private readonly platform: SocialMediaPlatformType) {}

  /**
   * Creates a SocialMediaPlatform from a string value
   * @param value - The platform name (case-insensitive, supports "x" for Twitter)
   * @returns A SocialMediaPlatform instance
   */
  static fromString(value: string): SocialMediaPlatform {
    const normalized = value?.trim().toLowerCase();

    switch (normalized) {
      case "tiktok":
        return new SocialMediaPlatform(SocialMediaPlatformType.TIKTOK);
      case "instagram":
        return new SocialMediaPlatform(SocialMediaPlatformType.INSTAGRAM);
      case "twitter":
      case "x":
        return new SocialMediaPlatform(SocialMediaPlatformType.TWITTER);
      case "facebook":
        return new SocialMediaPlatform(SocialMediaPlatformType.FACEBOOK);
      case "youtube":
        return new SocialMediaPlatform(SocialMediaPlatformType.YOUTUBE);
      case "pinterest":
        return new SocialMediaPlatform(SocialMediaPlatformType.PINTEREST);
      default:
        return new SocialMediaPlatform(SocialMediaPlatformType.OTHER);
    }
  }

  /**
   * Gets the string representation of the platform
   * @returns The platform name
   */
  toString(): string {
    return this.platform;
  }

  /**
   * Gets the platform type value
   * @returns The SocialMediaPlatformType enum value
   */
  getValue(): SocialMediaPlatformType {
    return this.platform;
  }
}
