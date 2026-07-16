import { getUnreadCount } from "@/service/notificationService";
import {
  formatUnreadBadge,
  MAIN_TABS,
  MainTabIcon,
  SHOW_TABS_HEADER,
} from "@/navigation/mainTabs";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import type { ColorValue } from "react-native";

function TabIcon({ icon, color }: { icon: MainTabIcon; color: ColorValue }) {
  if (icon === "home") {
    return <AntDesign name="home" size={24} color={color} />;
  }

  return <Feather name={icon} size={24} color={color} />;
}

export default function TabsLayout() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const refreshUnreadCount = () => {
      getUnreadCount().then((res) => {
        if (isMounted && res.success) setUnread(res.count);
      });
    };

    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: SHOW_TABS_HEADER,
      }}
    >
      {MAIN_TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarBadge:
              tab.name === "notifications"
                ? formatUnreadBadge(unread)
                : undefined,
            tabBarIcon: ({ color }) => (
              <TabIcon icon={tab.icon} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
