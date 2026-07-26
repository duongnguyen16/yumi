export const MAX_LOCATION_IMAGE_UPLOAD = 5;

export function getRemainingImageSlots(selectedCount: number) {
  return Math.max(0, MAX_LOCATION_IMAGE_UPLOAD - selectedCount);
}

export function canManageLocationImages({
  role,
  userId,
  ownerId,
}: {
  role?: string;
  userId?: string;
  ownerId?: string;
}) {
  return role === "VENDOR" && Boolean(userId) && userId === ownerId;
}

export function canSubmitImageUpload({
  selectedCount,
  saving,
}: {
  selectedCount: number;
  saving: boolean;
}) {
  return (
    !saving &&
    selectedCount > 0 &&
    selectedCount <= MAX_LOCATION_IMAGE_UPLOAD
  );
}

export function canEditImageSelection({ saving }: { saving: boolean }) {
  return !saving;
}
