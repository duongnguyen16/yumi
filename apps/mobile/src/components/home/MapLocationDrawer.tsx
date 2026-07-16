import {
  buildDirectionsUrl,
  getDrawerDetentHeight,
  locationSheetActionHeight,
  locationSheetSections,
  resolveDrawerDetent,
  type DrawerDetent,
  type MapLocationPreview,
} from "@/common/map-location";
import ProductSection from "@/components/location/ProductSection";
import GeneralTab, {
  LocationManagementActions,
} from "@/components/location/tabs/GeneralTab";
import ReviewTab from "@/components/location/tabs/ReviewTab";
import { getLocationById } from "@/service/locationService";
import { toAbsoluteUrl } from "@/service/url";
import { AppText, Button, IconButton, Inline, Stack } from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";
import * as Linking from "expo-linking";
import { Image } from "expo-image";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Icon, Surface } from "react-native-paper";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Product = {
  _id?: string;
  id?: string;
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  priceDisclaimer?: string;
};
type Rating = { avgRating?: number; reviewCount?: number };
type LocationDetails = Omit<MapLocationPreview, "rating"> & {
  _id?: string;
  categoryId?: { _id?: string; name?: string };
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
  imagesUrls?: { url?: string; isCover?: boolean }[];
  openingHours?: string;
  ownerId?: string | { _id?: string; id?: string } | null;
  phone?: string;
  products?: Product[];
  rating?: number | Rating;
  subCategoryIds?: { _id: string; name?: string }[];
};

export function MapLocationDrawer({
  location,
  onDismiss,
}: {
  location: MapLocationPreview;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [details, setDetails] = useState<LocationDetails | null>(null);
  const [detent, setDetent] = useState<DrawerDetent>("half");
  const halfHeight = getDrawerDetentHeight("half", windowHeight, insets.top);
  const fullHeight = getDrawerDetentHeight("full", windowHeight, insets.top);
  const halfOffset = fullHeight - halfHeight;
  const sheetOffset = useSharedValue(halfOffset);
  const dragStart = useSharedValue(halfOffset);
  const current: LocationDetails = {
    ...location,
    ...details,
    coordinates: location.coordinates,
    id: location.id,
  };
  const rating = getRating(current.rating);
  const imageUrls = getImageUrls(current);

  const refreshDetails = useCallback(async () => {
    const response = await getLocationById(location.id);
    if (response?.success && response.data)
      setDetails(response.data as LocationDetails);
  }, [location.id]);

  useEffect(() => {
    let active = true;
    getLocationById(location.id).then((response) => {
      if (active && response?.success && response.data)
        setDetails(response.data as LocationDetails);
    });
    return () => {
      active = false;
    };
  }, [location.id]);

  const setDrawerDetent = useCallback(
    (next: DrawerDetent) => {
      setDetent(next);
      sheetOffset.set(
        withSpring(next === "full" ? 0 : halfOffset, {
          damping: 24,
          overshootClamping: true,
          stiffness: 260,
        }),
      );
    },
    [halfOffset, sheetOffset],
  );

  useEffect(() => {
    sheetOffset.set(detent === "full" ? 0 : halfOffset);
  }, [detent, halfOffset, sheetOffset]);

  const toggleDetent = () =>
    setDrawerDetent(detent === "half" ? "full" : "half");
  const panGesture = Gesture.Pan()
    .activeOffsetY([-6, 6])
    .onBegin(() => {
      dragStart.set(sheetOffset.get());
    })
    .onUpdate((event) => {
      sheetOffset.set(
        Math.max(0, Math.min(halfOffset, dragStart.get() + event.translationY)),
      );
    })
    .onEnd((event) => {
      const currentDetent: DrawerDetent =
        dragStart.get() < halfOffset / 2 ? "full" : "half";
      const next = resolveDrawerDetent(
        currentDetent,
        event.translationY,
        event.velocityY,
      );
      sheetOffset.set(
        withSpring(next === "full" ? 0 : halfOffset, {
          damping: 24,
          overshootClamping: true,
          stiffness: 260,
        }),
      );
      runOnJS(setDetent)(next);
    });
  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetOffset.get() }],
  }));

  return (
    <Animated.View
      style={[
        {
          bottom: 0,
          height: fullHeight,
          left: 0,
          position: "absolute",
          right: 0,
          zIndex: 20,
        },
        animatedSheetStyle,
      ]}
    >
      <Surface
        elevation={0}
        style={{
          backgroundColor: colors.surfaceRaised,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          flex: 1,
          overflow: "hidden",
        }}
      >
        <GestureDetector gesture={panGesture}>
          <View>
            <Pressable
              accessibilityLabel="Kéo hoặc nhấn để thay đổi chiều cao"
              accessibilityRole="adjustable"
              onPress={toggleDetent}
              style={{
                alignItems: "center",
                paddingBottom: spacing[1],
                paddingTop: spacing[2],
              }}
            >
              <View
                style={{
                  backgroundColor: colors.borderStrong,
                  borderRadius: radius.pill,
                  height: 4,
                  width: 40,
                }}
              />
            </Pressable>
            <View
              style={{
                gap: spacing[2],
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[2],
              }}
            >
              <Inline style={{ alignItems: "flex-start" }}>
                <Stack gap={spacing[1]} style={{ flex: 1 }}>
                  <AppText numberOfLines={2} variant="title1">
                    {current.name}
                  </AppText>
                  <Inline gap={spacing[1]}>
                    {rating.avgRating ? (
                      <Inline gap={4}>
                        <Icon
                          color={colors.accentOrange}
                          size={16}
                          source="star"
                        />
                        <AppText variant="caption">
                          {rating.avgRating.toFixed(1)}
                          {rating.reviewCount
                            ? ` · ${rating.reviewCount} đánh giá`
                            : ""}
                        </AppText>
                      </Inline>
                    ) : null}
                    {current.categoryId?.name ? (
                      <AppText
                        numberOfLines={1}
                        style={{ color: colors.textSecondary, flex: 1 }}
                        variant="caption"
                      >
                        {current.categoryId.name}
                      </AppText>
                    ) : null}
                  </Inline>
                </Stack>
                <Inline gap={4}>
                  <IconButton
                    icon={detent === "full" ? "chevron-down" : "arrow-expand"}
                    label={detent === "full" ? "Thu gọn" : "Mở rộng"}
                    onPress={toggleDetent}
                  />
                  <IconButton icon="close" label="Đóng" onPress={onDismiss} />
                </Inline>
              </Inline>
            </View>
          </View>
        </GestureDetector>
        <ScrollView
          contentContainerStyle={{
            alignItems: "center",
            gap: spacing[2],
            height: locationSheetActionHeight,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[2],
          }}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, height: locationSheetActionHeight }}
        >
          <Button
            icon="navigation-variant-outline"
            label="Chỉ đường"
            onPress={() => void Linking.openURL(buildDirectionsUrl(current))}
          />
          <LocationManagementActions data={current} />
        </ScrollView>
        <SheetScroll
          bottomInset={insets.bottom}
          showIndicator={detent === "full"}
        >
          <View nativeID={locationSheetSections[0]}>
            <Overview
              current={current}
              imageUrls={imageUrls}
              onRefresh={refreshDetails}
            />
          </View>
          <View nativeID={locationSheetSections[1]}>
            <ProductSection
              locationId={current._id ?? current.id}
              onChanged={refreshDetails}
              ownerId={current.ownerId}
              products={current.products}
            />
          </View>
          <View nativeID={locationSheetSections[2]}>
            <Stack>
              <AppText variant="title2">Đánh giá</AppText>
              <ReviewTab
                embedded
                initialRating={rating}
                locationData={current}
              />
            </Stack>
          </View>
        </SheetScroll>
      </Surface>
    </Animated.View>
  );
}

function Overview({
  current,
  imageUrls,
  onRefresh,
}: {
  current: LocationDetails;
  imageUrls: string[];
  onRefresh: () => Promise<void>;
}) {
  return (
    <Stack gap={spacing[4]}>
      {imageUrls[0] ? (
        <Image
          alt={`Ảnh ${current.name}`}
          contentFit="cover"
          source={{ uri: imageUrls[0] }}
          style={{
            backgroundColor: colors.surfaceMedia,
            borderRadius: radius.large,
            height: 190,
            width: "100%",
          }}
        />
      ) : null}
      <GeneralTab
        data={current}
        onRefresh={onRefresh}
        padding={0}
        showActions={false}
        showProducts={false}
      />
    </Stack>
  );
}

function SheetScroll({
  children,
  bottomInset,
  showIndicator,
}: {
  children: ReactNode;
  bottomInset: number;
  showIndicator: boolean;
}) {
  return (
    <ScrollView
      contentContainerStyle={{
        gap: spacing[4],
        padding: spacing[4],
        paddingBottom: bottomInset + spacing[5],
      }}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={showIndicator}
      style={{ flex: 1 }}
    >
      {children}
    </ScrollView>
  );
}

function getImageUrls(location: LocationDetails) {
  const detailedImages = [...(location.imagesUrls ?? [])]
    .sort((a, b) => Number(Boolean(b.isCover)) - Number(Boolean(a.isCover)))
    .map((image) => image.url);
  return [...detailedImages, ...(location.imageUrls ?? []), location.imageUrl]
    .map((url) => toAbsoluteUrl(url))
    .filter((url): url is string => Boolean(url));
}

function getRating(value: LocationDetails["rating"]): Required<Rating> {
  if (typeof value === "number") return { avgRating: value, reviewCount: 0 };
  return {
    avgRating: Number(value?.avgRating ?? 0),
    reviewCount: Number(value?.reviewCount ?? 0),
  };
}
