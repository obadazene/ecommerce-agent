/**
 * ECommercePlatformType Enum - Represents supported e-commerce platforms
 */
export enum ECommercePlatformType {
  ALIEXPRESS = "AliExpress",
  AMAZON = "Amazon",
  SHOPIFY = "Shopify",
  WOOCOMMERCE = "WooCommerce",
  EBAY = "eBay",
  TEMU = "Temu",
  OTHER = "Other",
}

/**
 * ECommercePlatform Value Object - Represents an e-commerce platform
 * This is an immutable value object that encapsulates an e-commerce platform type.
 * Pure TypeScript - No framework dependencies.
 */
export class ECommercePlatform {
  private constructor(private readonly platform: ECommercePlatformType) {}

  /**
   * Creates an ECommercePlatform from a string value
   * @param value - The platform name (case-insensitive)
   * @returns An ECommercePlatform instance
   */
  static fromString(value: string): ECommercePlatform {
    const normalized = value?.trim().toLowerCase();

    switch (normalized) {
      case "aliexpress":
        return new ECommercePlatform(ECommercePlatformType.ALIEXPRESS);
      case "amazon":
        return new ECommercePlatform(ECommercePlatformType.AMAZON);
      case "shopify":
        return new ECommercePlatform(ECommercePlatformType.SHOPIFY);
      case "woocommerce":
        return new ECommercePlatform(ECommercePlatformType.WOOCOMMERCE);
      case "ebay":
        return new ECommercePlatform(ECommercePlatformType.EBAY);
      case "temu":
        return new ECommercePlatform(ECommercePlatformType.TEMU);
      default:
        return new ECommercePlatform(ECommercePlatformType.OTHER);
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
   * @returns The ECommercePlatformType enum value
   */
  getValue(): ECommercePlatformType {
    return this.platform;
  }
}
