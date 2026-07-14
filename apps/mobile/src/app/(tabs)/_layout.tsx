import { getUnreadCount } from "@/service/notificationService";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";

function BellIcon() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    // Lấy số notification chưa đọc khi mount tab layout
    getUnreadCount().then((res) => {
      if (res.success) setUnread(res.count);
    });

    // Poll mỗi 60 giây (đơn giản, không cần websocket ở giai đoạn này)
    const interval = setInterval(() => {
      getUnreadCount().then((res) => {
        if (res.success) setUnread(res.count);
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <TouchableOpacity
      onPress={() => router.push("/notifications")}
      style={{ marginRight: 16, position: "relative" }}
    >
      <Feather name="bell" size={24} color="#333" />
      {unread > 0 && (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -6,
            backgroundColor: "red",
            borderRadius: 8,
            minWidth: 16,
            height: 16,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 3,
          }}
        >
          <Text style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>
            {unread > 99 ? "99+" : String(unread)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerRight: () => <BellIcon />,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          headerShown: true,
          headerTitle: "YuMi",
          tabBarIcon: (color) => (
            <AntDesign name="home" size={24} color={color.color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: true,
          headerTitle: "Hồ sơ",
          tabBarIcon: (color) => (
            <Feather name="user" size={24} color={color.color} />
          ),
        }}
      />
    </Tabs>
  );
}