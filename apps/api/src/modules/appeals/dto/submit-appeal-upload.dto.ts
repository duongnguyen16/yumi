import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsMongoId,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AppealType } from 'src/common/schemas/common.enums';
import { PendingOwnershipEvidenceDto } from '../../ownership-images/dto/pending-ownership-evidence.dto';

export class SubmitAppealUploadDTO {
  @IsIn(Object.values(AppealType))
  type!: AppealType;

  @IsMongoId()
  targetId!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  argument!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => PendingOwnershipEvidenceDto)
  additionalEvidenceFiles!: PendingOwnershipEvidenceDto[];
}
