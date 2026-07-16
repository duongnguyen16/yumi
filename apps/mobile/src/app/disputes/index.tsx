import { getWorkflowStatus } from "@/components/workflow/status";
import { listDisputes, type DisputeItem } from "@/service/disputeService";
import { ActivityRow, EmptyState, LoadingState, NavigationBar, NoticeSnackbar, Page, PageContent, Stack } from "@/ui/components";
import { colors } from "@/ui/tokens";
import { Stack as RouterStack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";

export default function DisputesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    const response = await listDisputes();
    if (response.success) {
      setItems(response.items);
      setMessage("");
    } else setMessage(response.message || "Không thể lấy tranh chấp.");
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const blockingError = Boolean(message && items.length === 0);

  return (
    <Page>
      <RouterStack.Screen options={{ headerShown: false }} />
      <NavigationBar onBack={() => router.back()} title="Tranh chấp" />
      {loading ? <LoadingState /> : (
        <PageContent refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} tintColor={colors.accentPrimary} />}>
          {blockingError ? <EmptyState actionLabel="Thử lại" icon="alert-circle-outline" onAction={() => load()} supportingText={message} title="Không thể tải tranh chấp" /> : null}
          {!blockingError && items.length === 0 ? <EmptyState icon="shield-account-outline" supportingText="Hồ sơ tranh chấp mà bạn tham gia sẽ xuất hiện tại đây." title="Chưa có tranh chấp" /> : null}
          {!blockingError ? <Stack>
            {items.map((item) => {
              const location = typeof item.locationId === "object" ? item.locationId : null;
              return <ActivityRow icon="shield-account-outline" key={item._id} onPress={() => router.push(`/disputes/${item._id}` as never)} status={getWorkflowStatus(item.status)} supportingText={location?.address} title={location?.name || "Tranh chấp sở hữu"} />;
            })}
          </Stack> : null}
        </PageContent>
      )}
      <NoticeSnackbar message={blockingError ? "" : message} onDismiss={() => setMessage("")} />
    </Page>
  );
}
