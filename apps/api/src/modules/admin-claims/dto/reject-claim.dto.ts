import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectClaimDTO {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
