import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ConfirmDuplicateLocationDTO {
  @IsString()
  @IsNotEmpty({ message: 'Phải nhập lý do xác nhận trùng lặp' })
  @MinLength(5)
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  duplicateOfLocationId?: string;
}
