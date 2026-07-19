/**
 * SearchCriteria Entity - Core domain entity for product search criteria
 * This entity represents the user's product search criteria for filtering products
 * from e-commerce platforms like AliExpress.
 * Pure TypeScript - No framework dependencies.
 */

export class SearchCriteria {
  readonly id: string;
  readonly keyword: string;
  readonly maxPrice: number;
  readonly minSellerRating: number | null;
  readonly platforms: string[];
  readonly checkSocialMedia: boolean;

  constructor(
    id: string,
    keyword: string,
    maxPrice: number,
    platforms: string[],
    minSellerRating: number | null = null,
    checkSocialMedia: boolean = true,
  ) {
    // Validation
    this.validateKeyword(keyword);
    this.validateMaxPrice(maxPrice);
    this.validateMinSellerRating(minSellerRating);
    this.validatePlatforms(platforms);

    // Assignment
    this.id = id;
    this.keyword = keyword;
    this.maxPrice = maxPrice;
    this.minSellerRating = minSellerRating;
    this.platforms = platforms;
    this.checkSocialMedia = checkSocialMedia;
  }

  /**
   * Validates that the keyword is not empty
   */
  private validateKeyword(keyword: string): void {
    if (!keyword || keyword.trim().length === 0) {
      throw new Error("Search keyword must not be empty");
    }
  }

  /**
   * Validates that the max price is non-negative
   */
  private validateMaxPrice(maxPrice: number): void {
    if (maxPrice < 0) {
      throw new Error("Maximum price must be greater than or equal to 0");
    }
  }

  /**
   * Validates that the min seller rating is between 0-5 (if provided)
   */
  private validateMinSellerRating(minSellerRating: number | null): void {
    if (
      minSellerRating !== null &&
      (minSellerRating < 0 || minSellerRating > 5)
    ) {
      throw new Error("Seller rating must be between 0 and 5");
    }
  }

  /**
   * Validates that the platforms array is not empty
   */
  private validatePlatforms(platforms: string[]): void {
    if (!Array.isArray(platforms) || platforms.length === 0) {
      throw new Error("At least one platform must be defined");
    }
  }

  /**
   * Checks if a product matches the search criteria
   * @param product - The product to check
   * @returns true if product matches all criteria
   */
  matchesProduct(product: {
    price: number;
    sellerRating: number | null;
    platform: string;
  }): boolean {
    const matchesPrice = product.price <= this.maxPrice;
    const matchesRating =
      this.minSellerRating === null ||
      (product.sellerRating !== null &&
        product.sellerRating >= this.minSellerRating);
    const matchesPlatform = this.platforms.includes(product.platform);
    return matchesPrice && matchesRating && matchesPlatform;
  }
}
