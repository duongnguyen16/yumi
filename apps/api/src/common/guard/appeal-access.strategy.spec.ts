import { UnauthorizedException } from '@nestjs/common';
import { AppealAccessStrategy } from './appeal-access.strategy';
import { AtStrategy } from './at.strategy';

describe('Appeal access strategies', () => {
  const configService = {
    get: jest.fn(() => 'secret'),
  };

  it('rejects appeal-scoped tokens from normal protected routes', () => {
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
