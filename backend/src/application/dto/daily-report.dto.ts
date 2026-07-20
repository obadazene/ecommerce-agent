import { ProductResponseDto } from "./product-response.dto";

export class DailyReportDto {
  constructor(
    public readonly date: Date,
    public readonly dataQuality:
      | "live-data"
      | "fallback-cache"
      | "blocked-source"
      | "demo-fallback"
      | "mixed-source",
    public readonly totalProducts: number,
    public readonly matchingProducts: number,
    public readonly newProducts: number,
    public readonly averageScore: number,
    public readonly products: ProductResponseDto[],
    public readonly nonWinningProducts: ProductResponseDto[],
  ) {}
}
