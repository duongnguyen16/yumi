import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { PendingOwnershipEvidenceDto } from '../../ownership-images/dto/pending-ownership-evidence.dto';

export class AddDisputeEvidenceUploadDTO {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => PendingOwnershipEvidenceDto)
  evidenceFiles!: PendingOwnershipEvidenceDto[];
}
