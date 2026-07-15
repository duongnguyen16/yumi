import { AppText, Card, Stack } from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";
import { View } from "react-native";

export type TimelineItem = { title: string; detail?: string; timestamp?: string; active?: boolean };

export default function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <Card>
      <AppText variant="headline">Tiến trình</AppText>
      <Stack gap={0}>
        {items.map((item, index) => (
          <View key={`${item.title}-${index}`} style={{ flexDirection: "row", gap: spacing[3] }}>
            <View style={{ alignItems: "center", width: 14 }}>
              <View style={{ backgroundColor: item.active ? colors.accentPrimary : colors.borderStrong, borderRadius: radius.pill, height: 12, width: 12 }} />
              {index < items.length - 1 ? <View style={{ backgroundColor: colors.separator, flex: 1, minHeight: spacing[5], width: 2 }} /> : null}
            </View>
            <Stack gap={spacing[1]} style={{ flex: 1, paddingBottom: index < items.length - 1 ? spacing[4] : 0 }}>
              <AppText variant="headline">{item.title}</AppText>
              {item.detail ? <AppText style={{ color: colors.textSecondary }} variant="subhead">{item.detail}</AppText> : null}
              {item.timestamp ? <AppText style={{ color: colors.textTertiary }} variant="caption">{item.timestamp}</AppText> : null}
            </Stack>
          </View>
        ))}
      </Stack>
    </Card>
  );
}
