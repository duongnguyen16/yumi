import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsMongoId, ValidateNested } from 'class-validator';
import { AccessEvidenceDTO } from './access-evidence.dto';

export class VerifyTakeoverDTO {
  @IsMongoId()
  verificationSessionId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AccessEvidenceDTO)
  evidenceFiles!: AccessEvidenceDTO[];
}
