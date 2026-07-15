import { Children, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import {
  Card as PaperCard,
  Divider as PaperDivider,
  IconButton,
  List,
  Surface,
  Text,
  Modal,
  Portal,
} from "react-native-paper";
import { colors, radius, spacing } from "../tokens";
import type { IconName } from "./types";

export function Card({ children, style, variant = "default" }: { children: ReactNode; style?: StyleProp<ViewStyle>; variant?: "default" | "grouped" | "floating" }) {
  const mode = variant === "floating" ? "elevated" : "contained";

  return (
    <PaperCard mode={mode} style={{ backgroundColor: variant === "grouped" ? colors.surfaceElevated : colors.surfaceBase, borderRadius: radius.large, overflow: "hidden" }}>
      <PaperCard.Content style={[{ gap: variant === "grouped" ? 0 : spacing[3], paddingHorizontal: variant === "grouped" ? 0 : spacing[4], paddingVertical: variant === "grouped" ? 0 : spacing[4] }, style]}>
        {children}
      </PaperCard.Content>
    </PaperCard>
  );
}

export function Divider({ inset = false }: { inset?: boolean }) {
  return <PaperDivider style={{ backgroundColor: colors.separator, marginLeft: inset ? 66 : 0 }} />;
}

export function GroupedList({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children);

  return (
    <Card variant="grouped">
      {rows.map((row, index) => (
        <View key={index}>
          {row}
          {index < rows.length - 1 ? <Divider inset /> : null}
        </View>
      ))}
    </Card>
  );
}

export function SectionHeader({ title, supportingText, action }: { title: string; supportingText?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing[3], justifyContent: "space-between" }}>
      <View style={{ flex: 1, gap: spacing[1] }}>
        <Text variant="titleLarge" style={{ color: colors.textPrimary, fontFamily: "Inter_700Bold" }}>{title}</Text>
        {supportingText ? <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular" }}>{supportingText}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function ListRow({ icon, label, supportingText, value, trailing, showChevron = true, state = "default", onPress }: { icon?: IconName; label: string; supportingText?: string; value?: string; trailing?: ReactNode; showChevron?: boolean; state?: "default" | "unread" | "disabled" | "danger"; onPress?: () => void }) {
  const right = trailing
    ? () => trailing
    : value
      ? () => <Text style={{ color: state === "danger" ? colors.accentRed : colors.textSecondary, fontFamily: "Inter_500Medium" }}>{value}</Text>
      : showChevron
        ? (props: Parameters<NonNullable<React.ComponentProps<typeof List.Item>["right"]>>[0]) => <List.Icon {...props} color={colors.textTertiary} icon="chevron-right" />
        : undefined;

  return (
    <List.Item
      description={supportingText}
      descriptionStyle={{ color: colors.textSecondary, fontFamily: "Inter_400Regular" }}
      left={icon ? () => <IconButton containerColor={colors.surfaceControl} icon={icon} iconColor={colors.accentPrimary} size={20} style={{ margin: 0 }} /> : undefined}
      onPress={onPress}
      right={right}
      style={{ backgroundColor: state === "unread" ? colors.surfaceControl : colors.surfaceBase, minHeight: 66, opacity: state === "disabled" ? 0.5 : 1, paddingHorizontal: spacing[2] }}
      title={label}
      titleStyle={{ color: state === "danger" ? colors.accentRed : colors.textPrimary, fontFamily: state === "unread" ? "Inter_700Bold" : "Inter_600SemiBold" }}
    />
  );
}

export function FormSection({ title, supportingText, children }: { title: string; supportingText?: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing[3] }}>
      <SectionHeader supportingText={supportingText} title={title} />
      <Card>{children}</Card>
    </View>
  );
}

export function ActionSheet({ visible, title, message, actions, onDismiss }: { visible: boolean; title: string; message?: string; actions: { icon: IconName; label: string; onPress: () => void }[]; onDismiss: () => void }) {
  return (
    <Portal>
      <Modal contentContainerStyle={{ backgroundColor: colors.surfaceBase, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, gap: spacing[2], marginTop: "auto", padding: spacing[5] }} dismissable onDismiss={onDismiss} visible={visible}>
        <Text variant="titleLarge" style={{ color: colors.textPrimary, fontFamily: "Inter_700Bold" }}>{title}</Text>
        {message ? <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular" }}>{message}</Text> : null}
        {actions.map((action) => <ListRow key={action.label} icon={action.icon} label={action.label} onPress={action.onPress} showChevron={false} />)}
      </Modal>
    </Portal>
  );
}

export function BottomSheet({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Surface elevation={3} style={[{ backgroundColor: colors.surfaceBase, borderRadius: radius.sheet, gap: spacing[3], padding: spacing[5] }, style]}>
      <View style={{ alignSelf: "center", backgroundColor: colors.borderStrong, borderRadius: radius.pill, height: 5, marginBottom: spacing[1], width: 36 }} />
      {children}
    </Surface>
  );
}
