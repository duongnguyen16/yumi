import type { ReactElement, ReactNode } from "react";
import { ScrollView, View, type RefreshControlProps, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { Text, type TextProps } from "react-native-paper";
import { colors, spacing, typography } from "../tokens";
import { Screen } from "./screen";

type AppTextVariant = keyof typeof typography;

export function AppText({ children, variant = "body", style, selectable = true, ...props }: Omit<TextProps<string>, "variant"> & { children: ReactNode; variant?: AppTextVariant; style?: StyleProp<TextStyle> }) {
  return (
    <Text {...props} selectable={selectable} style={[typography[variant], { color: colors.textPrimary }, style]}>
      {children}
    </Text>
  );
}

export function Stack({ children, gap = spacing[3], style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export function Inline({ children, gap = spacing[2], style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ alignItems: "center", flexDirection: "row", gap }, style]}>{children}</View>;
}

export function Page({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Screen style={style}>{children}</Screen>;
}

export function PageContent({ children, scrollable = true, style, refreshControl }: { children: ReactNode; scrollable?: boolean; style?: StyleProp<ViewStyle>; refreshControl?: ReactElement<RefreshControlProps> }) {
  const contentStyle: StyleProp<ViewStyle> = [{ gap: spacing[6], padding: spacing[4], paddingBottom: spacing[7] }, style];

  if (!scrollable) {
    return <View style={[{ flex: 1 }, contentStyle]}>{children}</View>;
  }

  return <ScrollView contentContainerStyle={contentStyle} contentInsetAdjustmentBehavior="automatic" refreshControl={refreshControl}>{children}</ScrollView>;
}
