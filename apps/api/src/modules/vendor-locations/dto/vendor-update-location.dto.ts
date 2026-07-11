import {
  IsArray,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  openingHours?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  subCategoryIds?: string[];

  @IsOptional()
  @IsNumber()
  pinLatitude?: number;

  @IsOptional()
  @IsNumber()
  pinLongitude?: number;

  @IsOptional()
  @IsNumber()
  deviceLatitude?: number;

  @IsOptional()
  @IsNumber()
  deviceLongitude?: number;
}
