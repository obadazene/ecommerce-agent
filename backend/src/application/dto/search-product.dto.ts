import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class SearchProductDto {
  @IsString()
  @IsNotEmpty()
  keyword!: string;

  @IsNumber()
  @Min(0)
  maxPrice!: number;

  @IsOptional()
  @IsArray()
  platforms!: string[];

  @IsOptional()
  @IsBoolean()
  checkSocialMedia!: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minSales?: number;
}
