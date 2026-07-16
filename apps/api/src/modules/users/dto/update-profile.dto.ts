import {
  IsEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const VN_PHONE_REGEX = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @IsEmpty({
    message: 'Số điện thoại chỉ được thay đổi qua xác minh OTP',
  })
  @Matches(VN_PHONE_REGEX, {
    message: 'Số điện thoại phải đúng định dạng Việt Nam',
  })
  phone?: string;

  @IsOptional()
  @IsEmpty({ message: 'Email không được phép thay đổi' })
  email?: string;

  @IsOptional()
  @IsEmpty({ message: 'Role không được phép thay đổi' })
  role?: string;
}
