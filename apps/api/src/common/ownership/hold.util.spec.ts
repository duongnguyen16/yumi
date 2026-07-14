import { ForbiddenException } from '@nestjs/common';
import { assertNotUnderHold, isUnderHold } from './hold.util';

describe('ownership hold', () => {
  const now = new Date('2026-07-11T00:00:00.000Z');

  it('detects an active hold', () => {
    const loc = { holdExpiresAt: new Date('2026-07-12T00:00:00.000Z') };
    expect(isUnderHold(loc, now)).toBe(true);
  });

  it('treats an expired hold as inactive', () => {
    const loc = { holdExpiresAt: new Date('2026-07-10T00:00:00.000Z') };
    expect(isUnderHold(loc, now)).toBe(false);
  });

  it('blocks destructive actions during hold', () => {
    const loc = { holdExpiresAt: new Date('2026-07-12T00:00:00.000Z') };
    expect(() => assertNotUnderHold(loc, 'EDIT_CORE_INFO', now)).toThrow(
      ForbiddenException,
    );
  });
});
