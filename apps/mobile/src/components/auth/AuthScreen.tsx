import { AppText, NavigationBar, Page } from "@/ui/components";
import { colors, spacing } from "@/ui/tokens";
import { Stack as RouterStack } from "expo-router";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, View } from "react-native";

export default function AuthScreen({ title, supportingText, children, footer, onBack }: { title: string; supportingText: string; children: ReactNode; footer?: ReactNode; onBack?: () => void }) {
  return (
    <Page>
      <RouterStack.Screen options={{ headerShown: false }} />
      <NavigationBar onBack={onBack} title={title} />
      <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[2] }}>
        <AppText style={{ color: colors.textSecondary }} variant="subhead">{supportingText}</AppText>
      </View>
      <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>{children}</View>
        {footer}
      </KeyboardAvoidingView>
    </Page>
  );
}
