import { Optional } from '@nestjs/common';
import { IsString } from 'class-validator';

export class AdvanceUpdateLocationDto {
  @Optional()
  @IsString({ message: 'Tên vị trí không hợp lệ' })
  name?: string;
}
