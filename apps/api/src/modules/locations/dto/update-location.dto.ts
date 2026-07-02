import { Optional } from '@nestjs/common';
import { IsArray, IsNumber, IsString } from 'class-validator';

export class UpdateLocationDto {
  @Optional()
  @IsString({ message: 'Giờ mở cửa không hợp lệ' })
  openingHours?: string;

  @Optional()
  @IsNumber()
  phone?: number;

  @Optional()
  @IsNumber()
  description?: number;

  @Optional()
  @IsString()
  categoryId?: string;

  @Optional()
  @IsArray()
  subCategoryIds?: string[];
}
