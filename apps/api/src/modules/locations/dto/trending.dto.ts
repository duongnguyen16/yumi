import { IsEnum, IsMongoId } from 'class-validator';

export class TrendingDto {
  @IsMongoId({ message: 'categoryId không hợp lệ' })
  categoryId!: string;

  @IsEnum(['viewCount', 'reviewCount', 'rating'], {
    message: 'sortBy phải là viewCount, reviewCount hoặc rating',
  })
  sortBy!: 'viewCount' | 'reviewCount' | 'rating';
}