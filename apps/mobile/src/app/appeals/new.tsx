import {
  getAppealPresentation,
  isAppealType,
} from "@/components/workflow/appeal-presentation";
import { submitAppeal } from "@/service/appealService";
import { uploadAppealImage } from "@/service/contributePlaceService";
import {
  BottomActionBar,
  Button,
  EmptyState,
  FormSection,
  NavigationBar,
  NoticeSnackbar,
  Page,
  PageContent,
  TextArea,
} from "@/ui/components";
import { getNoticeMessage } from "@/ui/feedback";
import { radius } from "@/ui/tokens";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  Stack as RouterStack,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useState } from "react";

type Proof = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function NewAppealScreen() {
  const params = useLocalSearchParams<{ type?: string; targetId?: string }>();
  const type = param(params.type);
  const targetId = param(params.targetId);
  const appealType = isAppealType(type) ? type : null;
  const presentation = getAppealPresentation(appealType);
  const router = useRouter();
  const [argument, setArgument] = useState("");
  const [proof, setProof] = useState<Proof | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const pick = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setMessage("Cần quyền camera để chụp bằng chứng.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) return;

    const file = result.assets[0];
    if (!file) return;

    const fallbackName = `appeal-${Date.now()}.jpg`;
    setProof({
      uri: file.uri,
      fileName: file.fileName || fallbackName,
      mimeType: file.mimeType || "image/jpeg",
      fileSize: file.fileSize || 0,
    });
  };

  const submit = async () => {
    const trimmedArgument = argument.trim();
    if (!appealType || !targetId) return;
    if (!proof || trimmedArgument.length < 10) return;

    setLoading(true);
    setMessage("");
    try {
      const url = await uploadAppealImage(proof);
      const capturedAt = new Date().toISOString();
      const evidence = { url, fileType: "IMAGE" as const, capturedAt };
      const payload = {
        type: appealType,
        targetId,
        argument: trimmedArgument,
        additionalEvidenceFiles: [evidence],
      };
      const response = await submitAppeal(payload);
      if (!response.success || !response.appeal) {
        setMessage(response.message || "Không thể gửi kháng cáo.");
        return;
      }

      router.replace(`/appeals/${response.appeal.id}` as never);
    } catch (error) {
      setMessage(getNoticeMessage(error, "Không thể tải bằng chứng."));
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = Boolean(proof) && argument.trim().length >= 10;

  if (!appealType || !targetId || !presentation) {
    return (
      <Page>
        <RouterStack.Screen options={{ headerShown: false }} />
        <NavigationBar onBack={() => router.back()} title="Gửi kháng cáo" />
        <PageContent>
          <EmptyState
            icon="alert-circle-outline"
            supportingText="Liên kết kháng cáo thiếu thông tin hoặc không còn được hỗ trợ."
            title="Không thể tạo kháng cáo"
          />
        </PageContent>
      </Page>
    );
  }

  return (
    <Page>
      <RouterStack.Screen options={{ headerShown: false }} />
      <NavigationBar onBack={() => router.back()} title="Gửi kháng cáo" />
      <PageContent>
        <FormSection
          supportingText={presentation.description}
          title={presentation.label}
        >
          <TextArea
            label="Nội dung kháng cáo"
            onChangeText={setArgument}
            value={argument}
          />
          {proof ? (
            <Image
              alt="Bằng chứng kháng cáo"
              source={{ uri: proof.uri }}
              style={{ borderRadius: radius.large, height: 240, width: "100%" }}
            />
          ) : null}
          <Button
            icon="camera-outline"
            label={proof ? "Chụp lại" : "Chụp bằng chứng"}
            onPress={pick}
            variant="secondary"
            width="full"
          />
        </FormSection>
      </PageContent>
      <BottomActionBar>
        <Button
          disabled={loading || !canSubmit}
          label="Gửi kháng cáo"
          loading={loading}
          onPress={submit}
          width="full"
        />
      </BottomActionBar>
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </Page>
  );
}
