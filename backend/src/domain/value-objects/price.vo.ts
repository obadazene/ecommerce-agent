/**
 * Price Value Object - Represents a monetary price
 * This is an immutable value object that encapsulates a numeric price value.
 * Pure TypeScript - No framework dependencies.
 */
export class Price {
  private constructor(private readonly value: number) {
    this.validatePrice(value);
  }

  /**
   * Validates that the price is non-negative
   */
  private validatePrice(price: number): void {
    if (price < 0) {
      throw new Error("Price must be greater than or equal to 0");
    }
  }

  /**
   * Creates a new Price value object
   * @param value - The numeric price value (must be >= 0)
   * @returns A new Price instance
   * @throws Error if price is negative
   */
  static create(value: number): Price {
    return new Price(value);
  }

  /**
   * Gets the numeric price value
   * @returns The price value
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Compares this price with another price
   * @param other - The price to compare with
   * @returns true if this price is greater than the other price
   */
  isGreaterThan(other: Price): boolean {
    return this.value > other.value;
  }

  /**
   * Compares this price with another price
   * @param other - The price to compare with
   * @returns true if this price is less than the other price
   */
  isLessThan(other: Price): boolean {
    return this.value < other.value;
  }

  /**
   * Compares this price with another price for equality
   * @param other - The price to compare with
   * @returns true if both prices are equal
   */
  isEqual(other: Price): boolean {
    return this.value === other.value;
  }
}
