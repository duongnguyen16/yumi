import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AccessEvidenceDTO } from './access-evidence.dto';

export class CreateRequestAccessDTO {
  @IsMongoId()
  locationId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => AccessEvidenceDTO)
  evidenceFiles?: AccessEvidenceDTO[];
}
