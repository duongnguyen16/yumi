import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const VN_PHONE_REGEX = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;

export class RequestVendorOtpDTO {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @Matches(VN_PHONE_REGEX, {
    message: 'Số điện thoại phải đúng định dạng Việt Nam',
  })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  business_name!: string;

  @Matches(VN_PHONE_REGEX, {
    message: 'Số điện thoại doanh nghiệp phải đúng định dạng Việt Nam',
  })
  business_phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  business_address?: string;
}
