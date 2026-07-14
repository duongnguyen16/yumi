import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class AccessGeoDTO {
  @IsOptional()
  @IsString()
  type = 'Point' as const;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  coordinates!: [number, number];
}

export class AccessEvidenceDTO {
  @IsUrl()
  url!: string;

  @IsIn(['IMAGE', 'VIDEO', 'DOCUMENT'])
  fileType!: 'IMAGE' | 'VIDEO' | 'DOCUMENT';

  @IsOptional()
  @ValidateNested()
  @Type(() => AccessGeoDTO)
  geo?: AccessGeoDTO;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  accuracyMeters?: number;

  @IsOptional()
  @Type(() => Date)
  capturedAt?: Date;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
