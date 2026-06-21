/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import AuthService from './auth.service';
import { PasswordResetEmailService } from './password-reset-email.service';
import { digestPasswordResetCode } from './password-reset.util';

const email = 'user@example.com';
const resetSecret = 'reset-secret';

type PasswordUpdate = {
  $set: { password_hash: string };
};

type ResetCodeCreatePayload = {
  email: string;
  code_digest: string;
  attempts: number;
};

function createService() {
  const userModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    updateOne:
      jest.fn<
        (
          filter: unknown,
          update: PasswordUpdate,
        ) => Promise<{ matchedCount: number }>
      >(),
  };
  const passwordResetCodeModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    create:
      jest.fn<(payload: ResetCodeCreatePayload) => Promise<{ _id: string }>>(),
    deleteOne: jest.fn(),
  };
  const jwtService = {
    sign: jest
      .fn()
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token'),
  };
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        ACCESS_TOKEN_SECRET: 'access-secret',
        REFRESH_TOKEN_SECRET: 'refresh-secret',
        PASSWORD_RESET_CODE_SECRET: resetSecret,
      };
      return values[key];
    }),
  };
  const emailService = {
    sendCode: jest.fn(),
  };

  const service = new AuthService(
    userModel as never,
    passwordResetCodeModel as never,
    jwtService as unknown as JwtService,
    configService as unknown as ConfigService,
    emailService as unknown as PasswordResetEmailService,
  );

  return {
    service,
    userModel,
    passwordResetCodeModel,
    jwtService,
    emailService,
  };
}

describe('AuthService password recovery', () => {
  it('supports bcrypt login without exposing the password hash', async () => {
    const { service, userModel } = createService();
    const passwordHash = await bcrypt.hash('password123', 4);
    userModel.findOne.mockResolvedValue({
      _id: 'user-id',
      email,
      password_hash: passwordHash,
      status: 'active',
      toObject: () => ({
        _id: 'user-id',
        email,
        password_hash: passwordHash,
        status: 'active',
      }),
    });

    const result = await service.login(email, 'password123');

    expect(result.success).toBe(true);
    expect(result.user).not.toHaveProperty('password_hash');
    expect(userModel.updateOne).not.toHaveBeenCalled();
  });

  it('upgrades a legacy plaintext password after successful login', async () => {
    const { service, userModel } = createService();
    userModel.findOne.mockResolvedValue({
      _id: 'user-id',
      email,
      password_hash: 'password123',
      status: 'active',
      toObject: () => ({
        _id: 'user-id',
        email,
        password_hash: 'password123',
        status: 'active',
      }),
    });
    userModel.updateOne.mockResolvedValue({ matchedCount: 1 });

    await service.login(email, 'password123');

    const passwordUpdate = userModel.updateOne.mock.calls[0][1];
    expect(
      await bcrypt.compare('password123', passwordUpdate.$set.password_hash),
    ).toBe(true);
  });

  it('returns the same forgot-password response for an unknown email', async () => {
    const { service, userModel, emailService } = createService();
    userModel.findOne.mockResolvedValue(null);

    const result = await service.forgotPassword(email);

    expect(result.success).toBe(true);
    expect(emailService.sendCode).not.toHaveBeenCalled();
  });

  it('creates and emails a one-time code for an existing account', async () => {
    const { service, userModel, passwordResetCodeModel, emailService } =
      createService();
    userModel.findOne.mockResolvedValue({ _id: 'user-id' });
    passwordResetCodeModel.findOne.mockResolvedValue(null);
    passwordResetCodeModel.updateMany.mockResolvedValue({});
    passwordResetCodeModel.create.mockResolvedValue({ _id: 'code-id' });
    emailService.sendCode.mockResolvedValue(undefined);

    const result = await service.forgotPassword(email);

    expect(result.success).toBe(true);
    const createPayload = passwordResetCodeModel.create.mock.calls[0][0];
    expect(createPayload.email).toBe(email);
    expect(createPayload.code_digest).toMatch(/^[a-f0-9]{64}$/);
    expect(createPayload.attempts).toBe(0);
    expect(emailService.sendCode).toHaveBeenCalledWith(
      email,
      expect.stringMatching(/^\d{6}$/),
    );
  });

  it('rejects an incorrect code and increments its attempts', async () => {
    const { service, passwordResetCodeModel } = createService();
    const resetCode = {
      _id: 'code-id',
      user_id: 'user-id',
      email,
      code_digest: digestPasswordResetCode(email, '123456', resetSecret),
      expires_at: new Date(Date.now() + 60_000),
      attempts: 0,
    };
    passwordResetCodeModel.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(resetCode),
    });
    passwordResetCodeModel.findOneAndUpdate.mockResolvedValue({
      ...resetCode,
      attempts: 1,
    });

    await expect(
      service.resetPassword(email, '654321', 'password123'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(passwordResetCodeModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'code-id' }),
      { $inc: { attempts: 1 } },
      { new: true },
    );
  });

  it('consumes a valid code and stores a bcrypt password hash', async () => {
    const { service, userModel, passwordResetCodeModel } = createService();
    const resetCode = {
      _id: 'code-id',
      user_id: 'user-id',
      email,
      code_digest: digestPasswordResetCode(email, '123456', resetSecret),
      expires_at: new Date(Date.now() + 60_000),
      attempts: 0,
    };
    passwordResetCodeModel.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(resetCode),
    });
    passwordResetCodeModel.findOneAndUpdate.mockResolvedValue(resetCode);
    passwordResetCodeModel.updateMany.mockResolvedValue({});
    userModel.updateOne.mockResolvedValue({ matchedCount: 1 });

    const result = await service.resetPassword(email, '123456', 'password123');

    expect(result.success).toBe(true);
    const update = userModel.updateOne.mock.calls[0][1];
    expect(await bcrypt.compare('password123', update.$set.password_hash)).toBe(
      true,
    );
  });
});
