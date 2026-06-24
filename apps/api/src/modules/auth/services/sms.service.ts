import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EsmsSendResponse {
  CodeResult: string;
  CountRegenerate?: string;
  SMSID?: string;
  ErrorMessage?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly ESMS_SEND_URL =
    'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/';

  constructor(private readonly configService: ConfigService) {}

  async sendOtp(phone: string, otp: string): Promise<void> {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    if (!isProduction) {
      // Dev/test: in OTP ra console, không tốn phí SMS khi chạy local
      this.logger.warn(`[DEV MODE] OTP cho số ${phone}: ${otp}`);
      return;
    }

    const apiKey = this.configService.get<string>('ESMS_API_KEY');
    const secretKey = this.configService.get<string>('ESMS_SECRET_KEY');
    const brandname = this.configService.get<string>('ESMS_BRANDNAME');

    if (!apiKey || !secretKey) {
      throw new Error('Thiếu cấu hình ESMS_API_KEY / ESMS_SECRET_KEY trong .env');
    }

    const response = await fetch(this.ESMS_SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ApiKey: apiKey,
        SecretKey: secretKey,
        Phone: this.normalizePhone(phone),
        Content: `${otp} la ma xac minh dang ky tai khoan vendor cua ban`,
        Brandname: brandname,
        SmsType: '2', // tin gửi kèm Brandname chăm sóc khách hàng
        IsUnicode: '0', // không dấu, tránh lỗi hiển thị trên 1 số đầu mạng
      }),
    });

    if (!response.ok) {
      throw new Error(`eSMS API trả về lỗi HTTP ${response.status}`);
    }

    const data = (await response.json()) as EsmsSendResponse;

    if (data.CodeResult !== '100') {
      this.logger.error(`eSMS gửi OTP thất bại: ${JSON.stringify(data)}`);
      throw new Error('Gửi OTP thất bại, vui lòng thử lại sau');
    }
  }

  private normalizePhone(phone: string): string {
    // eSMS dùng định dạng 0xxxxxxxxx (10 số) — chuyển +84 thành 0
    return phone.startsWith('+84') ? `0${phone.slice(3)}` : phone;
  }
}