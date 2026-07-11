import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ValidateLocationPositionDto {
  @IsLatitude()
  pinLatitude!: number;

  @IsLongitude()
  pinLongitude!: number;

  @IsLatitude()
  deviceLatitude!: number;

  @IsLongitude()
  deviceLongitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracyMeters?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
