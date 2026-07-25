type ReadNotification = {
  _id: string;
  isRead: boolean;
};

export function applyMarkOneRead<T extends ReadNotification>(
  notifications: T[],
  unreadCount: number,
  id: string,
  success: boolean,
) {
  if (!success) return { notifications, unreadCount };

  return {
    notifications: notifications.map((item) =>
      item._id === id ? { ...item, isRead: true } : item,
    ),
    unreadCount: Math.max(0, unreadCount - 1),
  };
}

export function applyMarkAllRead<T extends ReadNotification>(
  notifications: T[],
  unreadCount: number,
  success: boolean,
) {
  if (!success) return { notifications, unreadCount };

  return {
    notifications: notifications.map((item) => ({ ...item, isRead: true })),
    unreadCount: 0,
  };
}
