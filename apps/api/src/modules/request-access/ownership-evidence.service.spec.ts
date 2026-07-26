import { UnprocessableEntityException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ImagesService } from '../images/images.service';
import { OwnershipEvidenceService } from './ownership-evidence.service';

describe('OwnershipEvidenceService', () => {
  const now = new Date('2026-07-25T10:00:00.000Z');
  const userId = new Types.ObjectId();
  const location = {
    geo: { type: 'Point' as const, coordinates: [105.8, 21] as [number, number] },
  };
  const images = {
    assertOwnedLocationMediaUrl: jest.fn(),
  };
  const verifier = new OwnershipEvidenceService(
    images as unknown as ImagesService,
  );
  const validEvidence = {
    url: `https://project.supabase.co/storage/v1/object/public/images/locations/${userId}/proof.jpg`,
    fileType: 'IMAGE' as const,
    geo: { type: 'Point' as const, coordinates: [105.8, 21] as [number, number] },
    accuracyMeters: 10,
    capturedAt: now,
  };

  beforeEach(() => {
    images.assertOwnedLocationMediaUrl.mockReset();
  });

  const evidence = (overrides: Record<string, unknown>) => ({
    ...validEvidence,
    ...overrides,
  });

  it.each([
    [
      'tọa độ cách địa điểm hơn 100m',
      evidence({ geo: { type: 'Point', coordinates: [105.8, 21.00091] } }),
    ],
    [
      'ảnh quá cũ',
      evidence({ capturedAt: new Date(now.getTime() - 10 * 60_000 - 1) }),
    ],
    ['accuracy kém', evidence({ accuracyMeters: 51 })],
  ])('từ chối %s', (_, file) => {
    expect(() => verifier.assertValid([file], location, userId, now)).toThrow(
      UnprocessableEntityException,
    );
  });

  it('chấp nhận bằng chứng trong phạm vi 100m', () => {
    const file = evidence({
      geo: { type: 'Point', coordinates: [105.8, 21.00089] },
    });

    expect(() => verifier.assertValid([file], location, userId, now)).not.toThrow();
  });

  it('chấp nhận đúng ngưỡng accuracy và thời gian', () => {
    const file = evidence({
      accuracyMeters: 50,
      capturedAt: new Date(now.getTime() - 10 * 60_000),
    });

    expect(() => verifier.assertValid([file], location, userId, now)).not.toThrow();
    expect(images.assertOwnedLocationMediaUrl).toHaveBeenCalledWith(
      userId,
      file.url,
    );
  });
});
