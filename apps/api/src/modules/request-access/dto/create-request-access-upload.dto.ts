import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PendingOwnershipEvidenceDto } from '../../ownership-images/dto/pending-ownership-evidence.dto';

export class CreateRequestAccessUploadDTO {
  @IsMongoId()
  locationId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsMongoId()
  verificationSessionId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => PendingOwnershipEvidenceDto)
  evidenceFiles!: PendingOwnershipEvidenceDto[];
}
