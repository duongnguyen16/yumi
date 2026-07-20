import type { DisputeSide } from "./dispute-presentation";

export const appealTypes = [
  "REQUEST_ACCESS_REJECTED",
  "LOCATION_REJECTED",
  "CLAIM_REJECTED",
  "DUPLICATE_HIDDEN",
  "OWNERSHIP_REVOKED",
  "REVIEW_REMOVED",
  "USER_BANNED",
  "USER_WARNED",
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
  CLAIM_REJECTED: {
    label: "Yêu cầu sở hữu bị từ chối",
    description: "Yêu cầu xác nhận quyền sở hữu của bạn đã bị từ chối.",
  },
  DUPLICATE_HIDDEN: {
    label: "Địa điểm bị ẩn do trùng lặp",
    description: "Địa điểm của bạn đã bị ẩn vì được xác định là trùng lặp.",
  },
  OWNERSHIP_REVOKED: {
    label: "Quyền quản lý bị thu hồi",
    description: "Quyền quản lý địa điểm của bạn đã bị thu hồi.",
  },
  REVIEW_REMOVED: {
    label: "Đánh giá bị gỡ",
    description: "Đánh giá của bạn đã bị quản trị viên gỡ.",
  },
  USER_BANNED: {
    label: "Tài khoản bị cấm",
    description: "Tài khoản của bạn đã bị cấm sử dụng.",
  },
  USER_WARNED: {
    label: "Tài khoản bị cảnh báo",
    description: "Tài khoản của bạn đã nhận cảnh báo.",
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
  if (status === "WARNED") return "USER_WARNED";
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
