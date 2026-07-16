import { View } from "react-native";
import { Appbar, Icon, Surface, Text, TouchableRipple } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, elevation, fontFamily, navigationMetrics, radius, spacing } from "../tokens";
import type { IconName } from "./types";

type NavigationAction = { icon: IconName; label: string; onPress?: () => void };
type BottomTabAction = { accessibilityLabel: string; icon: IconName; onPress: () => void };

export function NavigationBar({ title, onBack, action }: { title: string; onBack?: () => void; action?: NavigationAction }) {
  return (
    <Appbar.Header elevated={false} mode="small" statusBarHeight={0} style={{ backgroundColor: colors.surfaceApp }}>
      {onBack ? <Appbar.BackAction accessibilityLabel="Quay lại" color={colors.textPrimary} onPress={onBack} /> : null}
      <Appbar.Content title={title} titleStyle={{ color: colors.textPrimary, fontFamily: fontFamily.semibold, textAlign: "left" }} />
      {action ? <Appbar.Action accessibilityLabel={action.label} color={colors.textPrimary} icon={action.icon} onPress={action.onPress} /> : null}
    </Appbar.Header>
  );
}

export function BottomTabBar({ action, items, selected, onSelect }: { action?: BottomTabAction; items: { label: string; icon: IconName }[]; selected: string; onSelect?: (label: string) => void }) {
  const insets = useSafeAreaInsets();
  const barWidth = items.length * navigationMetrics.itemWidth + Math.max(0, items.length - 1) * spacing[1] + navigationMetrics.barPadding * 2;

  return (
    <View pointerEvents="box-none" style={{ alignItems: "center", bottom: 0, left: 0, paddingBottom: Math.max(insets.bottom, spacing[2]), paddingHorizontal: navigationMetrics.horizontalInset, position: "absolute", right: 0 }}>
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing[2] }}>
        <Surface elevation={0} style={{ backgroundColor: colors.surfaceBase, borderRadius: radius.pill, boxShadow: elevation.floating, flexDirection: "row", gap: spacing[1], height: navigationMetrics.barHeight, padding: navigationMetrics.barPadding, width: barWidth }}>
          {items.map((item) => {
          const active = item.label === selected;
          return (
            <View key={item.label} style={{ borderRadius: radius.pill, overflow: "hidden", width: navigationMetrics.itemWidth }}>
              <TouchableRipple accessibilityRole="tab" accessibilityState={{ selected: active }} borderless onPress={() => onSelect?.(item.label)} rippleColor={colors.navigationRipple} style={{ backgroundColor: active ? colors.navigationSelected : colors.surfaceBase, borderRadius: radius.pill }}>
                <View style={{ alignItems: "center", gap: 1, height: navigationMetrics.itemHeight, justifyContent: "center", paddingHorizontal: navigationMetrics.itemHorizontalPadding, paddingVertical: navigationMetrics.itemVerticalPadding }}>
                  <Icon color={active ? colors.accentPrimary : colors.textSecondary} size={navigationMetrics.iconSize} source={item.icon} />
                  <Text numberOfLines={1} style={{ color: active ? colors.textPrimary : colors.textSecondary, fontFamily: active ? fontFamily.semibold : fontFamily.medium, fontSize: navigationMetrics.labelSize }}>{item.label}</Text>
                </View>
              </TouchableRipple>
            </View>
          );
          })}
        </Surface>
        {action ? (
          <View style={{ borderRadius: radius.pill, boxShadow: elevation.floating, overflow: "hidden" }}>
            <TouchableRipple accessibilityLabel={action.accessibilityLabel} accessibilityRole="button" borderless onPress={action.onPress} rippleColor={colors.navigationRipple} style={{ backgroundColor: colors.accentPrimary, borderRadius: radius.pill }}>
              <View style={{ alignItems: "center", height: navigationMetrics.barHeight, justifyContent: "center", width: navigationMetrics.barHeight }}>
                <Icon color={colors.textInverse} size={navigationMetrics.iconSize} source={action.icon} />
              </View>
            </TouchableRipple>
          </View>
        ) : null}
      </View>
    </View>
  );
}
