import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppealStatus, AppealType } from 'src/common/schemas/common.enums';
import { ResolveDisputeDTO } from '../disputes/dto/resolve-dispute.dto';
import { ResolveAppealDTO } from './dto/resolve-appeal.dto';
import { SubmitAppealDTO } from './dto/submit-appeal.dto';

describe('Kiểm thử giới hạn dữ liệu workflow', () => {
  it('từ chối nội dung kháng cáo dài hơn 500 ký tự', async () => {
    const dto = plainToInstance(SubmitAppealDTO, {
      type: AppealType.REQUEST_ACCESS_REJECTED,
      targetId: '507f1f77bcf86cd799439011',
      argument: 'a'.repeat(501),
      additionalEvidenceFiles: [
        {
          url: 'https://example.com/proof.jpg',
          fileType: 'IMAGE',
          capturedAt: '2026-07-23T08:00:00.000Z',
        },
      ],
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'argument')).toBe(true);
  });

  it('từ chối thời điểm chụp bằng chứng kháng cáo không hợp lệ', async () => {
    const dto = plainToInstance(SubmitAppealDTO, {
      type: AppealType.REQUEST_ACCESS_REJECTED,
      targetId: '507f1f77bcf86cd799439011',
      argument: 'Tôi có bằng chứng mới tại địa điểm',
      additionalEvidenceFiles: [
        {
          url: 'https://example.com/proof.jpg',
          fileType: 'IMAGE',
          capturedAt: 'không-phải-ngày',
        },
      ],
    });

    const errors = await validate(dto);
    const evidenceError = errors.find(
      (error) => error.property === 'additionalEvidenceFiles',
    );

    expect(evidenceError?.children?.length).toBeGreaterThan(0);
  });

  it.each([
    [
      ResolveAppealDTO,
      {
        decision: AppealStatus.UPHELD,
        reason: 'a'.repeat(501),
      },
    ],
    [
      ResolveDisputeDTO,
      {
        outcome: 'KEEP',
        reason: 'a'.repeat(501),
      },
    ],
  ])('từ chối lý do xử lý dài hơn 500 ký tự', async (Dto, payload) => {
    const dto = plainToInstance(Dto, payload);

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'reason')).toBe(true);
  });
});
