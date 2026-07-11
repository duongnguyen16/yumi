import { IsString, Matches } from 'class-validator';

const VN_PHONE_REGEX = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;

export class SendPhoneVerificationOtpDto {
  @IsString()
  @Matches(VN_PHONE_REGEX, {
    message: 'Số điện thoại phải đúng định dạng Việt Nam',
  })
  phone!: string;
}

export class VerifyPhoneVerificationOtpDto {
  @IsString()
  otp!: string;
}
