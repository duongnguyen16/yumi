import { Image } from "expo-image";
import React, { useMemo, useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { EmptyState, Stack } from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";
import { ImagePreviewModal, type PreviewImage } from "../ImagePreviewModal";

export default function PictureTab({
  imageUrls = [],
  locationName,
}: {
  imageUrls?: string[];
  locationName?: string;
}) {
  const { width } = useWindowDimensions();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const images = useMemo<PreviewImage[]>(
    () =>
      imageUrls.map((url, index) => ({
        description: `Ảnh ${index + 1}`,
        title: locationName || "Ảnh địa điểm",
        url,
      })),
    [imageUrls, locationName],
  );
  const tileGap = spacing[2];
  const tileSize = Math.floor((width - spacing[4] * 2 - tileGap * 2) / 3);

  if (!images.length) {
    return (
      <EmptyState
        icon="image-multiple-outline"
        title="Chưa có hình ảnh"
        supportingText="Hình ảnh của địa điểm sẽ xuất hiện tại đây."
      />
    );
  }

  return (
    <>
      <Stack style={{ padding: spacing[4] }}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: tileGap,
          }}
        >
          {images.map((image, index) => (
            <Pressable
              accessibilityLabel={`Xem ảnh ${index + 1}`}
              accessibilityRole="imagebutton"
              key={image.url}
              onPress={() => setPreviewIndex(index)}
              style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
            >
              <Image
                alt={image.description || "Ảnh địa điểm"}
                contentFit="cover"
                source={{ uri: image.url }}
                style={{
                  backgroundColor: colors.surfaceMedia,
                  borderRadius: radius.medium,
                  height: tileSize,
                  width: tileSize,
                }}
              />
            </Pressable>
          ))}
        </View>
      </Stack>
      <ImagePreviewModal
        images={images}
        initialIndex={previewIndex ?? 0}
        locationName={locationName}
        onDismiss={() => setPreviewIndex(null)}
        visible={previewIndex !== null}
      />
    </>
  );
}
