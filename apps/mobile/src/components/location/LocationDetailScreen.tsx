import React, { useEffect } from "react";
import { Image, View, Share, useWindowDimensions } from "react-native";
import { Icon, IconButton, Text, useTheme } from "react-native-paper";
import * as Linking from "expo-linking";
import { MaterialTabBar, Tabs } from "react-native-collapsible-tab-view";

import GeneralTab from "./tabs/GeneralTab";
import ReviewTab from "./tabs/ReviewTab";
import PictureTab from "./tabs/PictureTab";
import { viewCount } from "@/service/locationService";

const HEADER_HEIGHT = 310;

export default function LocationDetailScreen({ data, productData }) {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const locationId = data?._id;

  const coverImage =
    data?.imagesUrls?.find?.((image) => image?.isCover)?.url ||
    data?.imagesUrls?.[0]?.url ||
    data?.imageUrls?.[0] ||
    null;

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

  useEffect(() => {
    if (!locationId) return;

    const timer = setTimeout(() => {
      viewCount(locationId);
    }, 3000);

    return () => clearTimeout(timer);
  }, [locationId]);

  const renderHeader = () => {
    return (
      <View style={{ backgroundColor: theme.colors.background }}>
        <Image
          style={{ width: "100%", height: 200, resizeMode: "cover" }}
          alt={data?.name || "Location Image"}
          source={{
            uri:
              coverImage ||
              "https://placehold.co/800x450/F4EFE8/5F574F?text=No+image",
          }}
        />

        <View style={{ padding: 16 }}>
          <Text variant="headlineMedium">
            {data?.name || "Có lỗi khi hiển thị tên vị trí"}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text>{data?.rating?.avgRating || 0}</Text>
              <Icon source="star" size={20} color="#FFD700" />
            </View>

            <IconButton icon="share" onPress={handleShare} mode="outlined" />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs.Container
        renderHeader={renderHeader}
        revealHeaderOnScroll
        lazy
        renderTabBar={(props) => (
          <MaterialTabBar
            {...props}
            activeColor={theme.colors.primary}
            inactiveColor={theme.colors.onSurfaceVariant}
            contentContainerStyle={{
              alignItems: "center",
            }}
            indicatorStyle={{
              backgroundColor: theme.colors.primary,
            }}
            scrollEnabled={false}
            style={{
              backgroundColor: theme.colors.surface,
              height: 48,
            }}
            tabStyle={{
              width: width / 3,
            }}
            labelStyle={{
              fontWeight: "600",
              width: width / 3,
              textAlign: "center",
              margin: 0,
            }}
          />
        )}
      >
        <Tabs.Tab name="general" label="Tổng quan">
          <Tabs.ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <GeneralTab data={data} productData={productData} />
          </Tabs.ScrollView>
        </Tabs.Tab>

        <Tabs.Tab name="review" label="Đánh giá">
          <ReviewTab locationData={data} initialRating={data?.rating} />
        </Tabs.Tab>

        <Tabs.Tab name="picture" label="Hình ảnh">
          <Tabs.ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <PictureTab />
          </Tabs.ScrollView>
        </Tabs.Tab>
      </Tabs.Container>
    </View>
  );
}
