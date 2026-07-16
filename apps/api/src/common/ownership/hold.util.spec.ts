import { ForbiddenException } from '@nestjs/common';
import { assertNotUnderHold, isUnderHold } from './hold.util';

describe('Kiểm thử khóa chuyển quyền sở hữu', () => {
  const now = new Date('2026-07-11T00:00:00.000Z');

  it('phát hiện khóa đang hiệu lực', () => {
    const loc = { holdExpiresAt: new Date('2026-07-12T00:00:00.000Z') };
    expect(isUnderHold(loc, now)).toBe(true);
  });

  it('coi khóa đã hết hạn là không còn hiệu lực', () => {
    const loc = { holdExpiresAt: new Date('2026-07-10T00:00:00.000Z') };
    expect(isUnderHold(loc, now)).toBe(false);
  });

  it('chặn thao tác phá hủy dữ liệu trong thời gian khóa', () => {
    const loc = { holdExpiresAt: new Date('2026-07-12T00:00:00.000Z') };
    expect(() => assertNotUnderHold(loc, 'EDIT_CORE_INFO', now)).toThrow(
      ForbiddenException,
    );
  });
});
