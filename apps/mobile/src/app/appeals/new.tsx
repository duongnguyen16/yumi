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
  MediaPicker,
  NavigationBar,
  NoticeSnackbar,
  Page,
  PageContent,
  TextArea,
} from "@/ui/components";
import { getNoticeMessage } from "@/ui/feedback";
import { returnAfterSuccess } from "@/navigation/return-after-success";
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
  capturedAt: string;
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
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const pick = async () => {
    if (proofs.length >= 5) return;

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
    const proof = {
      uri: file.uri,
      fileName: file.fileName || fallbackName,
      mimeType: file.mimeType || "image/jpeg",
      fileSize: file.fileSize || 0,
      capturedAt: new Date().toISOString(),
    };
    setProofs((current) => [...current, proof]);
  };

  const submit = async () => {
    const trimmedArgument = argument.trim();
    if (!appealType || !targetId) return;
    if (proofs.length === 0 || trimmedArgument.length < 10) return;

    setLoading(true);
    setMessage("");
    try {
      const additionalEvidenceFiles = await Promise.all(
        proofs.map(async (proof) => ({
          url: await uploadAppealImage(proof),
          fileType: "IMAGE" as const,
          capturedAt: proof.capturedAt,
        })),
      );
      const payload = {
        type: appealType,
        targetId,
        argument: trimmedArgument,
        additionalEvidenceFiles,
      };
      const response = await submitAppeal(payload);
      if (!response.success || !response.appeal) {
        setMessage(response.message || "Không thể gửi kháng cáo.");
        return;
      }

      returnAfterSuccess(router);
    } catch (error) {
      setMessage(getNoticeMessage(error, "Không thể tải bằng chứng."));
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = proofs.length > 0 && argument.trim().length >= 10;
  const proofItems = proofs.map((proof) => ({
    id: proof.uri,
    name: proof.fileName,
    uri: proof.uri,
  }));

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
            maxLength={500}
            onChangeText={setArgument}
            value={argument}
          />
          <MediaPicker
            addLabel="Chụp thêm bằng chứng"
            items={proofItems}
            maxCount={5}
            onAdd={pick}
            onRemove={(uri) =>
              setProofs((current) =>
                current.filter((proof) => proof.uri !== uri),
              )
            }
            supportingText="Chụp từ 1 đến 5 ảnh bổ sung cho nội dung kháng cáo."
            title="Bằng chứng kháng cáo"
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
