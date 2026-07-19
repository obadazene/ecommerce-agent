/**
 * ProductName Value Object - Represents a product name
 * This is an immutable value object that encapsulates a product name string.
 * Pure TypeScript - No framework dependencies.
 */
export class ProductName {
  private constructor(private readonly value: string) {
    this.validateName(value);
  }

  /**
   * Validates that the product name is not empty
   */
  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error("Product name must not be empty");
    }
  }

  /**
   * Creates a new ProductName value object
   * @param value - The product name string (must not be empty)
   * @returns A new ProductName instance
   * @throws Error if name is empty or only whitespace
   */
  static create(value: string): ProductName {
    return new ProductName(value.trim());
  }

  /**
   * Gets the product name value
   * @returns The product name
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Checks if the product name contains a keyword
   * @param keyword - The keyword to search for
   * @returns true if the product name contains the keyword (case-insensitive)
   */
  contains(keyword: string): boolean {
    if (!keyword || keyword.trim().length === 0) {
      return false;
    }
    return this.value.toLowerCase().includes(keyword.trim().toLowerCase());
  }
}
