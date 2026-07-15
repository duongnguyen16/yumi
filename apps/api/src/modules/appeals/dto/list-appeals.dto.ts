import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { AppealStatus, AppealType } from 'src/common/schemas/common.enums';
import { AdminListView } from 'src/common/dto/admin-list-view.dto';

export class ListAppealsDTO {
  @IsOptional()
  @IsEnum(AdminListView)
  view: AdminListView = AdminListView.QUEUE;

  @IsOptional()
  @IsEnum(AppealStatus)
  status?: AppealStatus;

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
