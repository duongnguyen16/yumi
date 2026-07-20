import React, { useContext, useEffect, useState } from "react";
import { Keyboard, Pressable, Share, TouchableWithoutFeedback, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { Icon } from "react-native-paper";
import * as Linking from "expo-linking";
import { MaterialTabBar, Tabs } from "./collapsible-tabs";

import GeneralTab from "./tabs/GeneralTab";
import ReviewTab from "./tabs/ReviewTab";
import PictureTab from "./tabs/PictureTab";
import { viewCount } from "@/service/locationService";
import { getReviewsByLocation, type LocationReview } from "@/service/reviewService";
import { AppText, IconButton, Inline, Stack } from "@/ui/components";
import { colors, fontFamily, radius, spacing } from "@/ui/tokens";
import { buildDirectionsUrl, getMapLocationPreview } from "@/common/map-location";
import { userContext } from "@/contexts/userContext";
import { checkBookmark, addBookmark, removeBookmark } from "@/service/bookmarkService";
import { toAbsoluteUrl } from "@/service/url";
import { ImagePreviewModal } from "./ImagePreviewModal";

export default function LocationDetailScreen({ data, productData, onRefresh }) {
  const { width } = useWindowDimensions();
  const location = data?.data;
  const locationId = location?._id ?? location?.id;

  const { user } = useContext(userContext);
  const canBookmark = !!user; // chỉ user đã đăng nhập mới dùng được

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [reviewImageUrls, setReviewImageUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!locationId || !canBookmark) return;
    checkBookmark(locationId).then((res) => {
      if (res.success) setIsBookmarked(res.isBookmarked);
    });
  }, [locationId, canBookmark]);

  const handleToggleBookmark = async () => {
    if (!locationId || bookmarkLoading) return;
    setBookmarkLoading(true);
    if (isBookmarked) {
      const res = await removeBookmark(locationId);
      if (res.success) setIsBookmarked(false);
    } else {
      const res = await addBookmark(locationId);
      if (res.success) setIsBookmarked(true);
    }
    setBookmarkLoading(false);
  };

  const imageUrls = mergeImageUrls(
    getLocationImageUrls(location),
    reviewImageUrls,
  );
  const coverImage = imageUrls[0] ?? null;

  const refreshReviewImages = async () => {
    if (!locationId) {
      setReviewImageUrls([]);
      return;
    }

    const response = await getReviewsByLocation(locationId);
    if (response.success) {
      setReviewImageUrls(getReviewImageUrls(response.reviews));
      return;
    }

    console.log("[LocationDetail][review-images]", response.message);
  };

  const handleShare = async () => {
    if (!locationId) return;

    try {
      const url = Linking.createURL(`location/${locationId}`);
      await Share.share({
        title: "Chia sẻ địa điểm",
        message: url,
        url,
      });
    } catch (error) {
      console.log("Error sharing location:", error);
    }
  };

  const handleDirections = () => {
    const preview = getMapLocationPreview(location);
    if (preview) void Linking.openURL(buildDirectionsUrl(preview));
  };

  useEffect(() => {
    if (!locationId) return;

    const timer = setTimeout(() => {
      viewCount(locationId);
    }, 3000);

    return () => clearTimeout(timer);
  }, [locationId]);

  useEffect(() => {
    void refreshReviewImages();
  }, [locationId]);

  const renderHeader = () => {
    return (
      <View style={{ backgroundColor: colors.surfaceBase }}>
        <Pressable
          accessibilityLabel="Xem ảnh địa điểm"
          accessibilityRole={coverImage ? "imagebutton" : "image"}
          disabled={!coverImage}
          onPress={() => setPreviewIndex(0)}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        >
          <Image
            style={{
              backgroundColor: colors.surfaceMedia,
              borderBottomLeftRadius: radius.large,
              borderBottomRightRadius: radius.large,
              height: 220,
              width: "100%",
            }}
            alt={location?.name || "Location Image"}
            contentFit="cover"
            source={{
              uri:
                coverImage ||
                "https://placehold.co/800x450/F4EFE8/5F574F?text=No+image",
            }}
          />
        </Pressable>

        <Stack style={{ padding: spacing[4] }}>
          <AppText variant="title1">{location?.name || "Chi tiết địa điểm"}</AppText>
          <Inline style={{ justifyContent: "space-between" }}>
            <Inline><Icon color={colors.accentOrange} size={20} source="star" /><AppText variant="headline">{location?.rating?.avgRating || 0}</AppText><AppText style={{ color: colors.textSecondary }} variant="subhead">{location?.rating?.reviewCount || 0} đánh giá</AppText></Inline>
            <Inline gap={spacing[1]}>
              {canBookmark && (
                <IconButton
                  icon={isBookmarked ? "bookmark" : "bookmark-outline"}
                  label={isBookmarked ? "Bỏ lưu" : "Lưu vào yêu thích"}
                  onPress={bookmarkLoading ? undefined : handleToggleBookmark}
                />
              )}
              <IconButton icon="navigation-variant-outline" label="Chỉ đường tôi đến đó" onPress={handleDirections} />
              <IconButton icon="share-variant-outline" label="Chia sẻ địa điểm" onPress={handleShare} />
            </Inline>
          </Inline>
        </Stack>
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
      <View style={{ flex: 1 }}>
      <Tabs.Container
        renderHeader={renderHeader}
        revealHeaderOnScroll
        lazy
        renderTabBar={(props) => (
          <MaterialTabBar
            {...props}
            activeColor={colors.accentPrimary}
            inactiveColor={colors.textSecondary}
            contentContainerStyle={{
              alignItems: "center",
            }}
            indicatorStyle={{
              backgroundColor: colors.accentPrimary,
            }}
            scrollEnabled={false}
            style={{
              backgroundColor: colors.surfaceBase,
              height: 48,
            }}
            tabStyle={{
              width: width / 3,
            }}
            labelStyle={{
              fontFamily: fontFamily.semibold,
              width: width / 3,
              textAlign: "center",
              margin: 0,
            }}
          />
        )}
      >
        <Tabs.Tab name="general" label="Tổng quan">
          <Tabs.ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <GeneralTab
              data={location}
              productData={productData}
              onRefresh={onRefresh}
            />
          </Tabs.ScrollView>
        </Tabs.Tab>

        <Tabs.Tab name="review" label="Đánh giá">
          <ReviewTab
            initialRating={location?.rating}
            locationData={location}
            onChanged={refreshReviewImages}
          />
        </Tabs.Tab>

        <Tabs.Tab name="picture" label="Hình ảnh">
          <Tabs.ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <PictureTab
              imageUrls={imageUrls}
              locationName={location?.name}
            />
          </Tabs.ScrollView>
        </Tabs.Tab>
      </Tabs.Container>
        <ImagePreviewModal
          images={imageUrls.map((url, index) => ({
            description: `Ảnh ${index + 1}`,
            title: location?.name || "Ảnh địa điểm",
            url,
          }))}
          initialIndex={previewIndex ?? 0}
          locationName={location?.name}
          onDismiss={() => setPreviewIndex(null)}
          visible={previewIndex !== null}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

function getLocationImageUrls(location: any) {
  const detailedImages = [...(location?.imagesUrls ?? [])]
    .sort((a, b) => Number(Boolean(b?.isCover)) - Number(Boolean(a?.isCover)))
    .map((image) => image?.url);
  return [
    ...detailedImages,
    ...(location?.imageUrls ?? []),
    location?.imageUrl,
  ]
    .map((url) => toAbsoluteUrl(url))
    .filter((url): url is string => Boolean(url));
}

function getReviewImageUrls(reviews: LocationReview[]) {
  return reviews.flatMap((review) =>
    (review.images ?? [])
      .map((image) => toAbsoluteUrl(image.url))
      .filter((url): url is string => Boolean(url)),
  );
}

function mergeImageUrls(...groups: string[][]) {
  return Array.from(
    new Set(groups.flat().filter((url): url is string => Boolean(url))),
  );
}
