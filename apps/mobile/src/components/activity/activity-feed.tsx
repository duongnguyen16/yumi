import { getNotificationDestination } from "@/navigation/notification-destination";
import { getNotifications, markAllAsRead, markOneAsRead, type Notification } from "@/service/notificationService";
import { ActivityRow, Button, EmptyState, LoadingState, NoticeSnackbar } from "@/ui/components";
import { colors, spacing } from "@/ui/tokens";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTabContentBottomPadding } from "@/navigation/tab-content-inset";

export default function ActivityFeed() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const fetchNotifications = useCallback(async () => {
    const response = await getNotifications({ page: 1, limit: 30 });
    if (response.success) {
      setNotifications(response.data);
      setUnreadCount(response.unreadCount);
    } else setMessage("Không thể tải thông báo.");
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchNotifications).finally(() => setLoading(false));
  }, [fetchNotifications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleMarkOneRead = async (id: string) => {
    await markOneAsRead(id);
    setNotifications((current) => current.map((item) => item._id === id ? { ...item, isRead: true } : item));
    setUnreadCount((current) => Math.max(0, current - 1));
  };

  const handleOpen = async (item: Notification) => {
    if (!item.isRead) await handleMarkOneRead(item._id);
    const destination = getNotificationDestination(item);
    if (destination) router.push(destination as never);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  };

  if (loading) return <View style={{ flex: 1 }}><LoadingState label="Đang tải thông báo" /></View>;

  return (
    <>
      <FlatList
      ListEmptyComponent={<EmptyState icon="bell-outline" supportingText="Thông báo và cập nhật quy trình sẽ xuất hiện tại đây." title="Chưa có thông báo" />}
      ListHeaderComponent={unreadCount > 0 ? <Button label="Đọc tất cả" onPress={handleMarkAllRead} size="small" variant="tertiary" /> : null}
      contentContainerStyle={{ flexGrow: 1, gap: spacing[2], padding: spacing[4], paddingBottom: getTabContentBottomPadding(insets.bottom) }}
      contentInsetAdjustmentBehavior="automatic"
      data={notifications}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={refreshing} tintColor={colors.accentPrimary} />}
      renderItem={({ item }) => <ActivityRow icon="bell-outline" onPress={() => handleOpen(item)} supportingText={item.body} timestamp={new Date(item.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "2-digit", year: "numeric" })} title={item.title} unread={!item.isRead} />}
      />
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </>
  );
}
