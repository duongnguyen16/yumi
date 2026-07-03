import { userContext } from "@/contexts/userContext";
import { useRouter } from "expo-router";
import React, { useContext } from "react";
import { View } from "react-native";
import { Button, Card, Icon, Text } from "react-native-paper";

type GeneralTabProps = {
  data?: {
    location?: {
      _id?: string;
      ownerId?: string;
      address?: string;
      openingHours?: string;
      description?: string;
      viewCount?: number;
    };
  } | null;
};

export default function GeneralTab({ data }: GeneralTabProps) {
  const { user } = useContext(userContext);
  const router = useRouter();
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
        {user?._id === data?.location?.ownerId ? (
          <Card.Actions style={{ justifyContent: "flex-start" }}>
            <Button
              onPress={() => {
                router.push({
                  pathname: "/location/edit/[id]",
                  params: { id: data?.location?._id },
                });
              }}
            >
              Chỉnh sửa thông tin
            </Button>
          </Card.Actions>
        ) : null}
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
