export type NotificationReference = { refCollection?: string; refId?: string };

const prefixes: Record<string, string> = {
  appeals: "/appeals",
  disputes: "/disputes",
  locations: "/location",
  request_accesses: "/request-access",
};

export function getNotificationDestination(notification: NotificationReference): string | null {
  if (!notification.refCollection || !notification.refId) return null;
  const prefix = prefixes[notification.refCollection];
  return prefix ? `${prefix}/${notification.refId}` : null;
}
