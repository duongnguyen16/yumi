import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import {
  Card as PaperCard,
  Divider as PaperDivider,
  IconButton,
  List,
  Surface,
  Text,
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

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
      <Text variant="titleLarge" style={{ color: colors.textPrimary, fontFamily: "Inter_700Bold" }}>
        {title}
      </Text>
      {action}
    </View>
  );
}

export function ListRow({ icon, label, supportingText, trailing, onPress }: { icon?: IconName; label: string; supportingText?: string; trailing?: ReactNode; onPress?: () => void }) {
  return (
    <List.Item
      description={supportingText}
      descriptionStyle={{ color: colors.textSecondary, fontFamily: "Inter_400Regular" }}
      left={icon ? () => <IconButton containerColor={colors.surfaceControl} icon={icon} iconColor={colors.accentPrimary} size={20} style={{ margin: 0 }} /> : undefined}
      onPress={onPress}
      right={trailing ? () => trailing : (props) => <List.Icon {...props} color={colors.textTertiary} icon="chevron-right" />}
      style={{ backgroundColor: colors.surfaceBase, minHeight: 66, paddingHorizontal: spacing[2] }}
      title={label}
      titleStyle={{ color: colors.textPrimary, fontFamily: "Inter_600SemiBold" }}
    />
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
