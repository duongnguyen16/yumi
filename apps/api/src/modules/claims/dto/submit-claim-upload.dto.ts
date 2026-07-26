import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  ValidateNested,
} from 'class-validator';
import { PendingOwnershipEvidenceDto } from '../../ownership-images/dto/pending-ownership-evidence.dto';

export class SubmitClaimUploadDto {
  @IsMongoId({ message: 'locationId không hợp lệ' })
  locationId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PendingOwnershipEvidenceDto)
  evidenceFiles!: PendingOwnershipEvidenceDto[];
}
