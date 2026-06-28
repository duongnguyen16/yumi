import React from "react";
import { Image, View } from "react-native";
import { Text } from "react-native-paper";

export default function LocationDetailScreen({ data }) {
  return (
    <View style={{ flex: 1 }}>
      <View>
        <Image
          alt="Location Image"
          style={{ width: "100%", height: 200, resizeMode: "cover" }}
          source={{
            uri: "https://lh3.googleusercontent.com/gps-cs-s/APNQkAFwLdUiO4AMZUkKhCcZQJduHyXsEGUYggQ5etGbL2YR2zH8NBGrEuLJDAuk8vaxZCnMayLsM1ivTGMpFWECWRMJpv5CrDQvW8sYFu7k3XWlNFb2augqPzIg7VJouqfmGx98dLtElg=w408-h306-k-no",
          }}
        />
        <View style={{ padding: 16 }}>
          <Text variant="headlineMedium">
            {data?.name || "Có lỗi khi hiển thị tên vị trí"}
          </Text>
          <Text>{data.avgRating || 0}</Text>
        </View>
      </View>
    </View>
  );
}
