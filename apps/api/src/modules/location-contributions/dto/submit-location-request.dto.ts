import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsLatitude,
  IsLongitude,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class SubmitLocationRequestDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  openingHours?: string;

  @IsMongoId()
  categoryId!: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  tagIds?: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address!: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsLatitude()
  deviceLatitude!: number;

  @IsLongitude()
  deviceLongitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracyMeters?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  imageUrls!: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  suspectedDuplicateLocationIds?: string[];
}
