import { Type } from 'class-transformer';
import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SearchDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit!: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Dữ liệu không hợp lệ' })
  @IsLatitude({ message: 'Dữ liệu không hợp lệ' })
  lat!: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Dữ liệu không hợp lệ' })
  @IsLongitude({ message: 'Dữ liệu không hợp lệ' })
  lng!: number;
}
