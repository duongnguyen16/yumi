import { IsString, MaxLength, MinLength } from 'class-validator';

export class DismissReportDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  resultReason!: string;
}
