import { getWorkflowStatus } from "@/components/workflow/status";
import { requestAccessTabs } from "@/navigation/request-access-tabs";
import { listAccess, type AccessRequest, type AccessSide } from "@/service/requestAccessService";
import { ActivityRow, EmptyState, LoadingState, NavigationBar, NoticeSnackbar, Page, PageContent, Stack } from "@/ui/components";
import { colors, fontFamily } from "@/ui/tokens";
import { workflowListLayout } from "@/ui/components/workflow-list";
import { Stack as RouterStack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, View } from "react-native";
import { TabScreen, Tabs, TabsProvider } from "react-native-paper-tabs";

function AccessTabContent({ side }: { side: AccessSide }) {
  const router = useRouter();
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
    <View style={{ backgroundColor: colors.surfaceApp, flex: 1 }}>
      {loading && items.length === 0 ? <LoadingState /> : (
        <PageContent refreshControl={<RefreshControl onRefresh={load} refreshing={loading} tintColor={colors.accentPrimary} />} style={workflowListLayout}>
          {items.length === 0 ? <EmptyState icon="account-switch-outline" supportingText={side === "owner" ? "Yêu cầu gửi đến bạn sẽ xuất hiện tại đây." : "Yêu cầu bạn đã gửi sẽ xuất hiện tại đây."} title="Chưa có yêu cầu" /> : null}
          <Stack gap={0}>
            {items.map((item) => {
              const location = typeof item.locationId === "object" ? item.locationId : null;
              const relatedUser = side === "owner" ? (typeof item.requesterId === "object" ? item.requesterId : null) : (typeof item.currentOwnerId === "object" ? item.currentOwnerId : null);
              return <ActivityRow compact icon="account-switch-outline" key={item._id} onPress={() => router.push(`/request-access/${item._id}` as never)} status={getWorkflowStatus(item.effectiveState)} supportingText={relatedUser?.fullName || relatedUser?.email || location?.address} title={location?.name || "Địa điểm"} />;
            })}
          </Stack>
        </PageContent>
      )}
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </View>
  );
}

export default function AccessListScreen() {
  const router = useRouter();

  return (
    <Page>
      <RouterStack.Screen options={{ headerShown: false }} />
      <NavigationBar onBack={() => router.back()} title="Chuyển quyền" />
      <View style={{ flex: 1 }}>
        <TabsProvider defaultIndex={0}>
          <Tabs
            mode="fixed"
            style={{ backgroundColor: colors.surfaceApp }}
            tabHeaderStyle={{ borderBottomColor: colors.separator, borderBottomWidth: 1 }}
            tabLabelStyle={{ fontFamily: fontFamily.semibold, fontSize: 14 }}
            uppercase={false}
          >
            {requestAccessTabs.map((tab) => (
              <TabScreen key={tab.side} label={tab.label}>
                <AccessTabContent side={tab.side} />
              </TabScreen>
            ))}
          </Tabs>
        </TabsProvider>
      </View>
    </Page>
  );
}
