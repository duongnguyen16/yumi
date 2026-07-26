import { Image } from "expo-image";
import { Pressable, ScrollView, View } from "react-native";
import { Icon } from "react-native-paper";
import { colors, radius, spacing } from "../tokens";
import { Button, IconButton } from "./button";
import { Card } from "./containers";
import { AppText, Inline, Stack } from "./layout";
import type { IconName } from "./types";

export type MediaPickerItem = { id: string; uri?: string; name?: string; metadata?: string };

type MediaPickerProps = {
  title: string;
  supportingText?: string;
  items: MediaPickerItem[];
  maxCount: number;
  onAdd: () => void;
  onRemove: (id: string) => void;
  icon?: IconName;
  addLabel?: string;
  layout?: "default" | "horizontal-square";
};

export function MediaPicker({
  title,
  supportingText,
  items,
  maxCount,
  onAdd,
  onRemove,
  icon = "image-outline",
  addLabel = "Thêm tệp",
  layout = "default",
}: MediaPickerProps) {
  if (layout === "horizontal-square") {
    return (
      <ScrollView
        contentContainerStyle={{ gap: spacing[2], paddingVertical: spacing[1] }}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {items.map((item) => (
          <View
            key={item.id}
            style={{
              borderRadius: radius.medium,
              height: 92,
              overflow: "hidden",
              width: 92,
            }}
          >
            {item.uri ? (
              <Image
                alt={item.name || title}
                contentFit="cover"
                source={{ uri: item.uri }}
                style={{ height: 92, width: 92 }}
              />
            ) : (
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: colors.surfaceControl,
                  height: 92,
                  justifyContent: "center",
                  width: 92,
                }}
              >
                <Icon color={colors.accentPrimary} size={28} source={icon} />
              </View>
            )}
            <Pressable
              accessibilityLabel={`Xóa ${item.name || title}`}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => onRemove(item.id)}
              style={{
                alignItems: "center",
                backgroundColor: colors.surfaceRaised,
                borderRadius: radius.pill,
                height: 28,
                justifyContent: "center",
                position: "absolute",
                right: spacing[1],
                top: spacing[1],
                width: 28,
              }}
            >
              <Icon color={colors.textPrimary} size={16} source="close" />
            </Pressable>
          </View>
        ))}
        {items.length < maxCount ? (
          <Pressable
            accessibilityLabel={addLabel}
            accessibilityRole="button"
            onPress={onAdd}
            style={{
              alignItems: "center",
              backgroundColor: colors.surfaceControl,
              borderColor: colors.borderSubtle,
              borderRadius: radius.medium,
              borderStyle: "dashed",
              borderWidth: 1,
              gap: spacing[1],
              height: 92,
              justifyContent: "center",
              width: 92,
            }}
          >
            <Icon color={colors.accentPrimary} size={28} source="plus" />
            <AppText
              style={{ color: colors.accentPrimary }}
              variant="caption"
            >
              Thêm ảnh
            </AppText>
          </Pressable>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <Card>
      <Stack>
        <Inline style={{ justifyContent: "space-between" }}>
          <Stack gap={spacing[1]} style={{ flex: 1 }}>
            <AppText variant="headline">{title}</AppText>
            {supportingText ? <AppText style={{ color: colors.textSecondary }} variant="caption">{supportingText}</AppText> : null}
          </Stack>
          <AppText style={{ color: colors.textSecondary, fontVariant: ["tabular-nums"] }} variant="caption">{items.length}/{maxCount}</AppText>
        </Inline>
        {items.map((item) => (
          <Inline key={item.id}>
            {item.uri ? <Image alt={item.name || title} source={{ uri: item.uri }} style={{ borderRadius: radius.medium, height: 56, width: 56 }} /> : <View style={{ alignItems: "center", backgroundColor: colors.surfaceControl, borderRadius: radius.medium, height: 56, justifyContent: "center", width: 56 }}><Icon color={colors.accentPrimary} size={24} source={icon} /></View>}
            <Stack gap={spacing[1]} style={{ flex: 1 }}>
              <AppText numberOfLines={1} variant="subhead">{item.name || title}</AppText>
              {item.metadata ? <AppText style={{ color: colors.textSecondary }} variant="caption">{item.metadata}</AppText> : null}
            </Stack>
            <IconButton icon="close" label={`Xóa ${item.name || title}`} onPress={() => onRemove(item.id)} />
          </Inline>
        ))}
        {items.length < maxCount ? <Button icon="plus" label={addLabel} onPress={onAdd} variant="secondary" width="full" /> : null}
      </Stack>
    </Card>
  );
}
