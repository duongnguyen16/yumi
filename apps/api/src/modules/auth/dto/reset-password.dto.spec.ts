import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ResetPasswordDTO } from './reset-password.dto';

describe('ResetPasswordDTO', () => {
  it('normalizes email and accepts a valid request', async () => {
    const dto = plainToInstance(ResetPasswordDTO, {
      email: ' User@Example.com ',
      code: '123456',
      newPassword: 'password123',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.email).toBe('user@example.com');
  });

  it('rejects malformed codes and short passwords', async () => {
    const dto = plainToInstance(ResetPasswordDTO, {
      email: 'user@example.com',
      code: '12345a',
      newPassword: 'short',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['code', 'newPassword']),
    );
  });

  it('rejects passwords longer than 72 UTF-8 bytes', async () => {
    const dto = plainToInstance(ResetPasswordDTO, {
      email: 'user@example.com',
      code: '123456',
      newPassword: 'á'.repeat(37),
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'newPassword')).toBe(true);
  });
});
