import { createContext, useContext, type ReactNode } from "react";
import { Snackbar, Chip, Icon, Portal, Surface } from "react-native-paper";
import { colors, fontFamily, radius, spacing } from "../tokens";
import { AppText } from "./layout";
import type { IconName } from "./types";

const NoticeSnackbarInsetContext = createContext(0);

export function NoticeSnackbarInsetProvider({ bottomOffset, children }: { bottomOffset: number; children: ReactNode }) {
  return <NoticeSnackbarInsetContext.Provider value={bottomOffset}>{children}</NoticeSnackbarInsetContext.Provider>;
}

export function Badge({
  label,
  tone = "neutral",
  compact = false,
}: {
  label: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  compact?: boolean;
}) {
  const toneColor =
    tone === "info"
      ? colors.accentPrimary
      : tone === "success"
        ? colors.accentGreen
        : tone === "warning"
          ? colors.accentOrange
          : tone === "danger"
            ? colors.accentRed
            : colors.textSecondary;

  if (compact) {
    return (
      <Surface
        elevation={0}
        style={{
          alignSelf: "flex-start",
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.pill,
          paddingHorizontal: spacing[2],
          paddingVertical: 2,
        }}
      >
        <AppText
          style={{
            color: toneColor,
            fontFamily: fontFamily.semibold,
            fontSize: 10,
            lineHeight: 13,
          }}
          variant="footnote"
        >
          {label}
        </AppText>
      </Surface>
    );
  }

  return (
    <Chip
      compact
      style={{
        alignSelf: "flex-start",
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.pill,
      }}
      textStyle={{
        color: toneColor,
        fontFamily: fontFamily.semibold,
        fontSize: 12,
      }}
    >
      {label}
    </Chip>
  );
}

export function MetricBadge({
  icon,
  label,
}: {
  icon: IconName;
  label: string;
}) {
  return (
    <Surface
      elevation={0}
      style={{
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.pill,
        flexDirection: "row",
        gap: spacing[1],
        paddingHorizontal: spacing[2],
        paddingVertical: 3,
      }}
    >
      <Icon color={colors.accentPrimary} size={13} source={icon} />
      <AppText
        style={{
          fontFamily: fontFamily.semibold,
          fontSize: 10,
          lineHeight: 13,
        }}
        variant="footnote"
      >
        {label}
      </AppText>
    </Surface>
  );
}

<<<<<<< Updated upstream
export function NoticeSnackbar({
  message,
  onDismiss,
  action,
}: {
  message: string;
  onDismiss: () => void;
  action?: { label: string; onPress: () => void };
}) {
=======
export function NoticeSnackbar({ message, onDismiss, action }: { message: string; onDismiss: () => void; action?: { label: string; onPress: () => void } }) {
  const bottomOffset = useContext(NoticeSnackbarInsetContext);

>>>>>>> Stashed changes
  return (
    <Portal>
      <Snackbar
        action={action}
        duration={4500}
        onDismiss={onDismiss}
        style={{ borderRadius: radius.medium, margin: spacing[4] }}
        visible={Boolean(message)}
        wrapperStyle={bottomOffset > 0 ? { bottom: bottomOffset } : undefined}
      >
        {message as ReactNode}
      </Snackbar>
    </Portal>
  );
}
