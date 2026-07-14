import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { DisputeStatus } from 'src/common/schemas/common.enums';

export class ListDisputesDTO {
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus = DisputeStatus.OPEN;

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
