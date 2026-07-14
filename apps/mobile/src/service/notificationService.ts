import api from "./aixos";

export type Notification = {
  _id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  refCollection?: string;
  refId?: string;
};

const getNotifications = async (params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}) => {
  try {
    const response = await api.get("/notifications", { params });
    return response.data as {
      success: boolean;
      data: Notification[];
      total: number;
      unreadCount: number;
      page: number;
      limit: number;
    };
  } catch {
    return { success: false, data: [], total: 0, unreadCount: 0, page: 1, limit: 20 };
  }
};

const getUnreadCount = async () => {
  try {
    const response = await api.get("/notifications/unread-count");
    return response.data as { success: boolean; count: number };
  } catch {
    return { success: false, count: 0 };
  }
};

const markOneAsRead = async (id: string) => {
  try {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  } catch {
    return { success: false };
  }
};

const markAllAsRead = async () => {
  try {
    const response = await api.patch("/notifications/read-all");
    return response.data;
  } catch {
    return { success: false };
  }
};

export { getNotifications, getUnreadCount, markAllAsRead, markOneAsRead };