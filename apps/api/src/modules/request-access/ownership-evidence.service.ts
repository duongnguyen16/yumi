import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ImagesService } from '../images/images.service';
import { AccessEvidenceDTO } from './dto/access-evidence.dto';

const MAX_DISTANCE_METERS = 10000;
const MAX_ACCURACY_METERS = 50;
const MAX_AGE_MS = 10 * 60_000;
const MAX_FUTURE_SKEW_MS = 2 * 60_000;

@Injectable()
export class OwnershipEvidenceService {
  constructor(private readonly images: ImagesService) {}

  assertValid(
    files: AccessEvidenceDTO[],
    location: { geo?: { coordinates?: [number, number] } },
    userId: Types.ObjectId,
    now = new Date(),
  ) {
    this.assertMetadataValid(files, location, now);
    files.forEach((file) =>
      this.images.assertOwnedLocationMediaUrl(userId, file.url),
    );
  }

  assertMetadataValid(
    files: AccessEvidenceDTO[],
    location: { geo?: { coordinates?: [number, number] } },
    now = new Date(),
  ) {
    const accepted = files.some((file) => {
      this.assertFileValid(file, location, now);
      return true;
    });

    if (!accepted) {
      throw new UnprocessableEntityException(
        'Cần ảnh tại chỗ có vị trí và thời gian chụp',
      );
    }
  }

  private assertFileValid(
    file: AccessEvidenceDTO,
    location: { geo?: { coordinates?: [number, number] } },
    now: Date,
  ) {
    if (file.fileType !== 'IMAGE') {
      throw new UnprocessableEntityException('Bằng chứng tại chỗ phải là ảnh');
    }

    const fileCoordinates = file.geo?.coordinates;
    const locationCoordinates = location.geo?.coordinates;
    if (!fileCoordinates || !locationCoordinates) {
      throw new UnprocessableEntityException('Thiếu tọa độ bằng chứng');
    }

    const distance = getDistanceMeters(
      fileCoordinates[1],
      fileCoordinates[0],
      locationCoordinates[1],
      locationCoordinates[0],
    );
    if (distance > MAX_DISTANCE_METERS) {
      throw new UnprocessableEntityException(
        'Bằng chứng phải được chụp trong phạm vi 100m',
      );
    }

    if (
      file.accuracyMeters === undefined ||
      file.accuracyMeters > MAX_ACCURACY_METERS
    ) {
      throw new UnprocessableEntityException('Độ chính xác ảnh không hợp lệ');
    }

    const capturedAt = file.capturedAt ? new Date(file.capturedAt) : null;
    if (!capturedAt || Number.isNaN(capturedAt.getTime())) {
      throw new UnprocessableEntityException('Thiếu thời điểm chụp bằng chứng');
    }

    if (
      capturedAt.getTime() < now.getTime() - MAX_AGE_MS ||
      capturedAt.getTime() > now.getTime() + MAX_FUTURE_SKEW_MS
    ) {
      throw new UnprocessableEntityException(
        'Bằng chứng phải được chụp trong vòng 10 phút',
      );
    }
  }
}

function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const radius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
