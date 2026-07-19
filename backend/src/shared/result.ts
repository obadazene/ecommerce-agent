export class Result<T> {
  private constructor(
    private readonly success: boolean,
    private readonly value: T | null,
    private readonly error: string | null,
  ) {}

  static success<T>(value: T): Result<T> {
    return new Result<T>(true, value, null);
  }

  static failure<T>(error: string): Result<T> {
    return new Result<T>(false, null, error);
  }

  isSuccess(): boolean {
    return this.success;
  }

  isFailure(): boolean {
    return !this.success;
  }

  getValue(): T {
    if (!this.success) {
      throw new Error("Cannot get value from failed result");
    }
    return this.value as T;
  }

  getError(): string {
    if (this.success) {
      throw new Error("Cannot get error from successful result");
    }
    return this.error as string;
  }
}
