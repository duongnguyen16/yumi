import React from "react";
import { View } from "react-native";
import { Card, Icon, Text } from "react-native-paper";

export default function GeneralTab({ data }: any) {
  return (
    <View style={{ flex: 1 }}>
      <Card style={{ padding: 16 }}>
        <Card.Title title="Thông tin chung" />
        <Card.Content>
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
        </Card.Content>
      </Card>
      <Card style={{ padding: 16, marginTop: 16 }}>
        <Card.Title title="Sản phẩm" />
        <Card.Content>
          <Text>Product</Text>
        </Card.Content>
      </Card>
    </View>
  );
}
