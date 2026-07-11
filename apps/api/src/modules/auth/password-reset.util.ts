import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

export function generatePasswordResetCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function digestPasswordResetCode(
  email: string,
  code: string,
  secret: string,
): string {
  return createHmac('sha256', secret).update(`${email}:${code}`).digest('hex');
}

export function verifyPasswordResetCodeDigest(
  expectedDigest: string,
  actualDigest: string,
): boolean {
  const expected = Buffer.from(expectedDigest, 'hex');
  const actual = Buffer.from(actualDigest, 'hex');

  return (
    expected.length === actual.length &&
    expected.length > 0 &&
    timingSafeEqual(expected, actual)
  );
}

export function isBcryptHash(value: string): boolean {
  return BCRYPT_HASH_PATTERN.test(value);
}
