import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewEditSuggestionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
