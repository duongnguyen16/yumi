import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  openingHours?: string;

  @IsMongoId()
  categoryId!: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  subCategoryIds?: string[];

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  accuracyMeters?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;
}
