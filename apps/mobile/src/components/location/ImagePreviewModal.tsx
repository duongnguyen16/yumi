import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { Icon } from "react-native-paper";
import { AppText, IconButton, Inline, Stack } from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";

export type PreviewImage = {
  url: string;
  title?: string;
  description?: string;
};

export function ImagePreviewModal({
  images,
  initialIndex = 0,
  locationName,
  onDismiss,
  visible,
}: {
  images: PreviewImage[];
  initialIndex?: number;
  locationName?: string;
  onDismiss: () => void;
  visible: boolean;
}) {
  const { height, width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(initialIndex);
  const safeIndex = Math.min(Math.max(index, 0), Math.max(images.length - 1, 0));
  const current = images[safeIndex];
  const imageHeight = Math.max(260, Math.round(height * 0.58));

  useEffect(() => {
    if (!visible) return;
    const nextIndex = Math.min(
      Math.max(initialIndex, 0),
      Math.max(images.length - 1, 0),
    );
    setIndex(nextIndex);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ animated: false, x: nextIndex * width });
    });
  }, [images.length, initialIndex, visible, width]);

  if (!visible || !current) return null;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onDismiss}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel="Đóng xem ảnh"
        accessibilityRole="button"
        onPress={onDismiss}
        style={{
          backgroundColor: "rgba(20, 20, 19, 0.72)",
          flex: 1,
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: colors.surfaceRaised,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            maxHeight: Math.round(height * 0.92),
            padding: spacing[4],
          }}
        >
          <Inline style={{ justifyContent: "space-between" }}>
            <Stack gap={spacing[1]} style={{ flex: 1 }}>
              <AppText numberOfLines={1} variant="title2">
                {current.title || locationName || "Ảnh"}
              </AppText>
              <AppText style={{ color: colors.textSecondary }} variant="caption">
                {images.length > 1
                  ? `${safeIndex + 1}/${images.length}`
                  : "Xem ảnh"}
              </AppText>
            </Stack>
            <IconButton icon="close" label="Đóng" onPress={onDismiss} />
          </Inline>

          <ScrollView
            horizontal
            maximumZoomScale={3}
            minimumZoomScale={1}
            onMomentumScrollEnd={(event) => {
              setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
            }}
            pagingEnabled
            ref={scrollRef}
            scrollEnabled={images.length > 1}
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -spacing[4], marginTop: spacing[3] }}
          >
            {images.map((image) => (
              <View
                key={image.url}
                style={{
                  alignItems: "center",
                  height: imageHeight,
                  justifyContent: "center",
                  paddingHorizontal: spacing[4],
                  width,
                }}
              >
                <Image
                  alt={image.title || locationName || "Ảnh"}
                  contentFit="contain"
                  source={{ uri: image.url }}
                  style={{
                    backgroundColor: colors.surfaceMedia,
                    borderRadius: radius.large,
                    height: "100%",
                    width: "100%",
                  }}
                />
              </View>
            ))}
          </ScrollView>

          <Inline style={{ justifyContent: "space-between", marginTop: spacing[3] }}>
            <Stack gap={spacing[1]} style={{ flex: 1 }}>
              {locationName ? (
                <AppText numberOfLines={1} variant="headline">
                  {locationName}
                </AppText>
              ) : null}
              {current.description ? (
                <AppText
                  numberOfLines={2}
                  style={{ color: colors.textSecondary }}
                  variant="subhead"
                >
                  {current.description}
                </AppText>
              ) : null}
            </Stack>
            {images.length > 1 ? (
              <Inline gap={spacing[1]}>
                <Icon
                  color={colors.textSecondary}
                  size={18}
                  source="gesture-swipe-horizontal"
                />
                <AppText style={{ color: colors.textSecondary }} variant="caption">
                  Vuốt
                </AppText>
              </Inline>
            ) : null}
          </Inline>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
