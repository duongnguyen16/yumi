import { createAccess } from "@/service/requestAccessService";
import {
  AppText,
  BottomActionBar,
  Button,
  FormSection,
  NavigationBar,
  NoticeSnackbar,
  Page,
  PageContent,
  TextArea,
} from "@/ui/components";
import { colors } from "@/ui/tokens";
import { returnAfterSuccess } from "@/navigation/return-after-success";
import {
  Stack as RouterStack,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useState } from "react";

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function NewAccessScreen() {
  const params = useLocalSearchParams<{ locationId: string; name?: string }>();
  const locationId = param(params.locationId);
  const name = param(params.name);
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!locationId) return;
    setLoading(true);
    setMessage("");
    const response = await createAccess(locationId, reason.trim() || undefined);
    setLoading(false);
    if (!response.success) {
      setMessage(response.message || "Không thể gửi yêu cầu.");
      return;
    }

    returnAfterSuccess(router);
  };

  const locationName = name || "Địa điểm này";
  const supportingText = `${locationName} đang có chủ. Chủ hiện tại có 3 ngày để đồng ý hoặc từ chối.`;
  return (
    <Page>
      <RouterStack.Screen options={{ headerShown: false }} />
      <NavigationBar onBack={() => router.back()} title="Xin chuyển quyền" />
      <PageContent>
        <FormSection
          supportingText={supportingText}
          title="Yêu cầu quyền quản lý"
        >
          <TextArea
            label="Lý do yêu cầu"
            onChangeText={setReason}
            placeholder="Mô tả mối liên hệ của bạn với địa điểm"
            value={reason}
          />
          <AppText style={{ color: colors.textSecondary }} variant="caption">
            Nếu chủ không phản hồi sau 3 ngày, bạn cần chụp bằng chứng tại chỗ
            để tiếp tục.
          </AppText>
        </FormSection>
      </PageContent>
      <BottomActionBar>
        <Button
          disabled={loading}
          label="Gửi yêu cầu"
          loading={loading}
          onPress={submit}
          width="full"
        />
      </BottomActionBar>
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </Page>
  );
}
