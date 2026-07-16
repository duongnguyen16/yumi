import type { ReactElement, ReactNode } from "react";
import {
  ScrollView,
  View,
  type RefreshControlProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Text, type TextProps } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTabContentBottomPadding } from "@/navigation/tab-content-inset";
import { colors, spacing, typography } from "../tokens";
import { Screen } from "./screen";

type AppTextVariant = keyof typeof typography;

export function AppText({
  children,
  variant = "body",
  style,
  selectable = true,
  ...props
}: Omit<TextProps<string>, "variant"> & {
  children: ReactNode;
  variant?: AppTextVariant;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      {...props}
      selectable={selectable}
      style={[typography[variant], { color: colors.textPrimary }, style]}
    >
      {children}
    </Text>
  );
}

export function Stack({
  children,
  gap = spacing[3],
  style,
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export function Inline({
  children,
  gap = spacing[2],
  style,
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ alignItems: "center", flexDirection: "row", gap }, style]}>
      {children}
    </View>
  );
}

export function Page({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <Screen style={style}>{children}</Screen>;
}

export function PageHeader({
  title,
  supportingText,
}: {
  title: string;
  supportingText?: string;
}) {
  return (
    <Stack gap={spacing[1]}>
      <AppText variant="title1">{title}</AppText>
      {supportingText ? (
        <AppText style={{ color: colors.textSecondary }} variant="subhead">
          {supportingText}
        </AppText>
      ) : null}
    </Stack>
  );
}

export function PageContent({
  children,
  scrollable = true,
  style,
  refreshControl,
  tabBarInset = false,
}: {
  children: ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  refreshControl?: ReactElement<RefreshControlProps>;
  tabBarInset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const contentStyle: StyleProp<ViewStyle> = [
    {
      gap: spacing[5],
      padding: spacing[4],
      paddingBottom: tabBarInset
        ? getTabContentBottomPadding(insets.bottom)
        : spacing[7],
    },
    style,
  ];

  if (!scrollable) {
    return <View style={[{ flex: 1 }, contentStyle]}>{children}</View>;
  }

  return (
    <ScrollView
      contentContainerStyle={contentStyle}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}
