import { AppText, NavigationBar, Page, Stack } from "@/ui/components";
import { colors, spacing } from "@/ui/tokens";
import { Stack as RouterStack } from "expo-router";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, ScrollView, View } from "react-native";

export default function AuthScreen({ title, supportingText, children, footer, onBack }: { title: string; supportingText: string; children: ReactNode; footer?: ReactNode; onBack?: () => void }) {
  return (
    <Page>
      <RouterStack.Screen options={{ headerShown: false }} />
      {onBack ? <NavigationBar onBack={onBack} title="" /> : null}
      <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, gap: spacing[6], padding: spacing[4], paddingBottom: spacing[6] }} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
          <Stack gap={spacing[2]}>
            <AppText style={{ color: colors.accentPrimary }} variant="title1">YuMi</AppText>
            <AppText variant="largeTitle">{title}</AppText>
            <AppText style={{ color: colors.textSecondary }} variant="subhead">{supportingText}</AppText>
          </Stack>
          <View style={{ flex: 1 }}>{children}</View>
          {footer}
        </ScrollView>
      </KeyboardAvoidingView>
    </Page>
  );
}
