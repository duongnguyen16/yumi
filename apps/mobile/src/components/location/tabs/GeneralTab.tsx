import { userContext } from "@/contexts/userContext";
import { useRouter } from "expo-router";
import React, { useContext, useState } from "react";
import { View } from "react-native";
import { Button, Card, Icon, Text } from "react-native-paper";
import EditLocationModal from "../modals/EditLocationModal";
import ProductCard from "../ui/ProductCard";

export default function GeneralTab({ data, productData }) {
  const { user } = useContext(userContext);
  const router = useRouter();
  const [visible, setVisible] = useState(false);
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
              {data?.address || "Địa chỉ không có sẵn"}
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
              {data?.openingHours || "Giờ mở cửa không có sẵn"}
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
              {data?.description || "Mô tả không có sẵn"}
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
              {data?.viewCount || "0"} lượt xem
            </Text>
          </View>
        </Card.Content>
        {user?._id === data?.ownerId ? (
          <Card.Actions style={{ justifyContent: "flex-start" }}>
            <Button
              onPress={() => {
                setVisible(true);
              }}
            >
              Chỉnh sửa thông tin
            </Button>
          </Card.Actions>
        ) : null}
        {user?.role === "VENDOR" && !data?.ownerId ? (
          <Card.Actions style={{ justifyContent: "flex-start" }}>
            <Button
              mode="contained"
              onPress={() => router.push(`/claim/${String(data?._id)}` as never)}
            >
              Xác nhận sở hữu địa điểm
            </Button>
          </Card.Actions>
        ) : null}
      </Card>
      <View
        style={{
          marginTop: 16,
          flexDirection: "column",
          gap: 16,
          borderRadius: 8,
          padding: 10,
        }}
      >
        <Text variant="headlineSmall">Sản phẩm</Text>
        {(productData || []).map((product) => (
          <ProductCard key={product._id} data={product} />
        ))}
        {user?._id === data?.ownerId ? (
          <Button
            mode="outlined"
            onPress={() => {
              // Handle button press
            }}
          >
            Chỉnh sửa sản phẩm
          </Button>
        ) : null}
      </View>
      <EditLocationModal
        setVisible={setVisible}
        visible={visible}
        data={data}
      />
    </View>
  );
}
