import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewLocationRequestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  rejectReason?: string;
}
