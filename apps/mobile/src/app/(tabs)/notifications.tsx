import {
  getNotifications,
  markAllAsRead,
  markOneAsRead,
} from "@/service/notificationService";
import type { Notification } from "@/service/notificationService";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const res = await getNotifications({ page: 1, limit: 30 });
    if (res.success) {
      setNotifications(res.data);
      setUnreadCount(res.unreadCount);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleMarkOneRead = async (id: string) => {
    await markOneAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: "#eee",
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>
          Thông báo {unreadCount > 0 ? `(${unreadCount})` : ""}
        </Text>
        {unreadCount > 0 && (
          <Button mode="text" onPress={handleMarkAllRead} compact>
            Đọc tất cả
          </Button>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View
            style={{ flex: 1, alignItems: "center", paddingTop: 60, gap: 8 }}
          >
            <Text style={{ fontSize: 40 }}>🔔</Text>
            <Text style={{ color: "gray" }}>Không có thông báo nào</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => !item.isRead && handleMarkOneRead(item._id)}
            style={{
              flexDirection: "row",
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#f0f0f0",
              backgroundColor: item.isRead ? "#fff" : "#fff8f0",
              gap: 12,
            }}
          >
            <View style={{ paddingTop: 4 }}>
              {!item.isRead && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "orange",
                  }}
                />
              )}
              {item.isRead && <View style={{ width: 8 }} />}
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  fontWeight: item.isRead ? "normal" : "bold",
                  fontSize: 15,
                }}
              >
                {item.title}
              </Text>
              <Text style={{ color: "gray", fontSize: 13, lineHeight: 18 }}>
                {item.body}
              </Text>
              <Text style={{ color: "#bbb", fontSize: 12 }}>
                {new Date(item.createdAt).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
