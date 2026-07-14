import { IsMongoId, IsString, Length } from 'class-validator';

export class VerifyClaimOtpDto {
  @IsMongoId({ message: 'locationId không hợp lệ' })
  locationId!: string;

  @IsString()
  @Length(6, 6, { message: 'OTP phải gồm 6 chữ số' })
  otp!: string;
}
