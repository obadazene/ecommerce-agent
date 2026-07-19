import { ProductResponseDto } from "./product-response.dto";

export class DailyReportDto {
  constructor(
    public readonly date: Date,
    public readonly totalProducts: number,
    public readonly matchingProducts: number,
    public readonly newProducts: number,
    public readonly averageScore: number,
    public readonly products: ProductResponseDto[],
  ) {}
}
