/**
 * Product Entity - Core domain entity for e-commerce products
 * This entity represents a product found on an e-commerce platform.
 * Pure TypeScript - No framework dependencies.
 */

export class Product {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly currency: string;
  readonly url: string;
  readonly platform: string;
  readonly source: string | null;
  readonly imageUrl: string | null;
  readonly sellerName: string | null;
  readonly sellerRating: number | null;
  readonly launchDate: Date | null;
  readonly criteriaScore: number | null;
  readonly isNew: boolean;
  readonly createdAt: Date;

  constructor(
    id: string,
    name: string,
    price: number,
    url: string,
    platform: string,
    source: string | null = null,
    currency: string = "USD",
    imageUrl: string | null = null,
    sellerName: string | null = null,
    sellerRating: number | null = null,
    launchDate: Date | null = null,
    criteriaScore: number | null = null,
    isNew: boolean = false,
    createdAt: Date = new Date(),
  ) {
    // Validation
    this.validateName(name);
    this.validatePrice(price);
    this.validatePlatform(platform);
    this.validateUrl(url);
    this.validateSellerRating(sellerRating);
    this.validateCriteriaScore(criteriaScore);

    // Assignment
    this.id = id;
    this.name = name;
    this.price = price;
    this.currency = currency;
    this.url = url;
    this.platform = platform;
    this.source = source;
    this.imageUrl = imageUrl;
    this.sellerName = sellerName;
    this.sellerRating = sellerRating;
    this.launchDate = launchDate;
    this.criteriaScore = criteriaScore;
    this.isNew = isNew;
    this.createdAt = createdAt;
  }

  /**
   * Validates that the product name is not empty
   */
  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error("Product name cannot be empty");
    }
  }

  /**
   * Validates that the price is non-negative
   */
  private validatePrice(price: number): void {
    if (price < 0) {
      throw new Error("Product price cannot be negative");
    }
  }

  /**
   * Validates that the platform is not empty
   */
  private validatePlatform(platform: string): void {
    if (!platform || platform.trim().length === 0) {
      throw new Error("Product platform cannot be empty");
    }
  }

  /**
   * Validates that the URL is either empty or in a valid format
   */
  private validateUrl(url: string): void {
    if (!url || url.trim().length === 0) {
      return;
    }

    try {
      new URL(url);
    } catch {
      throw new Error("Product URL must be a valid URL format");
    }
  }

  /**
   * Validates that the seller rating is between 0 and 5 (if provided)
   */
  private validateSellerRating(sellerRating: number | null): void {
    if (sellerRating !== null && (sellerRating < 0 || sellerRating > 5)) {
      throw new Error("Seller rating must be between 0 and 5");
    }
  }

  /**
   * Validates that the criteria score is between 0 and 100 (if provided)
   */
  private validateCriteriaScore(criteriaScore: number | null): void {
    if (criteriaScore !== null && (criteriaScore < 0 || criteriaScore > 100)) {
      throw new Error("Criteria score must be between 0 and 100");
    }
  }

  /**
   * Determines if the product was recently launched
   * @param days - Number of days to consider as "recent" (default: 14)
   * @returns true if launchDate exists and is within the specified days
   */
  isRecentlyLaunched(days: number = 14): boolean {
    if (!this.launchDate) {
      return false;
    }

    const now = new Date();
    const dayInMs = 24 * 60 * 60 * 1000;
    const timeDifference = now.getTime() - this.launchDate.getTime();
    const daysDifference = timeDifference / dayInMs;

    return daysDifference <= days && daysDifference >= 0;
  }

  /**
   * Determines if the product meets the score threshold
   * @param threshold - Minimum score to consider as "high" (default: 50)
   * @returns true if criteriaScore exists and is >= threshold
   */
  hasHighScore(threshold: number = 50): boolean {
    if (this.criteriaScore === null) {
      return false;
    }

    return this.criteriaScore >= threshold;
  }

  /**
   * Checks if the product name matches a keyword
   * @param keyword - The keyword to search for
   * @returns true if product name contains the keyword (case-insensitive)
   */
  matchesKeyword(keyword: string): boolean {
    if (!keyword || keyword.trim().length === 0) {
      return false;
    }

    return this.name.toLowerCase().includes(keyword.toLowerCase());
  }
}
