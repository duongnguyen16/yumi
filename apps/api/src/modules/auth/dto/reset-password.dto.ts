import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, Matches, MinLength } from 'class-validator';
import { IsPasswordByteLength } from '../validators/password-byte-length.validator';

export class ResetPasswordDTO {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @Matches(/^\d{6}$/, { message: 'Mã xác nhận phải gồm đúng 6 chữ số' })
  code!: string;

  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @IsPasswordByteLength(72)
  newPassword!: string;
}
