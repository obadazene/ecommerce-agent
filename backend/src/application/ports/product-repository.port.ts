import { Product } from "../../domain/entities/product.entity";
import { SearchCriteria } from "../../domain/entities/search-criteria.entity";

export interface ProductRepositoryPort {
  save(product: Product): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  findNewProducts(): Promise<Product[]>;
  findByCriteria(criteria: SearchCriteria): Promise<Product[]>;
}
