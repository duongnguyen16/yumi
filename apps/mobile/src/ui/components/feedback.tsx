import type { ReactNode } from "react";
import { Snackbar, Chip } from "react-native-paper";
import { colors, fontFamily, radius, spacing } from "../tokens";

export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "info" | "success" | "warning" | "danger" }) {
  const toneColor = tone === "info" ? colors.accentPrimary : tone === "success" ? colors.accentGreen : tone === "warning" ? colors.accentOrange : tone === "danger" ? colors.accentRed : colors.textSecondary;

  return (
    <Chip compact style={{ alignSelf: "flex-start", backgroundColor: colors.surfaceElevated, borderRadius: radius.pill }} textStyle={{ color: toneColor, fontFamily: fontFamily.semibold, fontSize: 12 }}>
      {label}
    </Chip>
  );
}

export function NoticeSnackbar({ message, onDismiss, action }: { message: string; onDismiss: () => void; action?: { label: string; onPress: () => void } }) {
  return (
    <Snackbar
      action={action}
      duration={4500}
      onDismiss={onDismiss}
      style={{ borderRadius: radius.medium, margin: spacing[4] }}
      visible={Boolean(message)}
    >
      {message as ReactNode}
    </Snackbar>
  );
}
