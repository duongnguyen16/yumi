import type { ReactNode, RefObject } from "react";
import { Text, View, type TextInput } from "react-native";
import { Badge, FAB, IconButton as PaperIconButton, Searchbar, Surface } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, elevation, fontFamily, navigationMetrics, radius, spacing } from "../tokens";
import { IconButton } from "./button";

export function MapSearchDock({ value, notificationCount = 0, isSearchOpen, onChangeText, onSearchClose, onSearchOpen, onNotifications, inputRef }: { value: string; notificationCount?: number; isSearchOpen: boolean; onChangeText: (value: string) => void; onSearchClose: () => void; onSearchOpen: () => void; onNotifications: () => void; inputRef?: RefObject<TextInput | null> }) {
  const insets = useSafeAreaInsets();
  const top = insets.top + spacing[2];

  if (isSearchOpen) {
    return <Searchbar elevation={0} icon="arrow-left" inputStyle={{ color: colors.textPrimary, fontFamily: fontFamily.regular, fontSize: 15, minHeight: 0 }} onChangeText={onChangeText} onIconPress={onSearchClose} placeholder="Tìm kiếm địa điểm" placeholderTextColor={colors.textSecondary} ref={inputRef} style={{ backgroundColor: colors.surfaceBase, borderRadius: radius.pill, boxShadow: elevation.floating, left: spacing[4], position: "absolute", right: spacing[4], top, height: 48, zIndex: 10 }} value={value} />;
  }

  return (
    <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", left: spacing[4], position: "absolute", right: spacing[4], top, zIndex: 10 }}>
      <View>
        <PaperIconButton accessibilityLabel="Thông báo" containerColor={colors.surfaceBase} icon="bell-outline" iconColor={colors.textPrimary} mode="contained" onPress={onNotifications} size={22} style={{ borderRadius: radius.pill, boxShadow: elevation.floating, height: 48, margin: 0, width: 48 }} />
        {notificationCount > 0 ? <Badge size={18} style={{ backgroundColor: colors.accentPrimary, color: colors.textInverse, position: "absolute", right: -2, top: -2 }}>{notificationCount > 99 ? "99+" : notificationCount}</Badge> : null}
      </View>
      <View pointerEvents="none" style={{ alignItems: "center", flexDirection: "row", justifyContent: "center", position: "absolute", width: "100%" }}>
        <Text selectable={false} style={{ color: colors.textPrimary, fontFamily: "serif", fontSize: 29, fontWeight: "700", letterSpacing: 0, lineHeight: 34 }}>Yu<Text style={{ color: colors.accentPrimary, fontStyle: "italic" }}>mi</Text></Text>
      </View>
      <PaperIconButton accessibilityLabel="Tìm kiếm địa điểm" containerColor={colors.surfaceBase} icon="magnify" iconColor={colors.textPrimary} mode="contained" onPress={onSearchOpen} size={22} style={{ borderRadius: radius.pill, boxShadow: elevation.floating, height: 48, margin: 0, width: 48 }} />
    </View>
  );
}

export function MapControls({ onLocate, onAdd }: { onLocate: () => void; onAdd?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ alignItems: "flex-end", bottom: navigationMetrics.barHeight + Math.max(insets.bottom, spacing[2]) + spacing[3], gap: spacing[2], position: "absolute", right: spacing[4] }}>
      <Surface elevation={0} style={{ backgroundColor: colors.surfaceBase, borderRadius: radius.pill, boxShadow: elevation.floating, padding: spacing[1] }}><IconButton icon="crosshairs-gps" label="Vị trí hiện tại" onPress={onLocate} /></Surface>
      {onAdd ? <FAB color={colors.textInverse} icon="plus" onPress={onAdd} size="small" style={{ backgroundColor: colors.accentPrimary, borderRadius: radius.xlarge, boxShadow: elevation.floating }} /> : null}
    </View>
  );
}

export function MapCanvas({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, position: "relative" }}>{children}</View>;
}
