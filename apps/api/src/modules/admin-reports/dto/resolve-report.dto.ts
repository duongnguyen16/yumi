import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ResolveReportDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  resultReason!: string;

  @IsOptional()
  @IsString()
  removeReviewId?: string;
}
