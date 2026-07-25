import { IsMongoId, IsString, Length } from 'class-validator';

export class VerifyAccessOtpDTO {
  @IsMongoId()
  sessionId!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;
}
