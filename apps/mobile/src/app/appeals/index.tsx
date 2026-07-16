import { getWorkflowStatus } from "@/components/workflow/status";
import { listAppeals, type AppealItem } from "@/service/appealService";
import { ActivityRow, EmptyState, LoadingState, NavigationBar, NoticeSnackbar, Page, PageContent, Stack } from "@/ui/components";
import { workflowListLayout } from "@/ui/components/workflow-list";
import { Stack as RouterStack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";

export default function AppealsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useFocusEffect(useCallback(() => {
    let active = true;
    listAppeals().then((response) => {
      if (!active) return;
      setItems(response.items);
      setMessage(response.success ? "" : response.message || "Không thể lấy kháng cáo.");
      setLoading(false);
    });
    return () => { active = false; };
  }, []));

  return (
    <Page>
      <RouterStack.Screen options={{ headerShown: false }} />
      <NavigationBar onBack={() => router.back()} title="Kháng cáo" />
      {loading ? <LoadingState /> : (
        <PageContent style={workflowListLayout}>
          {items.length === 0 ? <EmptyState icon="file-document-outline" supportingText="Kháng cáo mới sẽ xuất hiện tại đây sau khi được gửi." title="Chưa có kháng cáo" /> : null}
          <Stack gap={0}>
            {items.map((item) => <ActivityRow compact icon="file-document-outline" key={item._id} onPress={() => router.push(`/appeals/${item._id}` as never)} status={getWorkflowStatus(item.status)} supportingText={item.argument} title={item.type} />)}
          </Stack>
        </PageContent>
      )}
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </Page>
  );
}
