import { AppText, Badge, BottomActionBar, Button, Card, LoadingState, NavigationBar, NoticeSnackbar, Page, PageContent, Stack } from "@/ui/components";
import { colors, spacing } from "@/ui/tokens";
import { Stack as RouterStack } from "expo-router";
import type { ReactNode } from "react";
import type { WorkflowTone } from "./status";

export default function WorkflowDetailScreen({ navigationTitle, title, supportingText, status, children, loading = false, message, action, onBack, onMessageDismiss }: { navigationTitle: string; title: string; supportingText?: string; status?: { label: string; tone: WorkflowTone }; children?: ReactNode; loading?: boolean; message?: string; action?: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean }; onBack: () => void; onMessageDismiss?: () => void }) {
  if (loading) {
    return <Page><RouterStack.Screen options={{ headerShown: false }} /><LoadingState /></Page>;
  }

  return (
    <Page>
      <RouterStack.Screen options={{ headerShown: false }} />
      <NavigationBar onBack={onBack} title={navigationTitle} />
      <PageContent>
        <Stack gap={spacing[2]}>
          <AppText variant="title1">{title}</AppText>
          {supportingText ? <AppText style={{ color: colors.textSecondary }} variant="subhead">{supportingText}</AppText> : null}
        </Stack>
        {status ? <Card><Stack gap={spacing[2]}><AppText variant="headline">Trạng thái hiện tại</AppText><Badge label={status.label} tone={status.tone} /></Stack></Card> : null}
        {children}
      </PageContent>
      {action ? <BottomActionBar><Button disabled={action.disabled} label={action.label} loading={action.loading} onPress={action.onPress} width="full" /></BottomActionBar> : null}
      <NoticeSnackbar message={message || ""} onDismiss={onMessageDismiss || (() => undefined)} />
    </Page>
  );
}
