import {
  getAccountAppealType,
  getAppealPresentation,
  getNewAppealDestination,
  hasAppealForTarget,
} from "@/components/workflow/appeal-presentation";
import { getWorkflowStatus } from "@/components/workflow/status";
import { userContext } from "@/contexts/userContext";
import { getAppealsNavigationMode } from "@/navigation/authDestination";
import { listAppeals, type AppealItem } from "@/service/appealService";
import {
  ActivityRow,
  EmptyState,
  GroupedList,
  LoadingState,
  ListRow,
  NavigationBar,
  NoticeSnackbar,
  Page,
  PageContent,
  SectionHeader,
  Stack,
} from "@/ui/components";
import { workflowListLayout } from "@/ui/components/workflow-list";
import { Stack as RouterStack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useContext, useState } from "react";
import Dialog from "@/ui/components/dialog";
import { getConfirmationCopy } from "@/ui/confirmation";

export default function AppealsScreen() {
  const router = useRouter();
  const { user, handleLogout } = useContext(userContext);
  const [items, setItems] = useState<AppealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [logoutVisible, setLogoutVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listAppeals().then((response) => {
        if (!active) return;

        setItems(response.items);
        if (response.success) {
          setMessage("");
        } else {
          setMessage(response.message || "Không thể lấy kháng cáo.");
        }
        setLoading(false);
      });

      return () => {
        active = false;
      };
    }, []),
  );

  const primaryUserId = user?._id ?? user?.id;
  const rawUserId = primaryUserId ?? user?.userId;
  const currentUserId = rawUserId ? String(rawUserId) : "";
  const accountAppealType = getAccountAppealType(user?.status);
  const hasAccountAppeal =
    accountAppealType && currentUserId
      ? hasAppealForTarget(items, accountAppealType, currentUserId)
      : false;
  const hasAccountAppealTarget =
    Boolean(accountAppealType) && Boolean(currentUserId);
  const showAccountAppeal = hasAccountAppealTarget && !hasAccountAppeal;
  const accountPresentation = getAppealPresentation(accountAppealType);
  const navigationMode = getAppealsNavigationMode(
    user?.status,
    router.canGoBack(),
  );
  const logoutConfirmation = getConfirmationCopy("LOGOUT");

  const exitAppeals = () => {
    if (navigationMode === "BACK") {
      router.back();
      return;
    }

    router.replace("/home");
  };

  const logoutAction = {
    icon: "logout" as const,
    label: "Đăng xuất",
    onPress: () => setLogoutVisible(true),
  };
  const navigationAction =
    navigationMode === "LOGOUT" ? logoutAction : undefined;
  const backAction = navigationMode === "LOGOUT" ? undefined : exitAppeals;

  const openAccountAppeal = () => {
    if (!accountAppealType || !currentUserId) return;

    const destination = getNewAppealDestination(
      accountAppealType,
      currentUserId,
    );
    router.push(destination as never);
  };

  return (
    <Page>
      <RouterStack.Screen options={{ headerShown: false }} />
      <NavigationBar
        action={navigationAction}
        onBack={backAction}
        title="Kháng cáo"
      />
      {loading ? (
        <LoadingState />
      ) : (
        <PageContent style={workflowListLayout}>
          {showAccountAppeal && accountPresentation ? (
            <Stack>
              <SectionHeader title="Trạng thái tài khoản" />
              <GroupedList>
                <ListRow
                  icon="shield-alert-outline"
                  label={accountPresentation.label}
                  onPress={openAccountAppeal}
                  supportingText={accountPresentation.description}
                />
              </GroupedList>
            </Stack>
          ) : null}
          {items.length === 0 ? (
            <EmptyState
              icon="file-document-outline"
              supportingText="Kháng cáo mới sẽ xuất hiện tại đây sau khi được gửi."
              title="Chưa có kháng cáo"
            />
          ) : null}
          <Stack gap={0}>
            {items.map((item) => (
              <ActivityRow
                compact
                icon="file-document-outline"
                key={item._id}
                onPress={() => router.push(`/appeals/${item._id}` as never)}
                status={getWorkflowStatus(item.status)}
                supportingText={item.argument}
                title={getAppealPresentation(item.type)?.label || "Kháng cáo"}
              />
            ))}
          </Stack>
        </PageContent>
      )}
      <Dialog
        cancelLabel={logoutConfirmation.cancelLabel}
        confirmLabel={logoutConfirmation.confirmLabel}
        message={logoutConfirmation.message}
        option
        result={(confirmed) => {
          if (!confirmed) return;
          void handleLogout().then((result) => {
            if (!result.success)
              setMessage(result.message || "Không thể đăng xuất.");
          });
        }}
        setVisible={setLogoutVisible}
        title={logoutConfirmation.title}
        visible={logoutVisible}
      />
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </Page>
  );
}
