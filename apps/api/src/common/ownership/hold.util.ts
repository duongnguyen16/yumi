import { ForbiddenException } from '@nestjs/common';
import { Location } from 'src/common/schemas/location.schema';

export type HoldAction =
  'HIDE_LOCATION' | 'BULK_DELETE_PRODUCTS' | 'EDIT_CORE_INFO';

export function isUnderHold(
  loc: Pick<Location, 'holdExpiresAt'>,
  now = new Date(),
) {
  if (!loc.holdExpiresAt) return false;
  return now < loc.holdExpiresAt;

}

export function assertNotUnderHold(
  loc: Pick<Location, 'holdExpiresAt'>,
  action: HoldAction,
  now = new Date(),
) {
  if (!isUnderHold(loc, now)) return;
  const until = loc.holdExpiresAt?.toISOString();
  throw new ForbiddenException(
    `Địa điểm đang khóa chuyển quyền đến ${until}. Không thể thực hiện: ${action}.`,
  );
}
