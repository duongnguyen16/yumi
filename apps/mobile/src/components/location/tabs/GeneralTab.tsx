import React from "react";
import { View } from "react-native";
import { Icon, Text } from "react-native-paper";

export default function GeneralTab({ data }: any) {
  return (
    <View style={{ flex: 1 }}>
      <View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10,
            gap: 10,
          }}
        >
          <Icon source="map-marker" size={24} color="blue" />
          <Text style={{ flex: 1, flexShrink: 1 }}>
            {data?.location.address || "Địa chỉ không có sẵn"}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10,
            gap: 10,
          }}
        >
          <Icon source="clock" size={24} color="blue" />
          <Text style={{ flex: 1, flexShrink: 1 }}>
            {data?.location.openingHours || "Giờ mở cửa không có sẵn"}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10,
            gap: 10,
          }}
        >
          <Icon source="information" size={24} color="blue" />
          <Text style={{ flex: 1, flexShrink: 1 }}>
            {data?.location.description || "Mô tả không có sẵn"}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10,
            gap: 10,
          }}
        >
          <Icon source="eye" size={24} color="blue" />
          <Text style={{ flex: 1, flexShrink: 1 }}>
            {data?.location?.viewCount || "0"} lượt xem
          </Text>
        </View>
      </View>
    </View>
  );
}
