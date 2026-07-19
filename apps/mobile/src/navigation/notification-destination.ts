export type NotificationReference = { type?: string; refCollection?: string; refId?: string };

const prefixes: Record<string, string> = {
  appeals: "/appeals",
  disputes: "/disputes",
  locations: "/location",
  request_accesses: "/request-access",
};

export function getNotificationDestination(notification: NotificationReference): string | null {
  if (!notification.refCollection || !notification.refId) return null;
  if (
    notification.type === "LOCATION_DUPLICATE_HIDDEN" &&
    notification.refCollection === "locations"
  ) {
    return `/appeals/new?type=DUPLICATE_HIDDEN&targetId=${notification.refId}`;
  }
  const prefix = prefixes[notification.refCollection];
  return prefix ? `${prefix}/${notification.refId}` : null;
}
