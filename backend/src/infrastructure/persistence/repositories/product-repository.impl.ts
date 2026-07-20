import { Injectable } from "@nestjs/common";
import { ProductRepositoryPort } from "../../../application/ports/product-repository.port";
import { Product } from "../../../domain/entities/product.entity";
import { SearchCriteria } from "../../../domain/entities/search-criteria.entity";
import { PrismaService } from "../prisma.service";

@Injectable()
export class ProductRepositoryImpl implements ProductRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(product: Product): Promise<Product> {
    const safePrice =
      typeof product.price === "number" && !isNaN(product.price)
        ? product.price
        : 0;

    const prismaModel = await this.prisma.product.upsert({
      where: { id: product.id },
      create: {
        id: product.id,
        name: product.name,
        price: safePrice,
        currency: product.currency,
        url: product.url,
        platform: product.platform,
        source: product.source,
        imageUrl: product.imageUrl,
        sellerName: product.sellerName,
        sellerRating: product.sellerRating,
        launchDate: product.launchDate,
        criteriaScore: product.criteriaScore,
        isNew: product.isNew,
        createdAt: product.createdAt,
      },
      update: {
        name: product.name,
        price: safePrice,
        currency: product.currency,
        url: product.url,
        platform: product.platform,
        source: product.source,
        imageUrl: product.imageUrl,
        sellerName: product.sellerName,
        sellerRating: product.sellerRating,
        launchDate: product.launchDate,
        criteriaScore: product.criteriaScore,
        isNew: product.isNew,
        createdAt: product.createdAt,
      },
    });

    return this.toDomain(prismaModel);
  }

  async findById(id: string): Promise<Product | null> {
    const prismaModel = await this.prisma.product.findUnique({
      where: { id },
    });

    return prismaModel ? this.toDomain(prismaModel) : null;
  }

  async findAll(): Promise<Product[]> {
    const prismaModels = await this.prisma.product.findMany();
    return prismaModels.map((prismaModel: any) => this.toDomain(prismaModel));
  }

  async findNewProducts(): Promise<Product[]> {
    const prismaModels = await this.prisma.product.findMany({
      where: { isNew: true },
    });

    return prismaModels.map((prismaModel: any) => this.toDomain(prismaModel));
  }

  async findByCriteria(criteria: SearchCriteria): Promise<Product[]> {
    const prismaModels = await this.prisma.product.findMany({
      where: {
        platform: { in: criteria.platforms },
        price: { lte: criteria.maxPrice },
        sellerRating: criteria.minSellerRating
          ? { gte: criteria.minSellerRating }
          : undefined,
      },
    });

    return prismaModels.map((prismaModel: any) => this.toDomain(prismaModel));
  }

  private toDomain(prismaModel: any): Product {
    return new Product(
      prismaModel.id,
      prismaModel.name,
      prismaModel.price,
      prismaModel.url,
      prismaModel.platform,
      prismaModel.source ?? null,
      prismaModel.currency,
      prismaModel.imageUrl ?? null,
      prismaModel.sellerName ?? null,
      prismaModel.sellerRating ?? null,
      prismaModel.launchDate ?? null,
      prismaModel.criteriaScore ?? null,
      prismaModel.isNew,
      prismaModel.createdAt,
    );
  }
}
