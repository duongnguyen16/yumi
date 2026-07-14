import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RejectRequestDTO {
  @IsString()
  @IsNotEmpty({ message: 'Phải nhập lý do từ chối' })
  @MinLength(5)
  @MaxLength(500)
  reason!: string;

  // từ chối vì trùng → kèm ID bản gốc để lưu vào lý do
  @IsOptional()
  @IsString()
  duplicateOfLocationId?: string;
}
