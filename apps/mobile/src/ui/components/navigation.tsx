import { Appbar, BottomNavigation } from "react-native-paper";
import { colors } from "../tokens";
import type { IconName } from "./types";

type NavigationAction = {
  icon: IconName;
  label: string;
  onPress?: () => void;
};

export function NavigationBar({ title, onBack, action }: { title: string; onBack?: () => void; action?: NavigationAction }) {
  return (
    <Appbar.Header elevated={false} mode="center-aligned" statusBarHeight={0} style={{ backgroundColor: colors.surfaceApp }}>
      {onBack ? <Appbar.BackAction color={colors.accentPrimary} onPress={onBack} /> : null}
      <Appbar.Content title={title} titleStyle={{ color: colors.textPrimary, fontFamily: "Inter_600SemiBold" }} />
      {action ? <Appbar.Action accessibilityLabel={action.label} color={colors.accentPrimary} icon={action.icon} onPress={action.onPress} /> : null}
    </Appbar.Header>
  );
}

export function BottomTabBar({ items, selected, onSelect }: { items: { label: string; icon: IconName; badge?: string }[]; selected: string; onSelect?: (label: string) => void }) {
  const index = Math.max(0, items.findIndex((item) => item.label === selected));
  const routes = items.map((item) => ({ badge: item.badge, focusedIcon: item.icon, key: item.label, title: item.label, unfocusedIcon: item.icon }));

  return (
    <BottomNavigation.Bar
      activeColor={colors.accentPrimary}
      activeIndicatorStyle={{ backgroundColor: colors.surfaceControl }}
      inactiveColor={colors.textSecondary}
      labeled
      navigationState={{ index, routes }}
      onTabPress={({ route }) => onSelect?.(route.key)}
      shifting={false}
      style={{ backgroundColor: colors.surfaceBase }}
    />
  );
}
