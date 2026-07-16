import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { AdminListView } from 'src/common/dto/admin-list-view.dto';

export class ListPendingRequestsDTO {
  @IsOptional()
  @IsEnum(AdminListView)
  view: AdminListView = AdminListView.QUEUE;

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
  limit = 30;
}
