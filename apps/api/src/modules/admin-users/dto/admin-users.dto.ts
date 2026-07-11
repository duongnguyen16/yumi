import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateUserStatusDto {
  @IsString()
  @IsIn(['BANNED', 'WARNED', 'ACTIVE'])
  status!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateUserRoleDto {
  @IsString()
  @IsIn(['ADMIN', 'VENDOR', 'CUSTOMER'])
  role!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdjustTrustDto {
  @IsInt()
  @Min(-9999)
  pointChange!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
