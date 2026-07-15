import { getWorkflowStatus } from "@/components/workflow/status";
import { listDisputes, type DisputeItem } from "@/service/disputeService";
import { ActivityRow, AppText, EmptyState, LoadingState, NavigationBar, Page, PageContent, Stack } from "@/ui/components";
import { colors } from "@/ui/tokens";
import { Stack as RouterStack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";

export default function DisputesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useFocusEffect(useCallback(() => {
    let active = true;
    listDisputes().then((response) => {
      if (!active) return;
      setItems(response.items);
      setMessage(response.success ? "" : response.message || "Không thể lấy tranh chấp.");
      setLoading(false);
    });
    return () => { active = false; };
  }, []));

  return (
    <Page>
      <RouterStack.Screen options={{ headerShown: false }} />
      <NavigationBar onBack={() => router.back()} title="Tranh chấp" />
      {loading ? <LoadingState /> : (
        <PageContent>
          <Stack>
            <AppText variant="title1">Tranh chấp sở hữu</AppText>
            <AppText style={{ color: colors.textSecondary }} variant="subhead">Theo dõi bằng chứng, các bên liên quan và quyết định cuối cùng.</AppText>
          </Stack>
          {items.length === 0 ? <EmptyState icon="shield-account-outline" supportingText="Hồ sơ tranh chấp mà bạn tham gia sẽ xuất hiện tại đây." title="Chưa có tranh chấp" /> : null}
          <Stack>
            {items.map((item) => {
              const location = typeof item.locationId === "object" ? item.locationId : null;
              return <ActivityRow icon="shield-account-outline" key={item._id} onPress={() => router.push(`/disputes/${item._id}` as never)} status={getWorkflowStatus(item.status)} supportingText={location?.address} title={location?.name || "Tranh chấp sở hữu"} />;
            })}
          </Stack>
          {message ? <AppText style={{ color: colors.accentRed }} variant="subhead">{message}</AppText> : null}
        </PageContent>
      )}
    </Page>
  );
}
