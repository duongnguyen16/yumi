import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
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
  coordinates?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}
