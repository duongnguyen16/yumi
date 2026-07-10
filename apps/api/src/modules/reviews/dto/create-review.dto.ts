import {
  ArrayMaxSize,
  IsArray,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReviewDto {
  @IsMongoId()
  locationId!: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @MinLength(20)
  comment!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsUrl({}, { each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsNumber()
  deviceLatitude?: number;

  @IsOptional()
  @IsNumber()
  deviceLongitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracyMeters?: number;
}
