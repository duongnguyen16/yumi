import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { AppealStatus, AppealType } from 'src/common/schemas/common.enums';

export class ListAppealsDTO {
  @IsOptional()
  @IsEnum(AppealStatus)
  status?: AppealStatus = AppealStatus.PENDING;

  @IsOptional()
  @IsEnum(AppealType)
  type?: AppealType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
