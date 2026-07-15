import { getUnreadCount } from "@/service/notificationService";
import {
  formatUnreadBadge,
  MAIN_TABS,
  SHOW_TABS_HEADER,
} from "@/navigation/mainTabs";
import { BottomTabBar } from "@/ui/components";
import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";

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
      tabBar={({ state, navigation }) => {
        const selected = MAIN_TABS.find((tab) => tab.name === state.routes[state.index]?.name)?.title ?? MAIN_TABS[0].title;

        return (
          <BottomTabBar
            items={MAIN_TABS.map((tab) => ({ badge: tab.name === "activity" ? formatUnreadBadge(unread) : undefined, icon: tab.icon, label: tab.title }))}
            onSelect={(label) => {
              const tab = MAIN_TABS.find((item) => item.title === label);
              if (tab) navigation.navigate(tab.name);
            }}
            selected={selected}
          />
        );
      }}
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
          }}
        />
      ))}
    </Tabs>
  );
}
