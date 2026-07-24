import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsISO8601,
  IsMongoId,
  IsOptional,
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

  @IsOptional()
  @IsISO8601()
  capturedAt?: string;
}

export class SubmitAppealDTO {
  @IsEnum(AppealType)
  type!: AppealType;

  @IsMongoId()
  targetId!: string;

  // lý do kháng nghị
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  argument!: string;

  // bằng chứng bổ sung
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => AppealEvidenceDTO)
  additionalEvidenceFiles!: AppealEvidenceDTO[];
}
