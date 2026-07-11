import {
  digestPasswordResetCode,
  generatePasswordResetCode,
  isBcryptHash,
  verifyPasswordResetCodeDigest,
} from './password-reset.util';

describe('password reset utilities', () => {
  it('generates exactly six numeric characters', () => {
    for (let index = 0; index < 50; index += 1) {
      expect(generatePasswordResetCode()).toMatch(/^\d{6}$/);
    }
  });

  it('verifies only matching email, code, and secret combinations', () => {
    const digest = digestPasswordResetCode(
      'user@example.com',
      '123456',
      'secret',
    );

    expect(
      verifyPasswordResetCodeDigest(
        digest,
        digestPasswordResetCode('user@example.com', '123456', 'secret'),
      ),
    ).toBe(true);
    expect(
      verifyPasswordResetCodeDigest(
        digest,
        digestPasswordResetCode('user@example.com', '654321', 'secret'),
      ),
    ).toBe(false);
  });

  it('detects supported bcrypt hash prefixes', () => {
    expect(
      isBcryptHash('$2b$12$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuuuu'),
    ).toBe(true);
    expect(isBcryptHash('plain-text-password')).toBe(false);
  });
});
