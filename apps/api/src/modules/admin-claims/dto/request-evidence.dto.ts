import { IsString, MaxLength, MinLength } from 'class-validator';

export class RequestEvidenceDTO {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  message!: string;
}
