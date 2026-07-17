import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsMongoId,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AppealType } from 'src/common/schemas/common.enums';

export class AppealEvidenceDTO {
  @IsString()
  url!: string;

  @IsIn(['IMAGE', 'VIDEO', 'DOCUMENT'])
  fileType!: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
}

export class SubmitAppealDTO {
  @IsEnum(AppealType)
  type!: AppealType;

  @IsMongoId()
  targetId!: string;

  // lý do kháng nghị
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  argument!: string;

  // bằng chứng bổ sung
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => AppealEvidenceDTO)
  additionalEvidenceFiles!: AppealEvidenceDTO[];
}
