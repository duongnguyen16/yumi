import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ClaimRequestStatus } from 'src/common/schemas/common.enums';

export class ListClaimsDTO {
  @IsOptional()
  @IsEnum(ClaimRequestStatus)
  status?: ClaimRequestStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
