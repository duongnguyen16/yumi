import { userContext } from "@/contexts/userContext";
import { invokeExploreLocationAction } from "@/navigation/exploreTabAction";
import { getMainTabs, SHOW_TABS_HEADER } from "@/navigation/mainTabs";
import { shouldSelectTab } from "@/navigation/tab-selection";
import { BottomTabBar } from "@/ui/components";
import { Tabs } from "expo-router";
import React, { useContext } from "react";
import { StyleSheet } from "react-native";

const routeNames = ["home", "mine", "manage", "activity", "profile"] as const;

export default function TabsLayout() {
  const { user } = useContext(userContext);
  const tabs = getMainTabs(typeof user?.role === "string" ? user.role : null);

  return (
    <Tabs
      tabBar={({ state, descriptors, navigation }) => {
        const route = state.routes[state.index];
        const activeTabStyle = StyleSheet.flatten(
          descriptors[route.key]?.options.tabBarStyle,
        ) as { display?: string } | undefined;
        if (activeTabStyle?.display === "none") return null;

        const selected =
          tabs.find((tab) => tab.name === route.name)?.title ?? tabs[0].title;

        return (
          <BottomTabBar
            action={
              route.name === "home"
                ? {
                    accessibilityLabel: "Vị trí hiện tại",
                    icon: "crosshairs-gps",
                    onPress: invokeExploreLocationAction,
                  }
                : undefined
            }
            items={tabs.map((tab) => ({ icon: tab.icon, label: tab.title }))}
            onSelect={(label) => {
              const tab = tabs.find((item) => item.title === label);
              if (tab && shouldSelectTab(route.name, tab.name)) {
                navigation.navigate(tab.name);
              }
            }}
            selected={selected}
          />
        );
      }}
      screenOptions={{ headerShown: SHOW_TABS_HEADER }}
    >
      {routeNames.map((name) => {
        const activeTab = tabs.find((tab) => tab.name === name);
        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              href: activeTab ? undefined : null,
              title: activeTab?.title ?? name,
            }}
          />
        );
      })}
    </Tabs>
  );
}
