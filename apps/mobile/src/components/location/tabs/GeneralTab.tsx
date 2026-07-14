import { userContext } from "@/contexts/userContext";
import { useRouter } from "expo-router";
import React, { useContext, useState } from "react";
import { View } from "react-native";
import { Button, Card, Icon, Text } from "react-native-paper";
import EditLocationModal from "../modals/EditLocationModal";
import ProductSection from "../ProductSection";

type Product = {
  _id?: string;
  id?: string;
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  priceDisclaimer?: string;
};

type GeneralTabProps = {
  data?: {
    _id?: string;
    id?: string;
    name?: string;
    ownerId?: string | { _id?: string; id?: string } | null;
    address?: string;
    openingHours?: string;
    description?: string;
    viewCount?: number;
    products?: Product[];
  } | null;
  productData?: Product[] | null;
  onRefresh?: () => Promise<void> | void;
};

export default function GeneralTab({
  data,
  productData,
  onRefresh,
}: GeneralTabProps) {
  const { user } = useContext(userContext);
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const userId = getId(user);
  const ownerId = getId(data?.ownerId);

  return (
    <View style={{ flex: 1 }}>
      <Card style={{ padding: 16 }}>
        <Card.Title title="Thong tin chung" />
        <Card.Content>
          <InfoRow
            icon="map-marker"
            text={data?.address || "Địa chỉ không có sẵn"}
          />
          <InfoRow
            icon="clock"
            text={data?.openingHours || "Giờ mở cửa không có sẵn"}
          />
          <InfoRow
            icon="information"
            text={data?.description || "Mô tả không có sẵn"}
          />
          <InfoRow icon="eye" text={`${data?.viewCount || "0"} lượt xem`} />
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
        {userId && userId !== ownerId ? (
          <Card.Actions style={{ justifyContent: "flex-start" }}>
            <Button
              icon="flag-outline"
              onPress={() => {
                router.push({
                  pathname: `/location/edit/[id]`,
                  params: {
                    id: data?._id,
                    type: "flag",
                  },
                });
              }}
            >
              Bao co trang thai
            </Button>
          </Card.Actions>
        ) : null}
        {user?.role === "VENDOR" && !data?.ownerId ? (
          <Card.Actions style={{ justifyContent: "flex-start" }}>
            <Button
              mode="outlined"
              onPress={() =>
                router.push({
                  pathname: "/claim/[locationId]",
                  params: {
                    locationId: String(data?._id),
                    name: data?.name || "",
                  },
                } as never)
              }
            >
              Nhận sở hữu địa điểm
            </Button>
          </Card.Actions>
        ) : null}
        {user?.role === "VENDOR" && data?.ownerId && user?._id !== data.ownerId ? (
          <Card.Actions style={{ justifyContent: "flex-start" }}>
            <Button
              mode="outlined"
              onPress={() =>
                router.push({
                  pathname: "/request-access/new/[locationId]",
                  params: { locationId: String(data?._id), name: data?.name || "" },
                } as never)
              }
            >
              Xin quyền quản lý
            </Button>
          </Card.Actions>
        ) : null}
      </Card>

      <ProductSection
        locationId={data?._id ?? data?.id}
        ownerId={data?.ownerId}
        products={productData || data?.products || []}
        onChanged={onRefresh}
      />

      <EditLocationModal
        setVisible={setVisible}
        visible={visible}
        data={data}
      />
    </View>
  );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        gap: 10,
      }}
    >
      <Icon source={icon} size={24} color="blue" />
      <Text style={{ flex: 1, flexShrink: 1 }}>{text}</Text>
    </View>
  );
}

function getId(value: unknown) {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object") {
    const item = value as { _id?: string; id?: string };
    return item._id ?? item.id ?? "";
  }
  return "";
}
