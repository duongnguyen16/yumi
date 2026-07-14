import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class GeoPointDto {
  @IsIn(['Point'])
  type!: 'Point';

  @IsArray()
  @IsNumber({}, { each: true })
  coordinates!: [number, number];
}

export class EvidenceFileDto {
  @IsString()
  url!: string;

  @IsIn(['IMAGE', 'VIDEO', 'DOCUMENT'])
  fileType!: 'IMAGE' | 'VIDEO' | 'DOCUMENT';

  @IsOptional()
  @ValidateNested()
  @Type(() => GeoPointDto)
  geo?: GeoPointDto;

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

export class SubmitClaimDto {
  @IsMongoId({ message: 'locationId không hợp lệ' })
  locationId!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Cần ít nhất 1 ảnh hiện trường' })
  @ValidateNested({ each: true })
  @Type(() => EvidenceFileDto)
  evidenceFiles!: EvidenceFileDto[];

  @IsOptional()
  @IsString()
  licenseUrl?: string;
}
