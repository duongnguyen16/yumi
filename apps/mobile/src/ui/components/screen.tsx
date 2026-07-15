import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../tokens";

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[{ backgroundColor: colors.surfaceApp, flex: 1, paddingTop: insets.top }, style]}>
      {children}
    </View>
  );
}
