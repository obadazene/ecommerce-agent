/**
 * User Entity - Core domain entity for application users
 * This entity represents a user of the e-commerce agent application.
 * Pure TypeScript - No framework dependencies.
 */

export class User {
  readonly id: string;
  readonly email: string;
  readonly password: string;
  readonly name: string;
  readonly createdAt: Date;

  constructor(
    id: string,
    email: string,
    password: string,
    name: string,
    createdAt: Date = new Date(),
  ) {
    // Validation
    this.validateEmail(email);
    this.validatePassword(password);
    this.validateName(name);

    // Assignment
    this.id = id;
    this.email = email;
    this.password = password;
    this.name = name;
    this.createdAt = createdAt;
  }

  /**
   * Validates that the email is in a valid email format
   */
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error("Invalid email address");
    }
  }

  /**
   * Validates that the password is not empty
   */
  private validatePassword(password: string): void {
    if (!password || password.trim().length === 0) {
      throw new Error("Password must not be empty");
    }
  }

  /**
   * Validates that the name is not empty
   */
  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error("User name must not be empty");
    }
  }
}
