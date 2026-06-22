import { IsEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const VN_PHONE_REGEX = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(VN_PHONE_REGEX, {
    message: 'So dien thoai phai dung dinh dang Viet Nam',
  })
  phone?: string;

  @IsOptional()
  @IsEmpty({ message: 'Email khong duoc phep thay doi' })
  email?: string;

  @IsOptional()
  @IsEmpty({ message: 'Role khong duoc phep thay doi' })
  role?: string;
}
