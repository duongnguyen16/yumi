import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSubCategoryDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;
}
