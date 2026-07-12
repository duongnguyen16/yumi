import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDate,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class DisputeGeoDTO {
  @IsIn(['Point'])
  type!: 'Point';

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  coordinates!: [number, number];
}

export class DisputeEvidenceDTO {
  @IsString()
  url!: string;

  @IsIn(['IMAGE', 'VIDEO', 'DOCUMENT'])
  fileType!: 'IMAGE' | 'VIDEO' | 'DOCUMENT';

  @IsOptional()
  @ValidateNested()
  @Type(() => DisputeGeoDTO)
  geo?: DisputeGeoDTO;

  @IsOptional()
  @IsNumber()
  accuracyMeters?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  capturedAt?: Date;
}

export class AddDisputeEvidenceDTO {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => DisputeEvidenceDTO)
  evidenceFiles!: DisputeEvidenceDTO[];
}
