import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { UserRole } from 'src/common/schemas/common.enums';

function selectQuery(value: unknown) {
  return { select: () => Promise.resolve(value) };
}

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let userModel: { findById: jest.Mock };

  beforeEach(() => {
    userModel = { findById: jest.fn() };
    guard = new AdminGuard(userModel as unknown as never);
  });

  function makeContext(user: unknown) {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  it('rejects when no authenticated user is present (missing JWT)', async () => {
    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(userModel.findById).not.toHaveBeenCalled();
  });

  it('rejects when the user cannot be found', async () => {
    userModel.findById.mockReturnValue(selectQuery(null));
    await expect(
      guard.canActivate(makeContext({ userId: 'u1' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects non-admin users with 403', async () => {
    userModel.findById.mockReturnValue(selectQuery({ role: UserRole.CUSTOMER }));
    await expect(
      guard.canActivate(makeContext({ userId: 'u1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows admin users', async () => {
    userModel.findById.mockReturnValue(selectQuery({ role: UserRole.ADMIN }));
    await expect(
      guard.canActivate(makeContext({ userId: 'u1' })),
    ).resolves.toBe(true);
  });
});
