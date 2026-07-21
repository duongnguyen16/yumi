import {
  getNewAppealDestination,
  type AppealType,
} from "@/components/workflow/appeal-presentation";

export type NotificationReference = {
  type?: string;
  refCollection?: string;
  refId?: string;
};

const prefixes: Record<string, string> = {
  appeals: "/appeals",
  disputes: "/disputes",
  locations: "/location",
  request_accesses: "/request-access",
};

type AppealNotification = {
  refCollection: string;
  appealType: AppealType;
};

const appealNotifications: Record<string, AppealNotification> = {
  LOCATION_REJECTED: {
    refCollection: "location_requests",
    appealType: "LOCATION_REJECTED",
  },
  CLAIM_REJECTED: {
    refCollection: "claim_requests",
    appealType: "CLAIM_REJECTED",
  },
  LOCATION_DUPLICATE_HIDDEN: {
    refCollection: "locations",
    appealType: "DUPLICATE_HIDDEN",
  },
  REVIEW_REMOVED: {
    refCollection: "reviews",
    appealType: "REVIEW_REMOVED",
  },
  ACCOUNT_WARNED: {
    refCollection: "users",
    appealType: "USER_WARNED",
  },
  ACCOUNT_BANNED: {
    refCollection: "users",
    appealType: "USER_BANNED",
  },
};

export function getNotificationDestination(
  notification: NotificationReference,
): string | null {
  if (!notification.refCollection || !notification.refId) return null;

  const appealNotification = notification.type
    ? appealNotifications[notification.type]
    : undefined;
  const matchesCollection =
    appealNotification?.refCollection === notification.refCollection;

  if (appealNotification && matchesCollection) {
    return getNewAppealDestination(
      appealNotification.appealType,
      notification.refId,
    );
  }

  const prefix = prefixes[notification.refCollection];
  return prefix ? `${prefix}/${notification.refId}` : null;
}
