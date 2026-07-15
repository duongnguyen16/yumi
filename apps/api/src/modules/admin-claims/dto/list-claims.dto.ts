import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ClaimRequestStatus } from 'src/common/schemas/common.enums';
import { AdminListView } from 'src/common/dto/admin-list-view.dto';

export class ListClaimsDTO {
  @IsOptional()
  @IsEnum(AdminListView)
  view: AdminListView = AdminListView.QUEUE;

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
