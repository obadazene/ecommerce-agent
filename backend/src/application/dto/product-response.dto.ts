export class ProductResponseDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly price: number,
    public readonly currency: string,
    public readonly url: string,
    public readonly platform: string,
    public readonly source: string | null,
    public readonly imageUrl: string | null,
    public readonly sellerName: string | null,
    public readonly sellerRating: number | null,
    public readonly launchDate: Date | null,
    public readonly criteriaScore: number | null,
    public readonly isNew: boolean,
    public readonly createdAt: Date,
  ) {}
}
