import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { AccessEvidenceDTO } from '../../request-access/dto/access-evidence.dto';

export class AddDisputeEvidenceDTO {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => AccessEvidenceDTO)
  evidenceFiles!: AccessEvidenceDTO[];
}
