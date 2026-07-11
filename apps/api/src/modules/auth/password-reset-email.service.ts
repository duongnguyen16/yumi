import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class PasswordResetEmailService {
  constructor(private readonly configService: ConfigService) {}

  async sendCode(email: string, code: string): Promise<void> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const from = this.configService.get<string>('RESEND_FROM_EMAIL');

    if (!apiKey || !from) {
      throw new InternalServerErrorException(
        'Dịch vụ email chưa được cấu hình',
      );
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: 'Mã đặt lại mật khẩu YuMi',
      text: `Mã đặt lại mật khẩu của bạn là ${code}. Mã có hiệu lực trong 10 phút.`,
      html: [
        '<div style="font-family:Arial,sans-serif;line-height:1.6">',
        '<h2>Đặt lại mật khẩu YuMi</h2>',
        '<p>Dùng mã sau để đặt lại mật khẩu:</p>',
        `<p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p>`,
        '<p>Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>',
        '</div>',
      ].join(''),
    });

    if (error) {
      throw new InternalServerErrorException('Không thể gửi email xác nhận');
    }
  }
}
