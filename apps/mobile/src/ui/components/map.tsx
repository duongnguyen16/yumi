import type { ReactNode, RefObject } from "react";
import { View, type TextInput } from "react-native";
import { Searchbar, Surface } from "react-native-paper";
import { colors, radius, spacing } from "../tokens";
import { IconButton } from "./button";

export function MapSearchDock({ value, onChangeText, onFocus, onBack, inputRef }: { value: string; onChangeText: (value: string) => void; onFocus: () => void; onBack?: () => void; inputRef?: RefObject<TextInput | null> }) {
  return (
    <Searchbar
      elevation={3}
      icon={onBack ? "arrow-left" : "magnify"}
      inputStyle={{ color: colors.textPrimary, fontFamily: "Inter_400Regular" }}
      onChangeText={onChangeText}
      onFocus={onFocus}
      onIconPress={onBack}
      placeholder="Tìm kiếm địa điểm"
      placeholderTextColor={colors.textTertiary}
      ref={inputRef}
      style={{ backgroundColor: colors.surfaceBase, borderRadius: radius.large, left: spacing[4], position: "absolute", right: spacing[4], top: spacing[3], zIndex: 10 }}
      value={value}
    />
  );
}

export function MapControls({ onLocate, onAdd }: { onLocate: () => void; onAdd: () => void }) {
  return (
    <Surface elevation={3} style={{ backgroundColor: colors.surfaceBase, borderRadius: radius.pill, bottom: spacing[4], gap: spacing[2], padding: spacing[2], position: "absolute", right: spacing[4] }}>
      <IconButton icon="crosshairs-gps" label="Vị trí hiện tại" onPress={onLocate} />
      <IconButton icon="plus" label="Thêm địa điểm" onPress={onAdd} />
    </Surface>
  );
}

export function MapCanvas({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, position: "relative" }}>{children}</View>;
}
