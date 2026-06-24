import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class VerifyVendorOtpDTO {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @Length(6, 6, { message: 'OTP phải gồm đúng 6 số' })
  otp!: string;
}