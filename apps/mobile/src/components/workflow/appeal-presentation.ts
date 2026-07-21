import type { DisputeSide } from "./dispute-presentation";

export const appealTypes = [
  "REQUEST_ACCESS_REJECTED",
  "LOCATION_REJECTED",
  "OWNERSHIP_REVOKED",
  "USER_BANNED",
] as const;

export type AppealType = (typeof appealTypes)[number];

type AppealPresentation = {
  label: string;
  description: string;
};

type AppealReference = {
  type: string;
  targetId: string;
};

const appealTypeSet = new Set<string>(appealTypes);

const presentations: Record<AppealType, AppealPresentation> = {
  REQUEST_ACCESS_REJECTED: {
    label: "Yêu cầu quyền quản lý bị từ chối",
    description: "Yêu cầu truy cập địa điểm của bạn đã bị từ chối.",
  },
  LOCATION_REJECTED: {
    label: "Địa điểm đăng ký bị từ chối",
    description: "Địa điểm bạn gửi đăng ký đã bị từ chối.",
  },
  OWNERSHIP_REVOKED: {
    label: "Quyền quản lý bị thu hồi",
    description: "Quyền quản lý địa điểm của bạn đã bị thu hồi.",
  },
  USER_BANNED: {
    label: "Tài khoản bị cấm",
    description: "Tài khoản của bạn đã bị cấm sử dụng.",
  },
};

export function isAppealType(value: unknown): value is AppealType {
  if (typeof value !== "string") return false;
  return appealTypeSet.has(value);
}

export function getAppealPresentation(
  value: unknown,
): AppealPresentation | null {
  if (!isAppealType(value)) return null;
  return presentations[value];
}

export function getNewAppealDestination(type: AppealType, targetId: string) {
  const encodedType = encodeURIComponent(type);
  const encodedTargetId = encodeURIComponent(targetId);
  return `/appeals/new?type=${encodedType}&targetId=${encodedTargetId}`;
}

export function getAccountAppealType(status: unknown): AppealType | null {
  if (status === "BANNED") return "USER_BANNED";
  return null;
}

export function hasAppealForTarget(
  appeals: readonly AppealReference[],
  type: AppealType,
  targetId: string,
) {
  return appeals.some((appeal) => {
    const matchesType = appeal.type === type;
    const matchesTarget = String(appeal.targetId) === targetId;
    return matchesType && matchesTarget;
  });
}

export function canAppealOwnershipRevoke(
  status: string | null | undefined,
  side: DisputeSide | null,
) {
  const wasRevoked = status === "RESOLVED_REVOKE";
  const isPreviousOwner = side === "OWNER_AT_OPEN";
  return wasRevoked && isPreviousOwner;
}
