import React from "react";
import { View } from "react-native";
import { Card, Icon, Text } from "react-native-paper";
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
    location?: {
      _id?: string;
      id?: string;
      ownerId?: string | { _id?: string; id?: string } | null;
      address?: string;
      openingHours?: string;
      description?: string;
      viewCount?: number;
      products?: Product[];
    };
  } | null;
  onProductsChanged?: () => Promise<void> | void;
};

export default function GeneralTab({
  data,
  onProductsChanged,
}: GeneralTabProps) {
  const location = data?.location;

  return (
    <View style={{ flex: 1 }}>
      <Card style={{ padding: 16 }}>
        <Card.Title title="Thong tin chung" />
        <Card.Content>
          <InfoRow
            icon="map-marker"
            text={location?.address || "Dia chi khong co san"}
          />
          <InfoRow
            icon="clock"
            text={location?.openingHours || "Gio mo cua khong co san"}
          />
          <InfoRow
            icon="information"
            text={location?.description || "Mo ta khong co san"}
          />
          <InfoRow icon="eye" text={`${location?.viewCount || "0"} luot xem`} />
        </Card.Content>
      </Card>

      <ProductSection
        locationId={location?._id ?? location?.id}
        ownerId={location?.ownerId}
        products={location?.products ?? []}
        onChanged={onProductsChanged}
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
