import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

export class PendingGeoPointDto {
  @IsIn(['Point'])
  type!: 'Point';

  @IsArray()
  @IsNumber({}, { each: true })
  coordinates!: [number, number];
}

export class PendingOwnershipEvidenceDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PendingGeoPointDto)
  geo?: PendingGeoPointDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracyMeters?: number;

  @IsOptional()
  @IsISO8601()
  capturedAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
