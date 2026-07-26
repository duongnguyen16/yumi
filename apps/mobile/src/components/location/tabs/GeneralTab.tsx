import { userContext } from "@/contexts/userContext";
import { getLocationPublicDetails } from "@/common/map-location";
import { canManageLocationImages } from "@/components/location/location-image-management";
import { AppText, Button, Divider, Inline, Stack } from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useContext, useState } from "react";
import { View } from "react-native";
import { Icon, Surface } from "react-native-paper";
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
export type LocationSummaryData = {
  _id?: string;
  id?: string;
  name?: string;
  ownerId?: string | { _id?: string; id?: string } | null;
  address?: string;
  openingHours?: string;
  phone?: string;
  description?: string;
  categoryId?: { _id?: string; name?: string } | null;
  subCategoryIds?: { _id: string; name?: string }[];
  products?: Product[];
};
type GeneralTabProps = {
  data?: LocationSummaryData | null;
  padding?: number;
  productData?: Product[] | null;
  onRefresh?: () => Promise<void> | void;
  showActions?: boolean;
  showProducts?: boolean;
  onManageImages?: () => void;
};

export default function GeneralTab({
  data,
  padding = spacing[4],
  productData,
  onRefresh,
  showActions = true,
  showProducts = true,
  onManageImages,
}: GeneralTabProps) {
  const [visible, setVisible] = useState(false);
  const details = getLocationPublicDetails(data);
  const category = [details.category, ...details.tags]
    .filter(Boolean)
    .join(" · ");
  const rows: {
    icon: DetailIcon;
    label: string;
    value: string;
    onPress?: () => void;
  }[] = [
    ...(details.openingHours
      ? [
          {
            icon: "clock-outline" as const,
            label: "Giờ hoạt động",
            value: details.openingHours,
          },
        ]
      : []),
    ...(details.phone
      ? [
          {
            icon: "phone-outline" as const,
            label: "Điện thoại",
            value: details.phone,
            onPress: () => void Linking.openURL(`tel:${details.phone}`),
          },
        ]
      : []),
    ...(details.address
      ? [
          {
            icon: "map-marker-outline" as const,
            label: "Địa chỉ",
            value: details.address,
          },
        ]
      : []),
    ...(category
      ? [{ icon: "shape-outline" as const, label: "Danh mục", value: category }]
      : []),
    ...(details.description
      ? [
          {
            icon: "information-outline" as const,
            label: "Mô tả",
            value: details.description,
          },
        ]
      : []),
  ];

  return (
    <Stack style={{ padding }}>
      <AppText variant="title2">Chi tiết</AppText>
      <View
        style={{
          backgroundColor: colors.surfaceBase,
          borderRadius: radius.large,
          overflow: "hidden",
        }}
      >
        {rows.map((row, index) => (
          <React.Fragment key={row.label}>
            {index ? <Divider /> : null}
            <DetailRow {...row} />
          </React.Fragment>
        ))}
      </View>
      {showActions ? (
        <LocationManagementActions
          data={data}
          onEdit={() => setVisible(true)}
          onManageImages={onManageImages}
        />
      ) : null}
      {showProducts ? (
        <ProductSection
          locationId={data?._id ?? data?.id}
          onChanged={onRefresh}
          ownerId={data?.ownerId}
          products={productData || data?.products || []}
        />
      ) : null}
      {data?._id ? (
        <EditLocationModal
          data={{ ...data, _id: data._id }}
          setVisible={setVisible}
          visible={visible}
        />
      ) : null}
    </Stack>
  );
}

type DetailIcon =
  | "clock-outline"
  | "information-outline"
  | "map-marker-outline"
  | "phone-outline"
  | "shape-outline";

function DetailRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: DetailIcon;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <Inline
      gap={spacing[3]}
      style={{ alignItems: "flex-start", padding: spacing[4] }}
    >
      <Surface
        elevation={0}
        style={{
          alignItems: "center",
          backgroundColor: colors.surfaceControl,
          borderRadius: radius.pill,
          height: 40,
          justifyContent: "center",
          width: 40,
        }}
      >
        <Icon color={colors.accentPrimary} size={20} source={icon} />
      </Surface>
      <Stack gap={spacing[1]} style={{ flex: 1 }}>
        <AppText variant="headline">{label}</AppText>
        <AppText
          numberOfLines={label === "Mô tả" ? 4 : undefined}
          onPress={onPress}
          style={{
            color: onPress ? colors.accentPrimary : colors.textSecondary,
          }}
          variant="subhead"
        >
          {value}
        </AppText>
      </Stack>
    </Inline>
  );
}

export function LocationManagementActions({
  data,
  onEdit,
  onManageImages,
}: {
  data?: LocationSummaryData | null;
  onEdit?: () => void;
  onManageImages?: () => void;
}) {
  const { user } = useContext(userContext);
  const router = useRouter();
  const userId = getId(user);
  const userRole = typeof user?.role === "string" ? user.role : undefined;
  const ownerId = getId(data?.ownerId);
  const locationId = String(data?._id ?? data?.id ?? "");

  return (
    <>
      {canManageLocationImages({ role: userRole, userId, ownerId }) && onManageImages ? (
        <Button
          icon="image-plus"
          label="Thêm ảnh"
          onPress={onManageImages}
          variant="secondary"
        />
      ) : null}
      {userId === ownerId ? (
        <Button
          icon="pencil-outline"
          label="Chỉnh sửa thông tin"
          onPress={() => router.push(`/location/edit/${locationId}`)}
          variant="secondary"
        />
      ) : null}
      {userId && userId !== ownerId ? (
        <Button
          icon="file-edit-outline"
          label="Đề xuất chỉnh sửa"
          onPress={() =>
            router.push({
              pathname: "/location/edit/[id]",
              params: { id: data?._id, type: "flag" },
            })
          }
          variant="secondary"
        />
      ) : null}
      {user?.role === "VENDOR" && !ownerId ? (
        <Button
          icon="store-check-outline"
          label="Nhận sở hữu địa điểm"
          onPress={() =>
            router.push({
              pathname: "/claim/[locationId]",
              params: { locationId, name: data?.name ?? "" },
            } as never)
          }
          variant="secondary"
        />
      ) : null}
      {user?.role === "VENDOR" && ownerId && userId !== ownerId ? (
        <Button
          icon="account-key-outline"
          label="Xin quyền quản lý"
          onPress={() =>
            router.push({
              pathname: "/request-access/new/[locationId]",
              params: { locationId, name: data?.name ?? "" },
            } as never)
          }
          variant="secondary"
        />
      ) : null}
    </>
  );
}

function getId(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const item = value as { _id?: string; id?: string };
    return item._id ?? item.id ?? "";
  }
  return "";
}
