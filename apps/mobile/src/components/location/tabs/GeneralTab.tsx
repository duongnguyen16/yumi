import { userContext } from "@/contexts/userContext";
import { Button, GroupedList, ListRow, Stack } from "@/ui/components";
import { spacing } from "@/ui/tokens";
import { useRouter } from "expo-router";
import React, { useContext, useState } from "react";
import EditLocationModal from "../modals/EditLocationModal";
import ProductSection from "../ProductSection";

type Product = { _id?: string; id?: string; name?: string; description?: string | null; imageUrl?: string | null; price?: number | null; priceDisclaimer?: string };
type GeneralTabProps = { data?: { _id?: string; id?: string; name?: string; ownerId?: string | { _id?: string; id?: string } | null; address?: string; openingHours?: string; description?: string; viewCount?: number; products?: Product[] } | null; productData?: Product[] | null; onRefresh?: () => Promise<void> | void };

export default function GeneralTab({ data, productData, onRefresh }: GeneralTabProps) {
  const { user } = useContext(userContext);
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const userId = getId(user);
  const ownerId = getId(data?.ownerId);
  const locationId = String(data?._id ?? data?.id ?? "");

  return (
    <Stack style={{ padding: spacing[4] }}>
      <GroupedList>
        <ListRow icon="map-marker-outline" label="Địa chỉ" showChevron={false} supportingText={data?.address || "Chưa có địa chỉ"} />
        <ListRow icon="clock-outline" label="Giờ hoạt động" showChevron={false} supportingText={data?.openingHours || "Chưa có giờ hoạt động"} />
        <ListRow icon="information-outline" label="Mô tả" showChevron={false} supportingText={data?.description || "Chưa có mô tả"} />
        <ListRow icon="eye-outline" label="Lượt xem" showChevron={false} value={String(data?.viewCount || 0)} />
      </GroupedList>
      {userId === ownerId ? <Button icon="pencil-outline" label="Chỉnh sửa thông tin" onPress={() => setVisible(true)} width="full" /> : null}
      {userId && userId !== ownerId ? <Button icon="file-edit-outline" label="Đề xuất chỉnh sửa" onPress={() => router.push({ pathname: "/location/edit/[id]", params: { id: data?._id, type: "flag" } })} variant="secondary" width="full" /> : null}
      {user?.role === "VENDOR" && !ownerId ? <Button icon="store-check-outline" label="Nhận sở hữu địa điểm" onPress={() => router.push({ pathname: "/claim/[locationId]", params: { locationId, name: data?.name ?? "" } } as never)} variant="secondary" width="full" /> : null}
      {user?.role === "VENDOR" && ownerId && userId !== ownerId ? <Button icon="account-key-outline" label="Xin quyền quản lý" onPress={() => router.push({ pathname: "/request-access/new/[locationId]", params: { locationId, name: data?.name ?? "" } } as never)} variant="secondary" width="full" /> : null}
      <ProductSection locationId={data?._id ?? data?.id} onChanged={onRefresh} ownerId={data?.ownerId} products={productData || data?.products || []} />
      {data?._id ? <EditLocationModal data={{ ...data, _id: data._id }} setVisible={setVisible} visible={visible} /> : null}
    </Stack>
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
