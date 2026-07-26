import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { ProgressBar, Surface } from "react-native-paper";
import { colors, spacing } from "../tokens";
import { Button, IconButton } from "./button";
import { AppText, Inline, Stack } from "./layout";
import { NavigationBar } from "./navigation";
import { Screen } from "./screen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getKeyboardSafeAreaBehavior } from "../keyboard-safe-area";

export function Stepper({
  current,
  labels,
}: {
  current: number;
  labels: string[];
}) {
  return (
    <Stack
      gap={spacing[2]}
      style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[2] }}
    >
      <Inline style={{ justifyContent: "space-between" }}>
        <AppText style={{ color: colors.textSecondary }} variant="caption">
          Bước {current + 1}/{labels.length}
        </AppText>
        <AppText variant="caption">{labels[current]}</AppText>
      </Inline>
      <ProgressBar
        color={colors.accentPrimary}
        progress={(current + 1) / labels.length}
        style={{ backgroundColor: colors.separator, height: 5 }}
      />
    </Stack>
  );
}

export function FormFooter({
  onBack,
  onContinue,
  continueLabel,
  loading = false,
  backDisabled = false,
  continueDisabled = false,
  showBack = true,
}: {
  onBack: () => void;
  onContinue: () => void;
  continueLabel: string;
  loading?: boolean;
  backDisabled?: boolean;
  continueDisabled?: boolean;
  showBack?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Surface
      elevation={0}
      style={{
        backgroundColor: colors.surfaceApp,
        paddingBottom: Math.max(insets.bottom, spacing[3]),
        paddingHorizontal: spacing[4],
        paddingTop: spacing[3],
      }}
    >
      <Inline>
        {showBack ? (
          <IconButton
            icon="arrow-left"
            label="Quay lại"
            onPress={backDisabled || loading ? undefined : onBack}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <Button
            disabled={loading || continueDisabled}
            label={continueLabel}
            loading={loading}
            onPress={onContinue}
            width="full"
          />
        </View>
      </Inline>
    </Surface>
  );
}

export function BottomActionBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Surface
      elevation={0}
      style={{
        backgroundColor: colors.surfaceApp,
        paddingBottom: Math.max(insets.bottom, spacing[3]),
        paddingHorizontal: spacing[4],
        paddingTop: spacing[3],
      }}
    >
      {children}
    </Surface>
  );
}

export function WizardScreen({
  title,
  metadata,
  currentStep,
  stepLabels,
  children,
  onExit,
  onStepBack,
  onContinue,
  continueLabel,
  continueDisabled = false,
  loading = false,
  showFooterBack = true,
  showProgress = true,
  keyboardSafe = false,
}: {
  title: string;
  metadata?: string;
  currentStep: number;
  stepLabels: string[];
  children: ReactNode;
  onExit: () => void;
  onStepBack: () => void;
  onContinue: () => void;
  continueLabel: string;
  continueDisabled?: boolean;
  loading?: boolean;
  showFooterBack?: boolean;
  showProgress?: boolean;
  keyboardSafe?: boolean;
}) {
  const content = (
    <ScrollView
      contentContainerStyle={{
        gap: spacing[4],
        padding: spacing[4],
        paddingBottom: spacing[6],
      }}
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1 }}
    >
      {children}
    </ScrollView>
  );
  const footer = (
    <FormFooter
      continueDisabled={continueDisabled}
      continueLabel={continueLabel}
      loading={loading}
      onBack={onStepBack}
      onContinue={onContinue}
      showBack={showFooterBack}
      backDisabled={currentStep === 0}
    />
  );
  return (
    <Screen>
      <NavigationBar onBack={onExit} title={title} />
      {metadata ? (
        <AppText
          style={{ color: colors.textSecondary, paddingHorizontal: spacing[4] }}
          variant="caption"
        >
          {metadata}
        </AppText>
      ) : null}
      {showProgress ? (
        <Stepper current={currentStep} labels={stepLabels} />
      ) : null}
      {keyboardSafe ? (
        <KeyboardAvoidingView
          behavior={getKeyboardSafeAreaBehavior(Platform.OS)}
          style={{ flex: 1 }}
        >
          {content}
          {footer}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
      {keyboardSafe ? null : footer}
    </Screen>
  );
}
