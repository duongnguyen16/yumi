import type { ReactNode } from "react";
import { View } from "react-native";
import { ActivityIndicator, Icon, List, Surface } from "react-native-paper";
import { colors, emptyStateMetrics, fontFamily, radius, spacing } from "../tokens";
import { Button } from "./button";
import { Badge } from "./feedback";
import { AppText, Inline, Stack } from "./layout";
import type { IconName } from "./types";
import { workflowRowLayout } from "./workflow-list";

type Status = { label: string; tone?: "neutral" | "info" | "success" | "warning" | "danger" };

export function EmptyState({ title, supportingText, icon, actionLabel, onAction }: { title: string; supportingText?: string; icon: IconName; actionLabel?: string; onAction?: () => void }) {
  return (
    <Stack style={{ alignItems: "center", alignSelf: "center", maxWidth: emptyStateMetrics.contentWidth, paddingHorizontal: emptyStateMetrics.horizontalPadding, paddingVertical: emptyStateMetrics.verticalPadding, width: "100%" }}>
      <Surface elevation={0} style={{ alignItems: "center", backgroundColor: colors.surfaceControl, borderRadius: radius.pill, height: emptyStateMetrics.iconSize, justifyContent: "center", width: emptyStateMetrics.iconSize }}>
        <Icon color={colors.accentPrimary} size={emptyStateMetrics.iconGlyphSize} source={icon} />
      </Surface>
      <AppText style={{ textAlign: "center" }} variant="headline">{title}</AppText>
      {supportingText ? <AppText style={{ color: colors.textSecondary, textAlign: "center" }} variant="subhead">{supportingText}</AppText> : null}
      {actionLabel ? <Button label={actionLabel} onPress={onAction} variant="secondary" width={emptyStateMetrics.actionWidth} /> : null}
    </Stack>
  );
}

export function LoadingState({ label = "Đang tải" }: { label?: string }) {
  return (
    <Stack style={{ alignItems: "center", flex: 1, justifyContent: "center" }}>
      <ActivityIndicator color={colors.accentPrimary} size="large" />
      <AppText style={{ color: colors.textSecondary }} variant="subhead">{label}</AppText>
    </Stack>
  );
}

export function MetricBlock({ label, value, supportingText }: { label: string; value: string; supportingText?: string }) {
  return (
    <Surface elevation={0} style={{ backgroundColor: colors.surfaceBase, borderRadius: radius.large, gap: spacing[1], padding: spacing[4] }}>
      <AppText style={{ color: colors.accentPrimary, fontVariant: ["tabular-nums"] }} variant="title1">{value}</AppText>
      <AppText variant="headline">{label}</AppText>
      {supportingText ? <AppText style={{ color: colors.textSecondary }} variant="caption">{supportingText}</AppText> : null}
    </Surface>
  );
}

export function ActivityRow({ title, supportingText, timestamp, icon, status, unread = false, compact = false, onPress }: { title: string; supportingText?: string; timestamp?: string; icon: IconName; status?: Status; unread?: boolean; compact?: boolean; onPress?: () => void }) {
  return (
    <List.Item
      description={() => (
        <Stack gap={spacing[1]}>
          {supportingText ? <AppText style={{ color: colors.textSecondary }} variant="subhead">{supportingText}</AppText> : null}
          <Inline>
            {status ? <Badge compact={compact} label={status.label} tone={status.tone} /> : null}
            {timestamp ? <AppText style={{ color: colors.textTertiary }} variant="caption">{timestamp}</AppText> : null}
          </Inline>
        </Stack>
      )}
      left={() => (
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing[2] }}>
          <View style={{ backgroundColor: unread ? colors.accentPrimary : "transparent", borderRadius: radius.pill, height: 7, width: 7 }} />
          <Surface elevation={0} style={{ alignItems: "center", backgroundColor: colors.surfaceControl, borderRadius: radius.pill, height: compact ? workflowRowLayout.iconSize : 44, justifyContent: "center", width: compact ? workflowRowLayout.iconSize : 44 }}>
            <Icon color={colors.accentPrimary} size={22} source={icon} />
          </Surface>
        </View>
      )}
      onPress={onPress}
      style={{ backgroundColor: colors.surfaceBase, minHeight: compact ? workflowRowLayout.minHeight : 88, paddingHorizontal: compact ? workflowRowLayout.paddingHorizontal : spacing[3] }}
      title={title}
      titleStyle={{ color: colors.textPrimary, fontFamily: unread ? fontFamily.bold : fontFamily.semibold }}
    />
  );
}

export function PlaceRow({ title, category, address, metadata, details, icon = "map-marker-outline", status, showIcon = true, trailing, onPress }: { title: string; category?: string; address?: string; metadata?: string; details?: ReactNode; icon?: IconName; status?: Status; showIcon?: boolean; trailing?: ReactNode; onPress?: () => void }) {
  const description = [category, address, metadata].filter(Boolean).join(" · ");
  const descriptionContent = details
    ? () => <Stack gap={spacing[1]}>{description ? <AppText style={{ color: colors.textSecondary }} variant="caption">{description}</AppText> : null}{details}</Stack>
    : status
      ? () => <Stack gap={spacing[1]}><Badge compact label={status.label} tone={status.tone} />{description ? <AppText style={{ color: colors.textSecondary }} variant="caption">{description}</AppText> : null}</Stack>
      : description || undefined;

  return (
    <List.Item
      description={descriptionContent}
      descriptionStyle={status || details ? undefined : { color: colors.textSecondary, fontFamily: fontFamily.regular }}
      left={showIcon ? () => (
        <Surface elevation={0} style={{ alignItems: "center", backgroundColor: colors.surfaceControl, borderRadius: radius.medium, height: 48, justifyContent: "center", width: 48 }}>
          <Icon color={colors.accentPrimary} size={24} source={icon} />
        </Surface>
      ) : undefined}
      onPress={onPress}
      right={trailing ? () => trailing : (props) => <List.Icon {...props} color={colors.textTertiary} icon="chevron-right" />}
      style={{ backgroundColor: colors.surfaceBase, minHeight: status || details ? 94 : 76, paddingHorizontal: spacing[3] }}
      title={title}
      titleStyle={{ color: colors.textPrimary, fontFamily: fontFamily.semibold }}
    />
  );
}
