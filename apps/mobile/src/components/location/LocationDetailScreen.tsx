import React, { useEffect, useState } from "react";
import { Image, ScrollView, View, Share } from "react-native";
import { Icon, IconButton, SegmentedButtons, Text } from "react-native-paper";
import * as Linking from "expo-linking";
import GeneralTab from "./tabs/GeneralTab";
import ReviewTab from "./tabs/ReviewTab";
import PictureTab from "./tabs/PictureTab";
import { viewCount } from "@/service/locationService";

export default function LocationDetailScreen({ data, productData }) {
  const [tab, setTab] = useState("general");
  const locationId = data?.location?._id;

  const handleShare = async () => {
    if (!locationId) {
      return;
    }

    try {
      const url = Linking.createURL(`location/${locationId}`);
      await Share.share({
        title: "Chia sẻ địa điểm",
        message: url,
        url: url,
      });
    } catch (error) {
      console.log("Error sharing location:", error);
    }
  };
  useEffect(() => {
    if (!locationId) {
      return;
    }

    const timer = setTimeout(() => {
      viewCount(locationId);
    }, 3000);
    return () => clearTimeout(timer);
  }, [locationId]);
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "white" }}
      stickyHeaderIndices={[1]}
    >
      <View>
        <Image
          style={{ width: "100%", height: 200, resizeMode: "cover" }}
          alt="Location Image"
          source={{
            uri: "https://lh3.googleusercontent.com/gps-cs-s/APNQkAFwLdUiO4AMZUkKhCcZQJduHyXsEGUYggQ5etGbL2YR2zH8NBGrEuLJDAuk8vaxZCnMayLsM1ivTGMpFWECWRMJpv5CrDQvW8sYFu7k3XWlNFb2augqPzIg7VJouqfmGx98dLtElg=w408-h306-k-no",
          }}
        />

        <View style={{ padding: 16 }}>
          <Text variant="headlineMedium">
            {data?.location?.name || "Có lỗi khi hiển thị tên vị trí"}
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
              <Text>{data?.location?.rating?.avgRating || 0}</Text>
              <Icon source="star" size={20} color="#FFD700" />
            </View>
            <IconButton icon={"share"} onPress={handleShare} mode="outlined" />
          </View>
        </View>
      </View>
      <View
        style={{
          backgroundColor: "white",
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: "#eee",
        }}
      >
        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: "general", label: "Tổng quan" },
            { value: "review", label: "Đánh giá" },
            { value: "picture", label: "Hình ảnh" },
          ]}
        />
      </View>

      {/* Nội dung tab */}
      <View style={{ padding: 16 }}>
        {tab === "general" && (
          <GeneralTab data={data} productData={productData} />
        )}
        {tab === "review" && <ReviewTab />}
        {tab === "picture" && <PictureTab />}
      </View>
    </ScrollView>
  );
}
