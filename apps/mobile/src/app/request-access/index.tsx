import { getWorkflowStatus } from "@/components/workflow/status";
import { listAccess, type AccessRequest, type AccessSide } from "@/service/requestAccessService";
import { ActivityRow, AppText, EmptyState, LoadingState, NavigationBar, Page, PageContent, SegmentedControl, Stack } from "@/ui/components";
import { colors } from "@/ui/tokens";
import { Stack as RouterStack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl } from "react-native";

export default function AccessListScreen() {
  const router = useRouter();
  const [side, setSide] = useState<AccessSide>("owner");
  const [items, setItems] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await listAccess(side);
    setItems(response.items);
    setMessage(response.success ? "" : response.message || "Không thể lấy dữ liệu.");
    setLoading(false);
  }, [side]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  return (
    <Page>
      <RouterStack.Screen options={{ headerShown: false }} />
      <NavigationBar onBack={() => router.back()} title="Chuyển quyền" />
      {loading && items.length === 0 ? <LoadingState /> : (
        <PageContent refreshControl={<RefreshControl onRefresh={load} refreshing={loading} tintColor={colors.accentPrimary} />}>
          <Stack>
            <AppText variant="title1">Yêu cầu quản lý</AppText>
            <AppText style={{ color: colors.textSecondary }} variant="subhead">Các yêu cầu chuyển quyền địa điểm đã gửi và đã nhận.</AppText>
          </Stack>
          <SegmentedControl onChange={(value) => setSide(value as AccessSide)} options={[{ value: "owner", label: "Tôi nhận" }, { value: "requester", label: "Tôi gửi" }]} value={side} />
          {items.length === 0 ? <EmptyState icon="account-switch-outline" supportingText={side === "owner" ? "Yêu cầu gửi đến bạn sẽ xuất hiện tại đây." : "Yêu cầu bạn đã gửi sẽ xuất hiện tại đây."} title="Chưa có yêu cầu" /> : null}
          <Stack>
            {items.map((item) => {
              const location = typeof item.locationId === "object" ? item.locationId : null;
              const relatedUser = side === "owner" ? (typeof item.requesterId === "object" ? item.requesterId : null) : (typeof item.currentOwnerId === "object" ? item.currentOwnerId : null);
              return <ActivityRow icon="account-switch-outline" key={item._id} onPress={() => router.push(`/request-access/${item._id}` as never)} status={getWorkflowStatus(item.effectiveState)} supportingText={relatedUser?.fullName || relatedUser?.email || location?.address} title={location?.name || "Địa điểm"} />;
            })}
          </Stack>
          {message ? <AppText style={{ color: colors.accentRed }} variant="subhead">{message}</AppText> : null}
        </PageContent>
      )}
    </Page>
  );
}
