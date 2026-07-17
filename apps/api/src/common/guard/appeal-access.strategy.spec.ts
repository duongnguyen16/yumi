import { UnauthorizedException } from '@nestjs/common';
import { AppealAccessStrategy } from './appeal-access.strategy';
import { AtStrategy } from './at.strategy';

describe('Kiểm thử chiến lược truy cập kháng nghị', () => {
  const configService = {
    get: jest.fn(() => 'secret'),
  };

  it('từ chối token giới hạn cho kháng nghị tại các tuyến được bảo vệ thông thường', () => {
    const strategy = new AtStrategy(configService as never);

    expect(() =>
      strategy.validate({ userId: 'user-1', scope: 'appeal' }),
    ).toThrow(UnauthorizedException);
  });

  it.each([
    { userId: 'user-1' },
    { userId: 'user-1', scope: 'appeal' as const },
  ])('accepts $scope tokens on appeal routes', (payload) => {
    const strategy = new AppealAccessStrategy(configService as never);

    expect(strategy.validate(payload)).toEqual({ userId: 'user-1' });
  });
});
