import { Product } from "../../domain/entities/product.entity";
import { ECommercePlatform } from "../../domain/value-objects/ecommerce-platform.vo";
import { ProductResponseDto } from "../dto/product-response.dto";

export class ProductMapper {
  static toPrisma(product: Product) {
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      currency: product.currency,
      url: product.url,
      platform: product.platform.toString(),
      source: product.source,
      imageUrl: product.imageUrl,
      sellerName: product.sellerName,
      sellerRating: product.sellerRating,
      launchDate: product.launchDate,
      criteriaScore: product.criteriaScore,
      isNew: product.isNew,
      createdAt: product.createdAt,
    };
  }

  static toDomain(model: any): Product {
    return new Product(
      model.id,
      model.name,
      model.price,
      model.url,
      ECommercePlatform.fromString(model.platform).toString(),
      model.source ?? null,
      model.currency ?? "USD",
      model.imageUrl ?? null,
      model.sellerName ?? null,
      model.sellerRating ?? null,
      model.launchDate ?? null,
      model.criteriaScore ?? null,
      model.isNew,
      model.createdAt,
    );
  }

  static toResponseDto(product: Product): ProductResponseDto {
    return new ProductResponseDto(
      product.id,
      product.name,
      product.price,
      product.currency,
      product.url,
      product.platform.toString(),
      product.source,
      product.imageUrl,
      product.sellerName,
      product.sellerRating,
      product.launchDate,
      product.criteriaScore ?? 0,
      product.isNew,
      product.createdAt,
    );
  }
}
